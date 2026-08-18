const DEFAULT_TIMEOUT_MS = 5000;

type TimerHandle = unknown;
type SetTimeoutFn = (callback: () => void, delay: number) => TimerHandle;
type ClearTimeoutFn = (handle: TimerHandle) => void;

export interface TimeoutOptions {
  timeoutMs?: number;
  setTimeoutFn?: SetTimeoutFn;
  clearTimeoutFn?: ClearTimeoutFn;
  AbortControllerImpl?: new () => AbortController;
}

interface TimeoutError extends Error {
  code: "TIMEOUT";
}

function timeoutError(timeoutMs: number): TimeoutError {
  const error = new Error(`operation timed out after ${timeoutMs}ms`) as TimeoutError;
  error.code = "TIMEOUT";
  return error;
}

export function withTimeout<T>(
  task: (signal: AbortSignal | undefined) => Promise<T> | T,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    setTimeoutFn = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeoutFn = (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
    AbortControllerImpl = globalThis.AbortController
  }: TimeoutOptions = {}
): Promise<T> {
  if (typeof task !== "function") throw new TypeError("task must be a function");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("timeoutMs must be a positive integer");
  if (typeof setTimeoutFn !== "function" || typeof clearTimeoutFn !== "function") {
    throw new TypeError("timer hooks must be functions");
  }

  const controller = typeof AbortControllerImpl === "function" ? new AbortControllerImpl() : undefined;
  let timer: TimerHandle;
  const work = Promise.resolve().then(() => task(controller?.signal));
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeoutFn(() => {
      controller?.abort();
      reject(timeoutError(timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeoutFn(timer));
}

export type SavePhase = "idle" | "saving" | "ready" | "error";

export interface SaveSnapshot<T> {
  phase: SavePhase;
  error: Error | null;
  localVersion: number;
  persistedVersion: number;
  dirty: boolean;
}

export interface TrailingSaveQueueOptions<T> {
  write(value: T, signal: AbortSignal | undefined): Promise<T>;
  clone?(value: T): T;
  timeoutMs?: number;
  onState?(snapshot: SaveSnapshot<T>): void;
  onAccepted?(value: T): void;
  timer?: Pick<TimeoutOptions, "setTimeoutFn" | "clearTimeoutFn" | "AbortControllerImpl">;
}

export interface TrailingSaveQueue<T> {
  enqueue(value: T): void;
  retry(): void;
  flush(): Promise<void>;
  dispose(): void;
  getSnapshot(): SaveSnapshot<T>;
}

export function createTrailingSaveQueue<T>({
  write,
  clone = (value: T) => value,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onState = () => {},
  onAccepted = () => {},
  timer = {}
}: TrailingSaveQueueOptions<T>): TrailingSaveQueue<T> {
  if (typeof write !== "function") throw new TypeError("write must be a function");
  if (typeof clone !== "function") throw new TypeError("clone must be a function");

  let latest: T | undefined;
  let hasLatest = false;
  let localVersion = 0;
  let persistedVersion = 0;
  let phase: SavePhase = "idle";
  let error: Error | null = null;
  let running: Promise<void> | null = null;
  let scheduled = false;
  let disposed = false;

  const snapshot = (): SaveSnapshot<T> => ({
    phase,
    error,
    localVersion,
    persistedVersion,
    dirty: localVersion !== persistedVersion
  });
  const publish = (): void => onState(snapshot());

  const pump = (): Promise<void> | null => {
    if (disposed || running !== null || !hasLatest || localVersion === persistedVersion) return running;

    running = (async () => {
      while (!disposed && localVersion !== persistedVersion) {
        const version = localVersion;
        const payload = clone(latest as T);
        try {
          const accepted = await withTimeout(
            (signal) => write(payload, signal),
            { timeoutMs, ...timer }
          );
          if (disposed) return;

          persistedVersion = Math.max(persistedVersion, version);
          if (version === localVersion) {
            phase = "ready";
            error = null;
            onAccepted(accepted);
          }
          publish();
        } catch (cause) {
          if (disposed) return;
          phase = "error";
          error = cause instanceof Error ? cause : new Error(String(cause));
          publish();
          return;
        }
      }
    })().finally(() => {
      running = null;
      if (!disposed && localVersion !== persistedVersion && phase !== "error") pump();
    });

    return running;
  };

  const schedulePump = (): void => {
    if (disposed || scheduled || running !== null) return;
    scheduled = true;
    Promise.resolve().then(() => {
      scheduled = false;
      pump();
    });
  };

  return {
    enqueue(value) {
      if (disposed) return;
      latest = clone(value);
      hasLatest = true;
      localVersion += 1;
      phase = "saving";
      error = null;
      publish();
      schedulePump();
    },
    retry() {
      if (disposed || localVersion === persistedVersion) return;
      phase = "saving";
      error = null;
      publish();
      schedulePump();
    },
    flush() {
      scheduled = false;
      return pump() ?? Promise.resolve();
    },
    dispose() {
      disposed = true;
      scheduled = false;
      hasLatest = false;
      latest = undefined;
      running?.catch(() => {});
    },
    getSnapshot: snapshot
  };
}
