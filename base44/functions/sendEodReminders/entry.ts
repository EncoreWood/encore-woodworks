import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const SHOP_TIME_ZONE = "America/Denver";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Current shop-local wall clock (America/Denver) — DST-safe, never a fixed UTC offset.
function shopNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SHOP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: parts.weekday,
  };
}

const toArray = (result) => (Array.isArray(result) ? result : result?.items || []);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    const dryRun = body?.dry_run === true;

    const shop = shopNow();
    const isWeekday = WEEKDAYS.includes(shop.weekday);
    // Scheduler runs every 10 minutes, so "5:25 PM" means the 17:25–17:44 window.
    const inWindow = shop.hour === 17 && shop.minute >= 25 && shop.minute < 45;

    if (!force && (!isWeekday || !inWindow)) {
      return Response.json({
        skipped: true,
        reason: !isWeekday ? "weekend" : "outside the 5:25 PM shop-time window",
        shop_time: shop,
      });
    }

    const svc = base44.asServiceRole;
    const [entriesRes, reviewsRes, employeesRes, sentRes] = await Promise.all([
      svc.entities.TimeEntry.filter({ date: shop.date, entry_type: "work" }).catch(() => []),
      svc.entities.EndOfDayReview.filter({ date: shop.date }).catch(() => []),
      svc.entities.Employee.list().catch(() => []),
      svc.entities.Notification.filter({ kind: "end_of_day", date: shop.date }).catch(() => []),
    ]);

    const employees = toArray(employeesRes);
    const empById = new Map(employees.map((e) => [e.id, e]));
    const submitted = new Set(
      toArray(reviewsRes).map((r) => (r.submitted_by_email || "").toLowerCase()).filter(Boolean)
    );
    // Once-per-person-per-day guard: a reminder record keyed by employee + date.
    const alreadySent = new Set(
      toArray(sentRes).map((n) => (n.user_email || "").toLowerCase()).filter(Boolean)
    );

    const targets = new Map();
    toArray(entriesRes)
      .filter((e) => e.clock_in && !e.clock_out)
      .forEach((entry) => {
        const emp = empById.get(entry.employee_id);
        const email = (emp?.user_email || emp?.email || "").toLowerCase();
        if (!email) return;
        if (submitted.has(email) || alreadySent.has(email)) return;
        if (!targets.has(email)) {
          targets.set(email, { email, name: emp?.full_name || entry.employee_name || email });
        }
      });

    const recipients = [...targets.values()];

    if (dryRun) {
      return Response.json({ shop_time: shop, would_notify: recipients.map((r) => r.email), count: recipients.length });
    }

    const sends = recipients.map(async (person) => {
      await svc.entities.Notification.create({
        user_email: person.email,
        title: "End of day review is due",
        message: "Submit it and clock out.",
        kind: "end_of_day",
        page: "ShopProduction",
        action: "end_of_day",
        read: false,
        date: shop.date,
      });
      await svc.entities.ProductionChatMessage.create({
        message: `@${person.name} End of day review is due — submit it and clock out.`,
        user_name: "Encore Shop",
        user_email: "system",
        mentions: [{ name: person.name, email: person.email }],
        action: "end_of_day",
      });
      return person.email;
    });

    const settled = await Promise.allSettled(sends);
    const notified = settled.map((r, i) => ({ email: recipients[i].email, status: r.status === "fulfilled" ? "sent" : "failed" }));

    return Response.json({ shop_time: shop, forced: force, notified, count: notified.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}