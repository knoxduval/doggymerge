// Finds a representative photo for every breed (the lead image of its Wikipedia
// article), downloads small copies into images/breeds/, and records each photo's
// author and license for attribution.
//
// Run with: node scripts/fetch-breed-photos.mjs
// Writes images/breeds/*.jpg, js/breed-photos.js and CREDITS.md.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { BREEDS } from "../js/breeds.js";

const UA = "DoggyMerge/0.1 (https://knoxduval.github.io/doggymerge/; photo lookup script)";

// Wikipedia article titles where the breed name alone is ambiguous or differs.
const TITLES = {
  "akita": "Akita (dog breed)",
  "boxer": "Boxer (dog)",
  "dalmatian": "Dalmatian dog",
  "puli": "Puli dog",
  "mastiff": "English Mastiff",
  "bulldog": "Bulldog",
  "poodle": "Poodle",
  "toy-poodle": "Poodle",
  "miniature-poodle": "Poodle",
  "pug": "Pug",
  "brittany": "Brittany dog",
  "papillon": "Papillon dog",
  "vizsla": "Vizsla",
  "keeshond": "Keeshond",
  "xoloitzcuintli": "Xoloitzcuintle",
  "shar-pei": "Shar Pei",
  "english-pointer": "Pointer (dog breed)",
  "rough-collie": "Rough Collie",
  "havanese": "Havanese dog",
  "maltese": "Maltese dog",
  "samoyed": "Samoyed dog",
  "basenji": "Basenji",
  "saluki": "Saluki",
  "sloughi": "Sloughi",
  "kuvasz": "Kuvasz",
  "briard": "Briard",
  "chihuahua": "Chihuahua (dog breed)",
  "pomeranian": "Pomeranian dog",
  "pekingese": "Pekingese",
  "schipperke": "Schipperke",
  "leonberger": "Leonberger",
  "newfoundland": "Newfoundland dog",
  "rottweiler": "Rottweiler",
  "beagle": "Beagle",
  "greyhound": "Greyhound",
  "whippet": "Whippet",
  "borzoi": "Borzoi",
  "affenpinscher": "Affenpinscher",
  "bloodhound": "Bloodhound",
  "dachshund": "Dachshund",
  "weimaraner": "Weimaraner",
  "shiba-inu": "Shiba Inu",
  "chow-chow": "Chow Chow",
  "american-foxhound": "American Foxhound",
  "cane-corso": "Cane Corso",
  "doberman-pinscher": "Dobermann",
  "yorkshire-terrier": "Yorkshire Terrier",
  "german-shepherd": "German Shepherd",
  "anatolian-shepherd": "Anatolian Shepherd",
  "cardigan-welsh-corgi": "Cardigan Welsh Corgi",
  "pembroke-welsh-corgi": "Pembroke Welsh Corgi",
  "tibetan-mastiff": "Tibetan Mastiff",
  "english-cocker-spaniel": "English Cocker Spaniel",
  "cocker-spaniel": "American Cocker Spaniel",
  "catahoula-leopard-dog": "Catahoula Leopard Dog",
  "miniature-american-shepherd": "Miniature American Shepherd",
  "petit-basset-griffon-vendeen": "Petit Basset Griffon Vendéen",
  "bouvier-des-flandres": "Bouvier des Flandres",
  "spinone-italiano": "Spinone Italiano",
  "treeing-walker-coonhound": "Treeing Walker Coonhound",
  "saint-bernard": "St. Bernard (dog breed)",
  "american-eskimo-dog": "American Eskimo Dog",
};

// Specific photos, used where the article's lead image isn't a good picture of the breed
// (a shared article showing several varieties, or no lead image at all).
const FILES = {
  "belgian-malinois": "Malinois Shepherd3.JPG",
  "belgian-tervuren": "Tervuren.jpg",
  "neapolitan-mastiff": "Neapolitan Mastiff (mastino napoletano).jpg",
  "akita": "Akita Inu (male).jpg",
};

const titleFor = (b) => TITLES[b.id] || b.name;
const SIZES = { thumb: 120, photo: 330 }; // standard Wikimedia thumbnail widths
const OUT_DIR = new URL("../images/breeds/", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = "json") {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
    if (attempt >= 6) throw new Error(`${res.status} for ${url}`);
    await sleep(3000 * attempt); // Wikimedia rate-limits bursts
  }
}

function api(params) {
  const q = new URLSearchParams({ action: "query", format: "json", formatversion: "2", redirects: "1", ...params });
  return get(`https://en.wikipedia.org/w/api.php?${q}`);
}

