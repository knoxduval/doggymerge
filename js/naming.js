// Name generator for merged breeds.
// 1. Well-known designer crosses use their real-world names (order independent).
// 2. Otherwise we build portmanteaus from each breed's "front" and "back" pieces.

import { slugify } from "./breeds.js";

// Real designer-dog names. Keys are the two breed names; order doesn't matter.
const KNOWN = [
  ["Labrador Retriever", "Poodle", "Labradoodle"],
  ["Golden Retriever", "Poodle", "Goldendoodle"],
  ["Bernese Mountain Dog", "Poodle", "Bernedoodle"],
  ["Old English Sheepdog", "Poodle", "Sheepadoodle"],
  ["Australian Shepherd", "Poodle", "Aussiedoodle"],
  ["Siberian Husky", "Poodle", "Huskydoodle"],
  ["Saint Bernard", "Poodle", "Saint Berdoodle"],
  ["Great Dane", "Poodle", "Great Danoodle"],
  ["Newfoundland", "Poodle", "Newfypoo"],
  ["Border Collie", "Poodle", "Bordoodle"],
  ["German Shepherd", "Poodle", "Shepadoodle"],
  ["Irish Setter", "Poodle", "Irish Doodle"],
  ["Labrador Retriever", "Golden Retriever", "Goldador"],
  ["Cocker Spaniel", "Poodle", "Cockapoo"],
  ["Cocker Spaniel", "Miniature Poodle", "Cockapoo"],
  ["Cocker Spaniel", "Toy Poodle", "Cockapoo"],
  ["Maltese", "Toy Poodle", "Maltipoo"],
  ["Maltese", "Miniature Poodle", "Maltipoo"],
  ["Yorkshire Terrier", "Toy Poodle", "Yorkipoo"],
  ["Yorkshire Terrier", "Miniature Poodle", "Yorkipoo"],
  ["Shih Tzu", "Toy Poodle", "Shih-Poo"],
  ["Shih Tzu", "Miniature Poodle", "Shih-Poo"],
  ["Cavalier King Charles Spaniel", "Poodle", "Cavapoo"],
  ["Cavalier King Charles Spaniel", "Miniature Poodle", "Cavapoo"],
  ["Cavalier King Charles Spaniel", "Toy Poodle", "Cavapoo"],
  ["Cavalier King Charles Spaniel", "Bichon Frise", "Cavachon"],
  ["Miniature Schnauzer", "Poodle", "Schnoodle"],
  ["Miniature Schnauzer", "Miniature Poodle", "Schnoodle"],
  ["Pomeranian", "Toy Poodle", "Pomapoo"],
  ["Pug", "Beagle", "Puggle"],
  ["Pomeranian", "Siberian Husky", "Pomsky"],
  ["Chihuahua", "Dachshund", "Chiweenie"],
  ["Chihuahua", "Pug", "Chug"],
  ["Chihuahua", "Yorkshire Terrier", "Chorkie"],
  ["Chihuahua", "Pomeranian", "Pomchi"],
  ["Shih Tzu", "Bichon Frise", "Shichon"],
  ["Shih Tzu", "Yorkshire Terrier", "Shorkie"],
  ["Maltese", "Shih Tzu", "Mal-Shi"],
  ["Maltese", "Yorkshire Terrier", "Morkie"],
  ["German Shepherd", "Siberian Husky", "Gerberian Shepsky"],
  ["Labrador Retriever", "German Shepherd", "Sheprador"],
  ["Labrador Retriever", "Siberian Husky", "Huskador"],
  ["Labrador Retriever", "Beagle", "Beagador"],
  ["Labrador Retriever", "Border Collie", "Borador"],
  ["Labrador Retriever", "Pembroke Welsh Corgi", "Corgidor"],
  ["Golden Retriever", "Pembroke Welsh Corgi", "Corgi Retriever"],
  ["Golden Retriever", "Siberian Husky", "Goberian"],
  ["Pembroke Welsh Corgi", "Siberian Husky", "Horgi"],
  ["Pembroke Welsh Corgi", "German Shepherd", "Corman Shepherd"],
  ["Pembroke Welsh Corgi", "Dachshund", "Dorgi"],
  ["Pembroke Welsh Corgi", "Poodle", "Corgipoo"],
  ["Cavalier King Charles Spaniel", "Beagle", "Beaglier"],
  ["Beagle", "Basset Hound", "Bagle Hound"],
  ["Boxer", "Labrador Retriever", "Boxador"],
  ["French Bulldog", "Pug", "Frenchie Pug"],
  ["Jack Russell Terrier", "Chihuahua", "Jack Chi"],
  ["Dachshund", "Beagle", "Doxle"],
  ["Poodle", "Bichon Frise", "Poochon"],
  ["Toy Poodle", "Bichon Frise", "Poochon"],
  ["Miniature Poodle", "Bichon Frise", "Poochon"],
];

