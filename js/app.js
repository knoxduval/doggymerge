import { BREEDS, BREED_BY_ID, SIZE_LABELS } from "./breeds.js";
import { BREED_PHOTOS } from "./breed-photos.js";
import { nameOptions, describe, mergedSize } from "./naming.js";
import { buildPrompt, imageUrl, generateImage as fetchImage, newSeed, toThumbnail } from "./imagegen.js";
import { loadCollection, saveCollection } from "./storage.js";
import { MY_DOGS_GROUP, dogToBreed, isMyDogId, mixLook, myDogId } from "./mydogs.js";

const GROUP_COLORS = {
  Sporting: "#e8691b",
  Hound: "#a0643c",
  Working: "#4a6fd1",
  Terrier: "#c2413a",
  Toy: "#d45a9b",
  "Non-Sporting": "#2e9c83",
  Herding: "#7b5bc9",
};
const GROUPS = Object.keys(GROUP_COLORS);
GROUP_COLORS[MY_DOGS_GROUP] = "#ff8a3d";

const LOADING_LINES = [
  "Mixing the pups…",
  "Fluffing the fur…",
  "Teaching it to sit…",
  "Counting the wags…",
  "Picking the perfect ears…",
  "Giving belly rubs…",
  "Almost ready for walkies…",
];

const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  picks: [null, null], // breed ids
  current: null, // the merge on screen
  collection: loadCollection(),
  myDogs: [], // saved dogs as mergeable breeds, newest first
};

// Finds a breed or one of your saved dogs by id.
function findBreed(id) {
  return BREED_BY_ID[id] || state.myDogs.find((d) => d.id === id);
}

function refreshMyDogs() {
  state.myDogs = state.collection.map((dog) => dogToBreed(dog, findBreed));
}
refreshMyDogs();

// ---------- Helpers ----------
function initials(name) {
  const words = name.replace(/[^\p{L}\s-]/gu, "").split(/[\s-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
}

// A breed's photo (a saved dog's own picture), falling back to colored initials.
function avatar(breed, large = false) {
  const src = breed.custom ? breed.thumbnail : BREED_PHOTOS[breed.id]?.[large ? "photo" : "thumb"];
  if (!src) return initialsAvatar(breed, large);
  const img = document.createElement("img");
  img.className = large ? "avatar lg photo" : "avatar photo";
  img.src = src;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => img.replaceWith(initialsAvatar(breed, large)), { once: true });
  return img;
}

function initialsAvatar(breed, large) {
  const span = document.createElement("span");
  span.className = large ? "avatar lg" : "avatar";
  span.style.background = GROUP_COLORS[breed.group] || "#888";
  span.textContent = initials(breed.name);
  span.setAttribute("aria-hidden", "true");
  return span;
}

// "Photo: author · license", linking to the photo's page on Wikimedia.
function photoCredit(breed) {
  const photo = !breed.custom && BREED_PHOTOS[breed.id];
  if (!photo) return "";
  return el("a", {
    className: "photo-credit",
    href: photo.source,
    target: "_blank",
    rel: "noopener",
    textContent: `Photo: ${photo.author} · ${photo.license}`,
  });
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of [].concat(children)) node.append(c);
  return node;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

// ---------- Pickers ----------
const pickers = [...document.querySelectorAll(".picker")];

function setupPicker(picker, slot) {
  const select = $(".group-filter", picker);
  renderGroupOptions(select);

  $(".search", picker).addEventListener("input", () => renderList(slot));
  select.addEventListener("change", () => renderList(slot));

  $(".breed-list", picker).addEventListener("click", (e) => {
    const btn = e.target.closest(".breed-option");
    if (!btn) return;
    state.picks[slot] = btn.dataset.id;
    renderPicker(slot);
    updateMergeButton();
  });
}

// "Your dogs" is offered only once you've saved one.
function renderGroupOptions(select) {
  const current = select.value;
  const groups = state.myDogs.length ? [MY_DOGS_GROUP, ...GROUPS] : GROUPS;
  select.replaceChildren(
    el("option", { value: "", textContent: "All groups" }),
    ...groups.map((g) => el("option", { value: g, textContent: g }))
  );
  select.value = groups.includes(current) ? current : "";
}

function optionMeta(b) {
  return b.custom ? `${MY_DOGS_GROUP} · ${b.parentNames.join(" + ")}` : `${b.group} · ${SIZE_LABELS[b.size]}`;
}

function renderList(slot) {
  const picker = pickers[slot];
  const query = $(".search", picker).value.trim().toLowerCase();
  const group = $(".group-filter", picker).value;
  const list = $(".breed-list", picker);
  const matches = [...state.myDogs, ...BREEDS].filter(
    (b) => (!group || b.group === group) && (!query || b.name.toLowerCase().includes(query))
  );

  list.replaceChildren(
    ...matches.map((b) => {
      const btn = el("button", { type: "button", className: "breed-option" }, [
        avatar(b),
        el("span", { className: "opt-text" }, [
          el("span", { className: "opt-name", textContent: b.name }),
          el("span", { className: "opt-meta", textContent: optionMeta(b) }),
        ]),
      ]);
      btn.dataset.id = b.id;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(state.picks[slot] === b.id));
      return el("li", {}, btn);
    })
  );
  if (!matches.length) list.append(el("li", { className: "no-results", textContent: "No breeds match that search." }));
}