// 1. Which file each breed uses: a named file, or the article's lead image.
const fileFor = {};
const missing = [];
const titles = [...new Set(BREEDS.filter((b) => !FILES[b.id]).map(titleFor))];
for (let i = 0; i < titles.length; i += 40) {
  const batch = titles.slice(i, i + 40);
  const data = await api({ prop: "pageimages", piprop: "name", titles: batch.join("|") });
  const alias = {};
  for (const n of [...(data.query.normalized || []), ...(data.query.redirects || [])]) alias[n.to] = alias[n.from] || n.from;
  const byTitle = {};
  for (const page of data.query.pages) {
    let t = page.title;
    byTitle[t] = page;
    while (alias[t]) byTitle[(t = alias[t])] = page;
  }
  for (const b of BREEDS.filter((b) => !FILES[b.id] && batch.includes(titleFor(b)))) {
    const image = byTitle[titleFor(b)]?.pageimage;
    if (image) fileFor[b.id] = image.replace(/_/g, " ");
    else missing.push(`${b.name} (${titleFor(b)})`);
  }
}
Object.assign(fileFor, FILES);

// 2. Thumbnail URLs, authors and licenses for every file.
const info = {};
const files = [...new Set(Object.values(fileFor))];
for (let i = 0; i < files.length; i += 40) {
  const batch = files.slice(i, i + 40);
  const data = await api({
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: String(SIZES.photo),
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    titles: batch.map((f) => `File:${f}`).join("|"),
  });
  const alias = Object.fromEntries((data.query.normalized || []).map((n) => [n.to, n.from]));
  for (const page of data.query.pages) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const meta = ii.extmetadata || {};
    const name = (alias[page.title] || page.title).replace(/^File:/, "");
    info[name] = {
      photoUrl: ii.thumburl.replace(/\?.*$/, ""),
      page: ii.descriptionurl,
      author: cleanAuthor(plain(meta.Artist?.value)) || "Unknown author",
      license: plain(meta.LicenseShortName?.value) || "See file page",
      licenseUrl: meta.LicenseUrl?.value || ii.descriptionurl,
    };
  }
}

function plain(html) {
  return html?.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
}

// Author fields are free text on Wikimedia. Keep the names, drop wiki markup and upload notes.
function cleanAuthor(text) {
  if (!text) return "";
  let t = text
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1") // [[User:x|Name]] → Name
    .replace(/^No machine-readable author provided\.\s*(.+?)\s+assumed.*$/i, "$1")
    .replace(/https?:\/\/(?:www\.)?flickr\.com\/(?:people|photos)\/([^/\s]+)\/?\S*/gi, "$1 on Flickr")
    .replace(/\S+\.(?:jpe?g|png|gif):\s*/gi, "") // "Original.jpg: " prefixes on derivative works
    .replace(/\((?:[^()]*\b(?:talk|contribs|uploaded by|original text)\b[^()]*|[^()]*\([^()]*\)[^()]*)\)/gi, "")
    .replace(/\((?:[^()]*\([^()]*\))*[^()]*\)\s*(?=\()/g, "")
    .replace(/The original uploader was[^.]*\.?/gi, "")
    .replace(/Publicada por\/Publish by:.*$/i, "")
    .replace(/,?\s*https?:\/\/\S+/g, "") // leftover website links
    .replace(/\S+@\S+/g, "") // never show email addresses
    .replace(/"/g, "")
    .replace(/\s*derivative work:\s*/i, "; derivative work: ")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s,;.:(]+$/, "")
    .replace(/^[\s,;.:]+/, "")
    .trim();
  return t;
}

// 3. Download both sizes.
mkdirSync(OUT_DIR, { recursive: true });
const photos = {};
for (const b of BREEDS) {
  const meta = info[fileFor[b.id]];
  if (!meta) {
    if (fileFor[b.id]) missing.push(`${b.name} (File:${fileFor[b.id]})`);
    continue;
  }
  for (const [kind, width] of Object.entries(SIZES)) {
    const out = new URL(`${b.id}-${width}.jpg`, OUT_DIR);
    if (!existsSync(out)) {
      writeFileSync(out, await get(meta.photoUrl.replace(`/${SIZES.photo}px-`, `/${width}px-`), "buffer"));
      await sleep(250);
    }
  }
  photos[b.id] = {
    thumb: `images/breeds/${b.id}-${SIZES.thumb}.jpg`,
    photo: `images/breeds/${b.id}-${SIZES.photo}.jpg`,
    author: meta.author,
    license: meta.license,
    source: meta.page,
  };
}

writeFileSync(
  new URL("../js/breed-photos.js", import.meta.url),
  `// Generated by scripts/fetch-breed-photos.mjs. Do not edit by hand.
// Breed photos from Wikipedia / Wikimedia Commons; see CREDITS.md.
export const BREED_PHOTOS = ${JSON.stringify(photos, null, 2)};
`
);

const rows = BREEDS.filter((b) => photos[b.id]).map((b) => {
  const p = photos[b.id];
  return `| ${b.name} | ${p.author.replace(/\|/g, "/")} | ${p.license} | [File page](${p.source}) |`;
});
writeFileSync(
  new URL("../CREDITS.md", import.meta.url),
  `# Photo credits

Breed photos come from Wikipedia and Wikimedia Commons. Each is used under the license shown; follow the file page link for full details. The photos in \`images/breeds/\` are resized copies.

| Breed | Author | License | Source |
|---|---|---|---|
${rows.join("\n")}
`
);

console.log(`${Object.keys(photos).length} of ${BREEDS.length} breeds have photos.`);
if (missing.length) console.log("Missing:", missing.join("; "));
