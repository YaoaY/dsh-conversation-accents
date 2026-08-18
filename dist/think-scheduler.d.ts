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
export declare function createFrameBatchScheduler<T>({ batchSize, cancel, process, schedule, onBatch }: FrameBatchSchedulerOptions<T>): FrameBatchScheduler<T>;