function renderSelected(slot) {
  const box = $(".selected", pickers[slot]);
  const breed = findBreed(state.picks[slot]);
  if (!breed) {
    box.replaceChildren(el("span", { className: "placeholder", textContent: "Choose a breed below" }));
    return;
  }
  box.replaceChildren(
    avatar(breed, true),
    el("div", { className: "sel-text" }, [
      el("div", { className: "sel-name", textContent: breed.name }),
      el("div", { className: "sel-meta", textContent: `${optionMeta(breed)} · ${breed.traits.join(", ")}` }),
      photoCredit(breed),
    ])
  );
}

function renderPicker(slot) {
  renderSelected(slot);
  renderList(slot);
}

function updateMergeButton() {
  const [a, b] = state.picks;
  const btn = $("#merge-btn");
  btn.disabled = !(a && b);
  btn.textContent = a && b && a === b ? "Merge! (same breed)" : "Merge!";
}

function scrollPickIntoView(slot) {
  const selected = $('.breed-option[aria-selected="true"]', pickers[slot]);
  const list = $(".breed-list", pickers[slot]);
  if (selected) list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
}

// ---------- Merge ----------
let loadingTimer;
let activeRequest = null; // AbortController for the image being generated
let objectUrl = null; // blob URL of the image on screen

function merge() {
  const [a, b] = state.picks.map(findBreed);
  if (!a || !b) return;
  const names = nameOptions(a, b);
  state.current = {
    parents: [a.id, b.id],
    names,
    nameIndex: 0,
    name: names[0],
    description: describe(a, b),
    size: mergedSize(a, b),
    traits: [...new Set([...a.traits, ...b.traits])].slice(0, 5),
    look: a.id === b.id ? a.look : mixLook(a, b),
    prompt: buildPrompt(a, b),
    seed: newSeed(),
    saved: false,
  };
  renderResult();
  const result = $("#result");
  result.hidden = false;
  requestAnimationFrame(() => result.scrollIntoView({ behavior: "smooth", block: "start" }));
  generateImage();
}

function renderResult() {
  const cur = state.current;
  const [a, b] = cur.parents.map(findBreed);
  $("#result-parents").textContent = `${a.name} + ${b.name}`;
  $("#result-name").value = cur.name;
  $("#result-desc").textContent = cur.description;
  $("#result-chips").replaceChildren(
    el("li", { textContent: `${SIZE_LABELS[cur.size]} size` }),
    ...cur.traits.map((t) => el("li", { textContent: t }))
  );
  updateSaveButton();
}

