import { lockVault } from "./index.js";

let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
let autoLockMinutes = 15;

/** Schedules vault auto-lock after inactivity. */
export function scheduleAutoLock(minutes: number, onLock?: () => void): void {
  autoLockMinutes = minutes;
  resetAutoLockTimer(onLock);
}

/** Resets the auto-lock timer (call on vault activity). */
export function resetAutoLockTimer(onLock?: () => void): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(
    () => {
      lockVault();
      onLock?.();
    },
    autoLockMinutes * 60 * 1000,
  );
}

/** Clears auto-lock timer (call on manual lock). */
export function clearAutoLockTimer(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

export function getAutoLockMinutes(): number {
  return autoLockMinutes;
}
