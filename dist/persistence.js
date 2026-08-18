const DEFAULT_TIMEOUT_MS = 5e3;
function timeoutError(timeoutMs) {
  const error = new Error(`operation timed out after ${timeoutMs}ms`);
  error.code = "TIMEOUT";
  return error;
}
function withTimeout(task, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  setTimeoutFn = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeoutFn = (handle) => globalThis.clearTimeout(handle),
  AbortControllerImpl = globalThis.AbortController
} = {}) {
  if (typeof task !== "function") throw new TypeError("task must be a function");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError("timeoutMs must be a positive integer");
  if (typeof setTimeoutFn !== "function" || typeof clearTimeoutFn !== "function") {
    throw new TypeError("timer hooks must be functions");
  }
  const controller = typeof AbortControllerImpl === "function" ? new AbortControllerImpl() : void 0;
  let timer;
  const work = Promise.resolve().then(() => task(controller?.signal));
  const deadline = new Promise((_, reject) => {
    timer = setTimeoutFn(() => {
      controller?.abort();
      reject(timeoutError(timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeoutFn(timer));
}
function createTrailingSaveQueue({
  write,
  clone = (value) => value,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onState = () => {
  },
  onAccepted = () => {
  },
  timer = {}
}) {
  if (typeof write !== "function") throw new TypeError("write must be a function");
  if (typeof clone !== "function") throw new TypeError("clone must be a function");
  let latest;
  let hasLatest = false;
  let localVersion = 0;
  let persistedVersion = 0;
  let phase = "idle";
  let error = null;
  let running = null;
  let scheduled = false;
  let disposed = false;
  const snapshot = () => ({
    phase,
    error,
    localVersion,
    persistedVersion,
    dirty: localVersion !== persistedVersion
  });
  const publish = () => onState(snapshot());
  const pump = () => {
    if (disposed || running !== null || !hasLatest || localVersion === persistedVersion) return running;
    running = (async () => {
      while (!disposed && localVersion !== persistedVersion) {
        const version = localVersion;
        const payload = clone(latest);
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
  const schedulePump = () => {
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
      latest = void 0;
      running?.catch(() => {
      });
    },
    getSnapshot: snapshot
  };
}
export {
  createTrailingSaveQueue,
  withTimeout
};
