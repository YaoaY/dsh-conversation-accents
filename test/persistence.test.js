import test from "node:test";
import assert from "node:assert/strict";

import { createTrailingSaveQueue, withTimeout } from "../dist/persistence.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitFor(condition) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail("condition did not become true");
}

test("withTimeout aborts a hanging operation", async () => {
  let deadline;
  let cleared;
  let signal;
  const pending = withTimeout((nextSignal) => {
    signal = nextSignal;
    return new Promise(() => {});
  }, {
    timeoutMs: 25,
    setTimeoutFn(callback) {
      deadline = callback;
      return "deadline";
    },
    clearTimeoutFn(handle) {
      cleared = handle;
    }
  });

  await settle();
  deadline();
  await assert.rejects(pending, (error) => error.code === "TIMEOUT");
  assert.equal(signal.aborted, true);
  assert.equal(cleared, "deadline");
});

test("trailing save queue coalesces synchronous updates", async () => {
  const writes = [];
  const accepted = [];
  const queue = createTrailingSaveQueue({
    clone: structuredClone,
    async write(value) {
      writes.push(value);
      return value;
    },
    onAccepted: (value) => accepted.push(value)
  });

  queue.enqueue({ preset: "nord" });
  queue.enqueue({ preset: "dracula" });
  await queue.flush();

  assert.deepEqual(writes, [{ preset: "dracula" }]);
  assert.deepEqual(accepted, [{ preset: "dracula" }]);
  assert.deepEqual(queue.getSnapshot(), {
    phase: "ready",
    error: null,
    localVersion: 2,
    persistedVersion: 2,
    dirty: false
  });
});

test("modification during a save writes only the latest trailing value next", async () => {
  const calls = [];
  const accepted = [];
  const queue = createTrailingSaveQueue({
    clone: structuredClone,
    write(value) {
      const gate = deferred();
      calls.push({ value, gate });
      return gate.promise;
    },
    onAccepted: (value) => accepted.push(value)
  });

  queue.enqueue({ preset: "nord" });
  await settle();
  assert.equal(calls.length, 1);

  queue.enqueue({ preset: "dracula" });
  calls[0].gate.resolve({ preset: "normalized-nord" });
  await waitFor(() => calls.length === 2);

  assert.deepEqual(calls[1].value, { preset: "dracula" });
  assert.deepEqual(accepted, []);

  calls[1].gate.resolve({ preset: "dracula" });
  await queue.flush();
  assert.deepEqual(accepted, [{ preset: "dracula" }]);
  assert.equal(queue.getSnapshot().dirty, false);
});

test("failed saves remain dirty and can be retried", async () => {
  let attempts = 0;
  const states = [];
  const queue = createTrailingSaveQueue({
    async write(value) {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return value;
    },
    onState: (state) => states.push(state.phase)
  });

  queue.enqueue({ preset: "gruvbox" });
  await queue.flush();
  assert.equal(queue.getSnapshot().phase, "error");
  assert.equal(queue.getSnapshot().dirty, true);

  queue.retry();
  await queue.flush();
  assert.equal(attempts, 2);
  assert.equal(queue.getSnapshot().phase, "ready");
  assert.equal(queue.getSnapshot().dirty, false);
  assert.ok(states.includes("error"));
});

test("disposed queues ignore future writes", async () => {
  let writes = 0;
  const queue = createTrailingSaveQueue({
    async write(value) {
      writes += 1;
      return value;
    }
  });

  queue.dispose();
  queue.enqueue({ preset: "nord" });
  await settle();
  assert.equal(writes, 0);
});