const KNOWN_MAP = new Map(KNOWN.map(([a, b, n]) => [pairKey(slugify(a), slugify(b)), n]));

// Hand-tuned pieces for breeds whose names don't split nicely by rule.
const PIECES = {
  "labrador-retriever": { front: "Labra", back: "rador" },
  "golden-retriever": { front: "Golden", back: "triever" },
  "german-shepherd": { front: "Shep", back: "shepherd" },
  "siberian-husky": { front: "Husk", back: "usky" },
  "alaskan-malamute": { front: "Mala", back: "mute" },
  "poodle": { front: "Poo", back: "doodle" },
  "miniature-poodle": { front: "Minipoo", back: "poo" },
  "toy-poodle": { front: "Toypoo", back: "poo" },
  "pembroke-welsh-corgi": { front: "Corg", back: "orgi" },
  "cardigan-welsh-corgi": { front: "Corg", back: "orgi" },
  "chihuahua": { front: "Chi", back: "huahua" },
  "dachshund": { front: "Dachs", back: "weenie" },
  "pomeranian": { front: "Pom", back: "meranian" },
  "yorkshire-terrier": { front: "Yorki", back: "yorkie" },
  "shih-tzu": { front: "Shih", back: "tzu" },
  "bichon-frise": { front: "Bichon", back: "chon" },
  "french-bulldog": { front: "Frenchie", back: "bulldog" },
  "bulldog": { front: "Bull", back: "dog" },
  "cavalier-king-charles-spaniel": { front: "Cava", back: "valier" },
  "great-dane": { front: "Dane", back: "dane" },
  "saint-bernard": { front: "Berna", back: "bernard" },
  "bernese-mountain-dog": { front: "Berne", back: "nese" },
  "great-pyrenees": { front: "Pyre", back: "renees" },
  "jack-russell-terrier": { front: "Jack", back: "russell" },
  "border-collie": { front: "Bor", back: "collie" },
  "rough-collie": { front: "Col", back: "collie" },
  "australian-shepherd": { front: "Aussie", back: "ussie" },
  "australian-cattle-dog": { front: "Heeler", back: "heeler" },
  "doberman-pinscher": { front: "Dober", back: "berman" },
  "miniature-pinscher": { front: "Minpin", back: "pin" },
  "rottweiler": { front: "Rott", back: "weiler" },
  "boston-terrier": { front: "Boston", back: "ston" },
  "shiba-inu": { front: "Shiba", back: "inu" },
  "xoloitzcuintli": { front: "Xolo", back: "olo" },
  "west-highland-white-terrier": { front: "Westie", back: "estie" },
  "scottish-terrier": { front: "Scottie", back: "ottie" },
  "old-english-sheepdog": { front: "Sheepa", back: "sheepdog" },
  "shetland-sheepdog": { front: "Sheltie", back: "eltie" },
  "petit-basset-griffon-vendeen": { front: "Pibbi", back: "griffon" },
  "nova-scotia-duck-tolling-retriever": { front: "Toller", back: "toller" },
  "american-pit-bull-terrier": { front: "Pitty", back: "bull" },
  "staffordshire-bull-terrier": { front: "Staffy", back: "staffy" },
  "american-staffordshire-terrier": { front: "Amstaff", back: "staff" },
  "soft-coated-wheaten-terrier": { front: "Wheatie", back: "wheaten" },
  "german-shorthaired-pointer": { front: "Pointa", back: "pointer" },
  "german-wirehaired-pointer": { front: "Wirepoint", back: "pointer" },
  "cocker-spaniel": { front: "Cocka", back: "spaniel" },
  "english-cocker-spaniel": { front: "Cocka", back: "spaniel" },
  "english-springer-spaniel": { front: "Springa", back: "springer" },
  "irish-wolfhound": { front: "Wolfie", back: "wolfhound" },
  "rhodesian-ridgeback": { front: "Ridge", back: "ridgeback" },
  "belgian-malinois": { front: "Mali", back: "linois" },
  "tibetan-mastiff": { front: "Tibby", back: "mastiff" },
  "cane-corso": { front: "Corso", back: "corso" },
  "beagle": { front: "Bea", back: "eagle" },
  "pug": { front: "Pug", back: "uggle" },
  "maltese": { front: "Malti", back: "tese" },
};