function updateSaveButton() {
  const btn = $("#save-btn");
  btn.disabled = state.current.saved;
  btn.textContent = state.current.saved ? "✓ In your collection" : "➕ Add to collection";
}

const RETRY_NOTES = {
  busy: "The image service is busy, so we're waiting our turn",
  server: "The image service hit a snag, so we're trying again",
  timeout: "That took too long, so we're trying again",
  network: "Couldn't connect, so we're trying again",
};

async function generateImage() {
  const cur = state.current;
  // Cancel any picture still being drawn: the free service only allows one at a time.
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;

  const url = imageUrl(cur.prompt, cur.seed);
  cur.imageUrl = url;
  cur.imageBlob = null;
  cur.imageReady = false;

  $("#result-img").hidden = true;
  $("#img-error").hidden = true;
  $("#loading").hidden = false;
  $("#loading-note").textContent = "";
  $("#save-btn").disabled = true;
  $("#reroll-btn").disabled = true;

  let i = 0;
  $("#loading-text").textContent = LOADING_LINES[0];
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_LINES.length;
    $("#loading-text").textContent = LOADING_LINES[i];
  }, 2200);

  try {
    const blob = await fetchImage(url, {
      signal: request.signal,
      onRetry: ({ kind, attempt }) => {
        $("#loading-note").textContent = `${RETRY_NOTES[kind]} (attempt ${attempt})…`;
      },
    });
    if (request !== activeRequest) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    const img = $("#result-img");
    img.src = objectUrl;
    img.alt = `AI-generated picture of a ${cur.name}`;
    img.hidden = false;
    cur.imageBlob = blob;
    cur.imageReady = true;
  } catch (err) {
    if (request !== activeRequest) return; // replaced by a newer merge
    $("#img-error-text").textContent = err.message;
    $("#img-error").hidden = false;
  } finally {
    if (request === activeRequest) {
      activeRequest = null;
      clearInterval(loadingTimer);
      $("#loading").hidden = true;
      $("#reroll-btn").disabled = false;
      updateSaveButton();
      if (!cur.imageReady) $("#save-btn").disabled = true;
    }
  }
}

async function saveCurrent() {
  const cur = state.current;
  if (!cur || cur.saved || !cur.imageReady) return;
  cur.saved = true;
  updateSaveButton();
  const [a, b] = cur.parents.map(findBreed);
  const dog = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: cur.name.trim() || cur.names[0],
    parents: cur.parents,
    parentNames: [a.name, b.name],
    description: cur.description,
    size: cur.size,
    traits: cur.traits,
    look: cur.look,
    prompt: cur.prompt,
    seed: cur.seed,
    imageUrl: cur.imageUrl,
    createdAt: new Date().toISOString(),
  };
  state.collection.unshift(dog);
  if (!saveCollection(state.collection)) {
    toast("Couldn't save. Your browser storage may be full or blocked.");
  } else {
    toast(`${dog.name} saved! It's now at the top of both lists. 🐶`);
  }
  renderCollection();

  // Embed a thumbnail so the picture survives even if the generator changes.
  const thumb = cur.imageBlob && (await toThumbnail(cur.imageBlob));
  if (thumb) {
    dog.thumbnail = thumb;
    saveCollection(state.collection);
    renderCollection(); // show the saved photo in the pickers too
  }
}

