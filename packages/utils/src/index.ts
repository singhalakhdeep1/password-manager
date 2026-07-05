type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIX = "[Password Manager]";

export const logger = {
  debug(message: string, ...args: unknown[]): void { log("debug", message, args); },
  info(message: string, ...args: unknown[]): void { log("info", message, args); },
  warn(message: string, ...args: unknown[]): void { log("warn", message, args); },
  error(message: string, ...args: unknown[]): void { log("error", message, args); },
};

function log(level: LogLevel, message: string, args: unknown[]): void {
  const formatted = `${LOG_PREFIX} ${message}`;
  switch (level) {
    case "debug": console.debug(formatted, ...args); break;
    case "info": console.info(formatted, ...args); break;
    case "warn": console.warn(formatted, ...args); break;
    case "error": console.error(formatted, ...args); break;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

export function maskString(str: string, visibleChars = 4): string {
  if (str.length <= visibleChars) return "••••";
  return "•".repeat(str.length - visibleChars) + str.slice(-visibleChars);
}

/** Copies text to clipboard and clears it after a timeout (Module 9). */
export async function copyWithAutoClear(text: string, clearAfterMs = 30_000): Promise<void> {
  await navigator.clipboard.writeText(text);
  setTimeout(() => {
    void navigator.clipboard.writeText("").catch(() => {});
  }, clearAfterMs);
}
