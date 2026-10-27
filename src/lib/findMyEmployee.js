/**
 * Finds the employee record linked to a signed-in user.
 * Matching is case-insensitive and trimmed so a card saved as "Victor@encorewood.com"
 * still links to the account "victor@encorewood.com".
 */
export function findMyEmployee(employees = [], userEmail) {
  const email = (userEmail || "").trim().toLowerCase();
  if (!email) return null;
  return (
    (employees || []).find(
      (e) =>
        (e?.user_email || "").trim().toLowerCase() === email ||
        (e?.email || "").trim().toLowerCase() === email
    ) || null
  );
}