// Today's Focus opens the Production board without touching the meeting.
//
// A desktop browser gets a real new tab. An installed (Home Screen) iPad app has no
// tab switcher: the new tab is swallowed or bounces to Safari, which strands whoever
// tapped it. There the board opens in the app's own tab strip instead — the meeting
// keeps its place — and the board shows a way back.
export const PRODUCTION_PATH = "/ShopProduction";
export const MEETING_PATH = "/MorningMeeting";

const RETURN_KEY = "encore:returnToMeeting";
const RETURN_EVENT = "encore:production-from-meeting";

const session = () => {
  try { return window.sessionStorage; } catch { return null; }
};

export const markedForReturn = () => Boolean(session()?.getItem(RETURN_KEY) === "1");

const markForReturn = () => session()?.setItem(RETURN_KEY, "1");
const clearReturn = () => session()?.removeItem(RETURN_KEY);

const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches === true || window.navigator.standalone === true;

export function openProductionBoard(tabs) {
  // `noopener` would make window.open report null even when it worked, so it is left off.
  if (!isInstalled()) {
    const opened = window.open(PRODUCTION_PATH, "_blank");
    if (opened) return;
  }
  markForReturn();
  // An already-mounted Production tab has to hear about it, not just re-read on mount.
  window.dispatchEvent(new CustomEvent(RETURN_EVENT));
  if (tabs?.openTab) tabs.openTab(PRODUCTION_PATH);
  else window.location.assign(PRODUCTION_PATH);
}

export function returnToMorningMeeting(tabs) {
  clearReturn();
  window.dispatchEvent(new CustomEvent(RETURN_EVENT));
  if (tabs?.openTab) tabs.openTab(MEETING_PATH);
  else window.location.assign(MEETING_PATH);
}

export function onMeetingReturnChange(handler) {
  window.addEventListener(RETURN_EVENT, handler);
  return () => window.removeEventListener(RETURN_EVENT, handler);
}