// Words that are part of breed names but not useful for nicknames.
const FILLER = new Set([
  "retriever", "terrier", "spaniel", "hound", "dog", "shepherd", "sheepdog",
  "pointer", "setter", "mountain", "american", "english", "german", "irish",
  "scottish", "welsh", "miniature", "toy", "standard", "giant", "great", "king",
  "charles", "coated", "de", "des", "the", "and", "bay",
]);

export function pairKey(a, b) {
  return [a, b].sort().join("+");
}

// The most distinctive word of a breed name, e.g. "Gordon Setter" → "Gordon".
function coreWord(breed) {
  const words = breed.name.split(/[\s-]+/);
  const useful = words.filter((w) => !FILLER.has(w.toLowerCase()));
  return useful[0] || words[0];
}

// Friendly short name for display, e.g. "German Shepherd" → "Shepherd", "Jack Russell Terrier" → "Russell".
const SHORT = {
  "petit-basset-griffon-vendeen": "PBGV",
  "bouvier-des-flandres": "Bouvier",
  "nova-scotia-duck-tolling-retriever": "Toller",
  "american-pit-bull-terrier": "Pit Bull",
  "cavalier-king-charles-spaniel": "Cavalier",
  "west-highland-white-terrier": "Westie",
  "soft-coated-wheaten-terrier": "Wheaten",
  "labrador-retriever": "Lab",
  "golden-retriever": "Golden",
  "yorkshire-terrier": "Yorkie",
  "black-and-tan-coonhound": "Coonhound",
  "german-shorthaired-pointer": "Shorthair",
  "german-wirehaired-pointer": "Wirehair",
};
const GENERIC = new Set(["terrier", "retriever", "spaniel", "hound", "dog", "pointer"]);

export function shortName(breed) {
  if (SHORT[breed.id]) return SHORT[breed.id];
  const words = breed.name.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    if (!GENERIC.has(words[i].toLowerCase())) return words[i];
  }
  return words[0];
}

const isVowel = (c) => /[aeiouy]/i.test(c || "");
const isCons = (c) => /[a-z]/i.test(c || "") && !isVowel(c);

// Word used for blending: compound suffixes like "hound" add little ("Greyhound" → "Grey").
function blendWord(breed) {
  const w = coreWord(breed).toLowerCase();
  const stripped = w.replace(/(hound|dog)$/, "");
  return stripped.length >= 3 ? stripped : w;
}

// Candidate front pieces end at a syllable edge: "weima|raner", "box|er", or the whole word.
function frontCandidates(breed) {
  if (PIECES[breed.id]) return [{ text: PIECES[breed.id].front.toLowerCase(), share: 0.8, curated: true }];
  const w = blendWord(breed);
  const out = [];
  for (let p = 2; p <= w.length; p++) {
    const whole = p === w.length;
    const afterVowel = isVowel(w[p - 1]) && isCons(w[p]);
    const afterCoda = isCons(w[p - 1]) && isVowel(w[p - 2]);
    if ((whole && w.length <= 6) || afterVowel || afterCoda) out.push({ text: w.slice(0, p), share: p / w.length });
  }
  return out;
}

