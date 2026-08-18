type TimerHandle = unknown;
type SetTimeoutFn = (callback: () => void, delay: number) => TimerHandle;
type ClearTimeoutFn = (handle: TimerHandle) => void;
export interface TimeoutOptions {
    timeoutMs?: number;
    setTimeoutFn?: SetTimeoutFn;
    clearTimeoutFn?: ClearTimeoutFn;
    AbortControllerImpl?: new () => AbortController;
}
export declare function withTimeout<T>(task: (signal: AbortSignal | undefined) => Promise<T> | T, { timeoutMs, setTimeoutFn, clearTimeoutFn, AbortControllerImpl }?: TimeoutOptions): Promise<T>;
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
export declare function createTrailingSaveQueue<T>({ write, clone, timeoutMs, onState, onAccepted, timer }: TrailingSaveQueueOptions<T>): TrailingSaveQueue<T>;
export {};
