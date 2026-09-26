import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { generateImage, ImageError } from "../js/imagegen.js";

const FAST = { busy: [1, 1, 1, 1], server: [1, 1], timeout: [1], network: [1] };
const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

// Replays the given responses in order; a status of 0 simulates a network failure.
function fakeService(statuses) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    if (status === 0) throw new TypeError("Failed to fetch");
    const type = status === 200 ? "image/jpeg" : "application/json";
    return new Response(status === 200 ? new Uint8Array([0xff, 0xd8]) : "{}", { status, headers: { "content-type": type } });
  };
  return calls;
}

test("retries while the service is busy, then returns the image", async () => {
  const calls = fakeService([429, 429, 200]);
  const retries = [];
  const blob = await generateImage("https://x/img", { retryDelays: FAST, onRetry: (r) => retries.push(r.kind) });
  assert.equal(blob.type, "image/jpeg");
  assert.equal(calls.length, 3);
  assert.deepEqual(retries, ["busy", "busy"]);
});

test("gives up with a busy message after the busy retries run out", async () => {
  const calls = fakeService([429]);
  await assert.rejects(generateImage("https://x/img", { retryDelays: FAST }), (err) => err instanceof ImageError && err.kind === "busy");
  assert.equal(calls.length, 5);
});

test("server errors are retried and then reported", async () => {
  const calls = fakeService([500]);
  await assert.rejects(generateImage("https://x/img", { retryDelays: FAST }), /having trouble/);
  assert.equal(calls.length, 3);
});

test("a network failure is retried once", async () => {
  const calls = fakeService([0, 200]);
  await generateImage("https://x/img", { retryDelays: FAST });
  assert.equal(calls.length, 2);
});

test("a non-image success response counts as a server error", async () => {
  globalThis.fetch = async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } });
  await assert.rejects(generateImage("https://x/img", { retryDelays: FAST }), (err) => err.kind === "server");
});

test("canceling stops further attempts", async () => {
  const calls = fakeService([429]);
  const controller = new AbortController();
  const p = generateImage("https://x/img", { signal: controller.signal, retryDelays: { ...FAST, busy: [200, 200, 200, 200] } });
  setTimeout(() => controller.abort(), 50);
  await assert.rejects(p);
  assert.equal(calls.length, 1);
});
