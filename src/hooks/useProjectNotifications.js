import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Cache of team (non-client) author emails so we can tell client chat messages
// apart from internal/Encore-team messages. Built once per session.
const _teamEmailCache = { emails: null, fetching: null };

async function getTeamEmails() {
  if (_teamEmailCache.emails) return _teamEmailCache.emails;
  if (_teamEmailCache.fetching) return _teamEmailCache.fetching;
  _teamEmailCache.fetching = (async () => {
    const [users, employees] = await Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.Employee.list().catch(() => []),
    ]);
    const set = new Set();
    // Admins are always team.
    users.forEach(u => { if (u.role === "admin" && u.email) set.add(u.email.toLowerCase()); });
    // Employees (shop staff) are team even if they join as non-admin users.
    employees.forEach(e => { const em = e.user_email || e.email; if (em) set.add(em.toLowerCase()); });
    _teamEmailCache.emails = set;
    _teamEmailCache.fetching = null;
    return set;
  })();
  return _teamEmailCache.fetching;
}

/**
 * Fetches the client-activity records (requested meetings, chat messages,
 * client room notes) once for the whole board/detail view, grouped by project.
 *
 * Consumers pair this with the `countsFor(project, data)` helper — which applies
 * each project's per-channel `*_read_at` timestamp — to get unread counts.
 */
export function useProjectNotifications() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["project_notifications"],
    queryFn: async () => {
      const [meetings, rooms, messages, notes, teamEmails] = await Promise.all([
        base44.entities.PortalMeeting.list().catch(() => []),
        base44.entities.ChatRoom.list().catch(() => []),
        base44.entities.ChatMessage.list().catch(() => []),
        base44.entities.RoomNote.list().catch(() => []),
        getTeamEmails(),
      ]);

      const roomProject = {};
      rooms.forEach(r => { if (r.id && r.project_id) roomProject[r.id] = r.project_id; });

      const requestedByProject = {};
      meetings.forEach(m => {
        if (m.status === "requested" && m.project_id) {
          (requestedByProject[m.project_id] ||= []).push(m);
        }
      });

      const msgsByProject = {};
      messages.forEach(m => {
        if (!m.created_by) return; // skip messages we can't attribute
        if (teamEmails.has(m.created_by.toLowerCase())) return; // internal team message
        const pid = roomProject[m.room_id];
        if (pid) (msgsByProject[pid] ||= []).push(m);
      });

      const notesByProject = {};
      notes.forEach(n => { if (n.project_id) (notesByProject[n.project_id] ||= []).push(n); });

      return { requestedByProject, msgsByProject, notesByProject };
    },
    staleTime: 15000,
  });

  return { data: query.data || EMPTY, isLoading: query.isLoading, refresh: () => qc.invalidateQueries({ queryKey: ["project_notifications"] }) };
}

const EMPTY = { requestedByProject: {}, msgsByProject: {}, notesByProject: {} };

// Compare an activity list against a project's per-channel read timestamp.
const unreadAfter = (items, readAt) => {
  const t = readAt ? new Date(readAt).getTime() : 0;
  if (!Array.isArray(items)) return 0;
  return items.filter(i => new Date(i.created_date || 0).getTime() > t).length;
};

/**
 * Returns { meetings, messages, notes, total } unread counts for a single project,
 * applying that project's read-marker timestamps.
 */
export function countsFor(project, data) {
  if (!project || !data) return { meetings: 0, messages: 0, notes: 0, total: 0 };
  const meetings = unreadAfter(data.requestedByProject[project.id], project.meeting_read_at);
  const messages = unreadAfter(data.msgsByProject[project.id], project.chat_read_at);
  const notes = unreadAfter(data.notesByProject[project.id], project.note_read_at);
  return { meetings, messages, notes, total: meetings + messages + notes };
}

/** Mark a notification channel as read (clears its bubble) for a project. */
export function markChannelRead(project, channel) {
  if (!project?.id || !channel) return Promise.resolve();
  const field = `${channel}_read_at`;
  return base44.entities.Project.update(project.id, { [field]: new Date().toISOString() });
}