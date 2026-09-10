type Level = "debug" | "info" | "warn" | "error";

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const configuredLevel = (): number => {
  const requested = process.env.LOG_LEVEL as Level | undefined;
  if (requested && requested in RANK) return RANK[requested];
  return process.env.NODE_ENV === "test" ? RANK.error : RANK.info;
};

const threshold = configuredLevel();

const write = (level: Level, args: unknown[]): void => {
  if (RANK[level] < threshold) return;
  const stamp = `${new Date().toISOString()} ${level.toUpperCase()}`;
  if (level === "error") console.error(stamp, ...args);
  else if (level === "warn") console.warn(stamp, ...args);
  else console.log(stamp, ...args);
};

export const logger = {
  debug: (...args: unknown[]) => write("debug", args),
  info: (...args: unknown[]) => write("info", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