// Candidate back pieces start at an onset or a vowel: "dalma|tian", "b|oxer".
function backCandidates(breed) {
  if (PIECES[breed.id]) return [{ text: PIECES[breed.id].back.toLowerCase(), share: 0.8, curated: true }];
  const w = blendWord(breed);
  const out = [];
  for (let s = 0; s <= w.length - 2; s++) {
    const onset = isCons(w[s]) && (isVowel(w[s + 1]) || (/[lr]/.test(w[s + 1]) && isVowel(w[s + 2])));
    const nucleus = isVowel(w[s]) && (s === 0 || isCons(w[s - 1]));
    if (s === 0 || onset || nucleus) out.push({ text: w.slice(s), share: (w.length - s) / w.length });
  }
  return out;
}

// Score a blend: pronounceable seam, a comfortable length, and both parents recognisable.
function scoreBlend(f, b) {
  const a = f.text.slice(-1);
  const c = b.text[0];
  let score = 0;
  if (isVowel(a) !== isVowel(c)) score += 3; // consonant/vowel alternation at the seam
  if (a === c) score += 2; // shared letter overlaps neatly ("Labra" + "rador")
  const seam = (f.text.match(/[^aeiouy]+$/) || [""])[0] + (b.text.match(/^[^aeiouy]+/) || [""])[0];
  if (seam.length >= 3) score -= 3;
  const len = f.text.length + b.text.length;
  score -= Math.abs(len - 8) * 0.6;
  score += Math.min(f.share, 0.7) * 3 + Math.min(b.share, 0.7) * 3;
  if (f.share === 1 && b.share === 1) score -= 2; // just two words glued together
  if (f.text.length < 3 || b.text.length < 3) score -= 2;
  if (f.curated) score += 1.5;
  if (b.curated) score += 1.5;
  return score;
}

function blends(x, y) {
  const results = [];
  for (const f of frontCandidates(x)) {
    for (const b of backCandidates(y)) results.push({ name: join(f.text, b.text), score: scoreBlend(f, b) });
  }
  return results.sort((p, q) => q.score - p.score).map((r) => r.name);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Join two pieces, collapsing doubled letters at the seam ("Labra" + "rador" → "Labrador").
function join(front, back) {
  let b = back.toLowerCase();
  if (front.slice(-1).toLowerCase() === b[0]) b = b.slice(1);
  return capitalize(front.toLowerCase() + b);
}

// Returns the canonical name for a pair plus alternates the user can cycle through.
export function nameOptions(a, b) {
  const options = [];
  const known = KNOWN_MAP.get(pairKey(a.id, b.id));
  if (known) options.push(known);

  if (a.id === b.id) {
    options.push(`Double ${shortName(a)}`, `Super ${shortName(a)}`);
    return unique(options);
  }

  const ab = blends(a, b);
  const ba = blends(b, a);
  // Alternate between directions so "shuffle name" feels varied.
  options.push(ab[0], ba[0], ab[1], ba[1]);
  options.push(`${shortName(a)}-${shortName(b)}`);
  return unique(options.filter(Boolean)).slice(0, 5);
}

function unique(list) {
  const seen = new Set();
  return list.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Short blurb describing the merged dog.
export function describe(a, b) {
  const traits = unique([...a.traits.slice(0, 2), ...b.traits.slice(0, 2)]);
  const last = traits.pop();
  const traitText = traits.length ? `${traits.join(", ")} and ${last}` : last;
  return `${capitalize(article(traitText))} ${traitText} companion with the ${shortLook(a)} of ${article(a.name)} ${a.name} and the ${shortLook(b)} of ${article(b.name)} ${b.name}.`;
}

function article(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

// First phrase of the look, without trailing colour lists ("coat in black, rust and white" → "coat").
function shortLook(breed) {
  return breed.look.split(",")[0].replace(/ in [^,]*$/, "").trim();
}

export function mergedSize(a, b) {
  return Math.round((a.size + b.size) / 2);
}
