/**
 * One-time tip shown after a user changes an existing handle, so they know the limit exists.
 * Recorded in this browser only; it never blocks anything, it only informs.
 */
export const HANDLE_CHANGE_TIP_TEXT =
  "Hey, you can only change your username twice in 30 days.";

const KEY = "fosterfolio:handle-change-tip-seen";

export function shouldShowHandleChangeTip(): boolean {
  try {
    return window.localStorage.getItem(KEY) === null;
  } catch {
    return false;
  }
}

/** Record that the tip was shown so it never appears again in this browser. */
export function markHandleChangeTipSeen(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked — the tip may repeat, which is harmless.
  }
}