// ---------- Collection ----------
function renderCollection() {
  refreshMyDogs();
  // Drop picks of dogs that were removed.
  state.picks = state.picks.map((id) => (isMyDogId(id) && !findBreed(id) ? null : id));
  pickers.forEach((p, i) => {
    renderGroupOptions($(".group-filter", p));
    renderPicker(i);
  });
  updateMergeButton();

  const list = state.collection;
  $("#collection-count").textContent = list.length;
  $("#collection-empty").hidden = list.length > 0;
  $("#collection-grid").replaceChildren(
    ...list.map((dog) => {
      const card = el("button", { type: "button", className: "dog-card" }, [
        el("img", { src: dog.thumbnail || dog.imageUrl, alt: `Picture of ${dog.name}`, loading: "lazy" }),
        el("div", { className: "dog-card-body" }, [
          el("h3", { textContent: dog.name }),
          el("p", { textContent: dog.parentNames.join(" + ") }),
        ]),
      ]);
      card.addEventListener("click", () => openDog(dog.id));
      return el("li", {}, card);
    })
  );
}

let openDogId = null;
function openDog(id) {
  const dog = state.collection.find((d) => d.id === id);
  if (!dog) return;
  openDogId = id;
  $("#dialog-img").src = dog.thumbnail || dog.imageUrl;
  $("#dialog-img").alt = `Picture of ${dog.name}`;
  $("#dialog-name").textContent = dog.name;
  $("#dialog-parents").textContent = dog.parentNames.join(" + ");
  $("#dialog-desc").textContent = dog.description;
  $("#dialog-chips").replaceChildren(
    el("li", { textContent: `${SIZE_LABELS[dog.size]} size` }),
    ...dog.traits.map((t) => el("li", { textContent: t }))
  );
  $("#dialog-date").textContent = `Merged ${new Date(dog.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`;
  $("#dog-dialog").showModal();
}

function deleteOpenDog() {
  const dog = state.collection.find((d) => d.id === openDogId);
  if (!dog || !confirm(`Remove ${dog.name} from your collection?`)) return;
  state.collection = state.collection.filter((d) => d.id !== openDogId);
  saveCollection(state.collection);
  $("#dog-dialog").close();
  renderCollection();
  toast(`${dog.name} was removed.`);
}

// ---------- Views ----------
function showView(name) {
  for (const tab of document.querySelectorAll(".tab")) {
    const active = tab.dataset.view === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  for (const view of document.querySelectorAll(".view")) {
    view.classList.toggle("is-active", view.id === `view-${name}`);
  }
  $(".merge-bar").hidden = name !== "merge";
  window.scrollTo({ top: 0 });
}

// ---------- Wire up ----------
pickers.forEach((p, i) => {
  setupPicker(p, i);
  renderPicker(i);
});
updateMergeButton();
renderCollection();

$("#merge-btn").addEventListener("click", merge);

$("#random-btn").addEventListener("click", () => {
  const pool = [...state.myDogs, ...BREEDS];
  const a = pool[Math.floor(Math.random() * pool.length)];
  let b;
  do b = pool[Math.floor(Math.random() * pool.length)]; while (b.id === a.id);
  state.picks = [a.id, b.id];
  pickers.forEach((p, i) => {
    $(".search", p).value = "";
    $(".group-filter", p).value = "";
    renderPicker(i);
    scrollPickIntoView(i);
  });
  updateMergeButton();
  merge();
});

$("#shuffle-name").addEventListener("click", () => {
  const cur = state.current;
  cur.nameIndex = (cur.nameIndex + 1) % cur.names.length;
  cur.name = cur.names[cur.nameIndex];
  $("#result-name").value = cur.name;
});

$("#result-name").addEventListener("input", (e) => {
  state.current.name = e.target.value;
});

$("#save-btn").addEventListener("click", saveCurrent);
$("#reroll-btn").addEventListener("click", () => {
  state.current.seed = newSeed();
  state.current.saved = false;
  generateImage();
});
$("#retry-btn").addEventListener("click", () => {
  state.current.seed = newSeed();
  generateImage();
});

for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => showView(tab.dataset.view));
}
document.querySelector("[data-goto=merge]").addEventListener("click", () => showView("merge"));

$("#dialog-delete").addEventListener("click", deleteOpenDog);
$("#dog-dialog").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close(); // tap backdrop to close
});
