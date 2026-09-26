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

// Resolves once the image has loaded; rejects on error or timeout.
export function loadImage(url, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("The image generator took too long to respond."));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("The image generator couldn't draw this pup."));
    };
    img.src = url;
  });
}

// Best effort: shrink the generated image into a data URL so the collection
// still shows it offline. Falls back to null if the provider blocks CORS.
export async function toThumbnail(url, size = 512) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}
