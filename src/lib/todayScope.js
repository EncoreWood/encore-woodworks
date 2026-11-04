// The Morning Meeting's "Today's Focus" opens the production board in its own app tab,
// scoped to the projects that are in production today — the same set the meeting lists.
export const TODAY_FOCUS_PATH = "/ShopProduction?focus=today";

export const isTodayFocus = (search) =>
  new URLSearchParams(search || "").get("focus") === "today";

export const todayProductionProjects = (projects = []) =>
  projects.filter(p => !p.archived && p.status === "in_production");

export const scopeItemsToToday = (items = [], projects = []) => {
  const ids = new Set(todayProductionProjects(projects).map(p => p.id));
  return items.filter(i => ids.has(i.project_id));
};