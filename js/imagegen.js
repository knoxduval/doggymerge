// Image generation. Uses Pollinations (free, no API key) which returns an image
// directly from a URL. Swap `imageUrl` to use a different provider.

import { SIZE_LABELS } from "./breeds.js";
import { mergedSize } from "./naming.js";

const ENDPOINT = "https://image.pollinations.ai/prompt/";

export function buildPrompt(a, b) {
  const size = SIZE_LABELS[mergedSize(a, b)].toLowerCase();
  if (a.id === b.id) {
    return `Photorealistic portrait photo of a single ${a.name} dog with ${a.look}. ` +
      "Sitting on grass outdoors, soft natural light, shallow depth of field, highly detailed fur, adorable, looking at the camera.";
  }
  return `Photorealistic portrait photo of a single ${size} mixed-breed dog, a ${a.name} and ${b.name} cross. ` +
    `It blends the ${a.look} of a ${a.name} with the ${b.look} of a ${b.name}. ` +
    "Sitting on grass outdoors, soft natural light, shallow depth of field, highly detailed fur, adorable, looking at the camera. One dog only.";
}

export function newSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

export function imageUrl(prompt, seed, size = 768) {
  const params = new URLSearchParams({ width: size, height: size, seed, nologo: "true" });
  return `${ENDPOINT}${encodeURIComponent(prompt)}?${params}`;
}

// Why a generation failed, phrased for the person using the app.
export class ImageError extends Error {
  constructor(kind, status) {
    super(MESSAGES[kind]);
    this.kind = kind; // "busy" | "server" | "network" | "timeout"
    this.status = status;
  }
}

const MESSAGES = {
  busy: "The free image service is busy. It draws one picture at a time for each network. Wait a few seconds, then tap Try again.",
  server: "The image service is having trouble right now. Try again in a minute.",
  network: "Couldn't reach the image service. Check your internet connection, then tap Try again.",
  timeout: "The image service took too long to answer. Tap Try again.",
};

// How long to wait before each retry, by failure kind (ms). Length = number of retries.
const RETRY_DELAYS = {
  busy: [3000, 6000, 10000, 15000],
  server: [2000, 5000],
  timeout: [1000],
  network: [2000],
};

const ATTEMPT_TIMEOUT_MS = 90_000;

// Downloads a generated image, retrying when the service is busy or failing.
// Resolves with a Blob. `onRetry({ kind, attempt, delayMs })` is called before each retry.
export async function generateImage(url, { signal, onRetry, retryDelays = RETRY_DELAYS } = {}) {
  const retries = { busy: 0, server: 0, timeout: 0, network: 0 };
  let attempt = 1;
  for (;;) {
    try {
      return await fetchOnce(url, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      const kind = err instanceof ImageError ? err.kind : "network";
      const delayMs = retryDelays[kind][retries[kind]];
      if (delayMs === undefined) throw err instanceof ImageError ? err : new ImageError(kind);
      retries[kind]++;
      attempt++;
      onRetry?.({ kind, attempt, delayMs });
      await sleep(delayMs, signal);
    }
  }
}

async function fetchOnce(url, signal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ATTEMPT_TIMEOUT_MS);
  try {
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (timedOut) throw new ImageError("timeout");
      if (signal?.aborted) throw err;
      throw new ImageError("network");
    }
    if (res.status === 429) throw new ImageError("busy", 429);
    if (!res.ok) throw new ImageError("server", res.status);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) throw new ImageError("server", res.status);
    return blob;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

// Shrinks an image into a small JPEG data URL so saved dogs keep their picture offline.
export async function toThumbnail(blob, size = 512) {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}
