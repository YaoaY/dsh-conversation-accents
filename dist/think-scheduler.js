function createFrameBatchScheduler({
  batchSize = 4,
  cancel,
  process,
  schedule,
  onBatch
}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new TypeError("batchSize must be a positive integer");
  if (typeof cancel !== "function" || typeof process !== "function" || typeof schedule !== "function") {
    throw new TypeError("scheduler hooks must be functions");
  }
  const pending = /* @__PURE__ */ new Set();
  let handle = null;
  let disposed = false;
  const request = () => {
    if (disposed || handle !== null || pending.size === 0) return;
    handle = schedule(flush);
  };
  function flush() {
    handle = null;
    if (disposed) return;
    let processed = 0;
    for (const item of pending) {
      pending.delete(item);
      process(item);
      processed += 1;
      if (processed >= batchSize) break;
    }
    onBatch?.();
    request();
  }
  return {
    enqueue(items) {
      if (disposed) return;
      for (const item of items) if (item !== null && item !== void 0) pending.add(item);
      request();
    },
    dispose() {
      disposed = true;
      pending.clear();
      if (handle !== null) {
        cancel(handle);
        handle = null;
      }
    },
    get pendingSize() {
      return pending.size;
    }
  };
}
export {
  createFrameBatchScheduler
};
