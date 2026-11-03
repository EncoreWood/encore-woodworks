import { format, differenceInMinutes } from "date-fns";
import { base44 } from "@/api/base44Client";
import { findMyEmployee } from "@/lib/findMyEmployee";

// Shop-local calendar date — the same "today" the EndOfDayReview and reminder use.
export function shopDate(now = new Date()) {
  return format(new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" })), "yyyy-MM-dd");
}

export function formatClockTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

const minutesSince = (hhmm, now) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  if (start > now) start.setDate(start.getDate() - 1); // overnight shift
  return Math.max(0, differenceInMinutes(now, start));
};

/** Is this employee clocked in right now, and how much have they logged today? */
export async function loadClockState(user, now = new Date()) {
  if (!user?.email) return null;
  const employees = await base44.entities.Employee.list();
  const employee = findMyEmployee(employees, user.email);
  if (!employee) return null;

  const entries = await base44.entities.TimeEntry.filter({
    employee_id: employee.id,
    date: shopDate(now),
  });
  const openEntry = entries.find((e) => e.clock_in && !e.clock_out);
  const completedMinutes = entries
    .filter((e) => e.clock_out && e.hours_worked)
    .reduce((sum, e) => sum + e.hours_worked * 60, 0);

  return {
    entryId: openEntry?.id || null,
    clockIn: openEntry?.clock_in || null,
    minutesToday: completedMinutes + (openEntry ? minutesSince(openEntry.clock_in, now) : 0),
  };
}

export async function clockOutEntry(entryId, clockIn, now = new Date()) {
  const minutes = minutesSince(clockIn, now);
  return base44.entities.TimeEntry.update(entryId, {
    clock_out: format(now, "HH:mm"),
    hours_worked: parseFloat((minutes / 60).toFixed(2)),
  });
}

/**
 * Saves the review first, then writes each reported entry into its own existing
 * entity and links it back to the review. Reports that fail do not lose the
 * review — the caller is told which ones did not save.
 */
export async function submitReview({ user, form, reports, now = new Date() }) {
  const date = shopDate(now);
  const name = user.full_name || user.email || "Unknown";
  const email = user.email || "";

  const review = await base44.entities.EndOfDayReview.create({
    submitted_by: name,
    submitted_by_email: email,
    submitted_at: now.toISOString(),
    date,
    day_rating: form.day_rating || null,
    reason: form.reason.trim(),
    area_clean: form.area_clean,
    area_notes: form.area_clean ? "" : form.area_notes.trim(),
    comments: form.comments.trim(),
  });

  const links = [];
  const failed = [];

  for (const entry of reports) {
    const text = entry.text.trim();
    if (!text) continue;
    try {
      if (entry.type === "struggle") {
        const rec = await base44.entities.Struggle.create({
          problem: text,
          reported_by: name,
          reported_by_email: email,
          date,
          status: "open",
          end_of_day_review_id: review.id,
        });
        links.push({ kind: "struggle", id: rec.id, text });
      } else if (entry.type === "compliment") {
        const rec = await base44.entities.Compliment.create({
          from: name,
          from_email: email,
          to: (entry.to || "").trim(),
          message: text,
          date,
          submitted_at: now.toISOString(),
          share_in_meeting: false,
          end_of_day_review_id: review.id,
        });
        links.push({ kind: "compliment", id: rec.id, text });
      } else if (entry.type === "mistake") {
        const rec = await base44.entities.MistakeReport.create({
          submitted_by: name,
          submitted_by_email: email,
          description: text,
          date,
          status: "Submitted",
          end_of_day_review_id: review.id,
        });
        links.push({ kind: "mistake", id: rec.id, text });
      }
    } catch (error) {
      console.error("End of day report failed:", entry.type, error);
      failed.push(entry.type);
    }
  }

  if (links.length) {
    await base44.entities.EndOfDayReview.update(review.id, { report_links: links });
  }

  return { review, links, failed };
}