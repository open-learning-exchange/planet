const DEFAULT_AI_REQUEST_TIMEOUT_MS = 120000;
const DEFAULT_RESOURCE_INDEX_TIMEOUT_MS = 600000;
const MAX_TIMER_DURATION_MS = 2147483647;

const timerDurationOr = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_TIMER_DURATION_MS) : fallback;
};

/** Resolve the configured AI request timeout to a safe Node timer duration. */
export const getAIRequestTimeoutMs = (): number =>
  timerDurationOr(process.env.AI_REQUEST_TIMEOUT_MS, DEFAULT_AI_REQUEST_TIMEOUT_MS);

/** Resolve the longer resource-index lifecycle timeout to a safe Node timer duration. */
export const getResourceIndexTimeoutMs = (): number =>
  timerDurationOr(process.env.RESOURCE_INDEX_TIMEOUT_MS, DEFAULT_RESOURCE_INDEX_TIMEOUT_MS);
