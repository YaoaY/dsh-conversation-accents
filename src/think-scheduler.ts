export interface FrameBatchScheduler<T> {
  enqueue(items: Iterable<T>): void;
  dispose(): void;
  readonly pendingSize: number;
}

export interface FrameBatchSchedulerOptions<T> {
  batchSize?: number;
  cancel(handle: unknown): void;
  process(item: T): void;
  schedule(callback: () => void): unknown;
  onBatch?(): void;
}

export function createFrameBatchScheduler<T>({
  batchSize = 4,
  cancel,
  process,
  schedule,
  onBatch
}: FrameBatchSchedulerOptions<T>): FrameBatchScheduler<T> {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new TypeError("batchSize must be a positive integer");
  if (typeof cancel !== "function" || typeof process !== "function" || typeof schedule !== "function") {
    throw new TypeError("scheduler hooks must be functions");
  }

  const pending = new Set<T>();
  let handle: unknown = null;
  let disposed = false;

  const request = (): void => {
    if (disposed || handle !== null || pending.size === 0) return;
    handle = schedule(flush);
  };

  function flush(): void {
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
      for (const item of items) if (item !== null && item !== undefined) pending.add(item);
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
