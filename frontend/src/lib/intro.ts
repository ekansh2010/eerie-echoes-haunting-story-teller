/**
 * The cinematic intro plays once per browser session. A window flag alone was
 * lost on every reload, so the 10 s intro replayed on each refresh of /home.
 */
const KEY = "eerie_echoes_intro_shown";

export const hasSeenIntro = (): boolean => {
  if (typeof window === "undefined") return false;
  if (window.__eerie_echoes_intro_shown) return true;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const markIntroSeen = (): void => {
  if (typeof window === "undefined") return;
  window.__eerie_echoes_intro_shown = true;
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked (private mode) — the window flag still covers this tab */
  }
};
