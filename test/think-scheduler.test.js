import test from "node:test";
import assert from "node:assert/strict";

import { createFrameBatchScheduler } from "../dist/think-scheduler.js";

test("frame scheduler deduplicates roots and processes bounded batches", () => {
  const callbacks = [];
  const batches = [];
  const scheduler = createFrameBatchScheduler({
    batchSize: 4,
    schedule(callback) {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancel() {},
    process(root) {
      batches.at(-1).push(root);
    },
    onBatch() {
      batches.push([]);
    }
  });

  batches.push([]);
  scheduler.enqueue([1, 2, 3, 4, 4, 5, 6, 7, 8, 9]);
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  assert.deepEqual(batches[0], [1, 2, 3, 4]);
  assert.equal(scheduler.pendingSize, 5);
  callbacks.shift()();
  assert.deepEqual(batches[1], [5, 6, 7, 8]);
  callbacks.shift()();
  assert.deepEqual(batches[2], [9]);
  assert.equal(scheduler.pendingSize, 0);
});

test("frame scheduler keeps a thousand roots bounded to four per frame", () => {
  const callbacks = [];
  const frameSizes = [];
  let currentFrame = 0;
  const scheduler = createFrameBatchScheduler({
    batchSize: 4,
    schedule(callback) {
      callbacks.push(callback);
      return callbacks.length;
    },
    cancel() {},
    process() {
      currentFrame += 1;
    },
    onBatch() {
      frameSizes.push(currentFrame);
      currentFrame = 0;
    }
  });

  const roots = Array.from({ length: 1000 }, (_, index) => ({ index }));
  scheduler.enqueue([...roots, ...roots]);
  while (callbacks.length > 0) callbacks.shift()();
  assert.equal(frameSizes.length, 250);
  assert.equal(frameSizes.reduce((total, size) => total + size, 0), 1000);
  assert.ok(frameSizes.every((size) => size > 0 && size <= 4));
});

test("frame scheduler cancels queued work on disposal", () => {
  let scheduled;
  let cancelled;
  const scheduler = createFrameBatchScheduler({
    schedule(callback) {
      scheduled = callback;
      return "frame";
    },
    cancel(handle) {
      cancelled = handle;
    },
    process() {
      throw new Error("disposed scheduler processed work");
    }
  });

  scheduler.enqueue(["root"]);
  scheduler.dispose();
  assert.equal(cancelled, "frame");
  scheduled();
  assert.equal(scheduler.pendingSize, 0);
});
