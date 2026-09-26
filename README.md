# 🐶 Doggy Merge

Pick two dog breeds, merge them into a brand-new breed, see an AI-generated picture of the result, and add it to your collection.

Works in any modern browser and adapts to phone (iPhone), tablet (iPad) and desktop screens. It can also be added to the home screen.

## Features

- **Two breed lists** with 138 major breeds and a real photo of each, searchable and filterable by group (Sporting, Hound, Working, Terrier, Toy, Non-Sporting, Herding).
- **Merge** any two breeds, or tap **🎲 Surprise me** for a random pair.
- **Generated names**: well-known crosses get their real names (Labradoodle, Puggle, Pomsky…); every other pair gets an invented name that blends syllables from both breeds (e.g. Rottweiler + Golden Retriever → *Rottriever*). Tap 🔀 for alternatives, or type your own.
- **AI image** of the new dog, built from both parents' coats and features. Tap **🔄 New image** for a different take.
- **Collection** saved in your browser (localStorage), with a detail view and a remove option.
- **Merge your own dogs**: every saved dog appears under "Your dogs" at the top of both lists, so you can keep crossing them with breeds or with each other across generations.

## Running locally

It's a static site with no build step. Serve the folder with any web server (ES modules don't load from `file://`):

```sh
npm start          # python3 -m http.server 8000
# then open http://localhost:8000
```

Run the tests (Node 18+):

```sh
npm test
```

## Image generation

Images come from [Pollinations](https://pollinations.ai), which is free and needs no API key: the prompt and a random seed are encoded in an image URL. To use a different provider, change `imageUrl()` in `js/imagegen.js`. A provider that needs a secret API key should go through a small backend proxy so the key never reaches the browser.

When you save a dog, the app also tries to store a small thumbnail of the image in the collection, so saved dogs keep their picture even if the generator changes.

## Breed photos

Each breed's photo is the lead image of its Wikipedia article (or a hand-picked Wikimedia Commons photo where that image didn't suit), stored as small copies in `images/breeds/`. Authors and licenses are listed in [CREDITS.md](CREDITS.md), and the selected breed shows its photo credit in the app.

To refresh the photos or add a breed, run:

```sh
node scripts/fetch-breed-photos.mjs
```

It only downloads photos that aren't already in `images/breeds/`; delete a file to fetch it again. Set a breed's Wikipedia article in `TITLES` or a specific photo in `FILES` at the top of the script.

## Project layout

```
index.html            App shell
css/styles.css        Responsive styles (light and dark mode)
js/app.js             UI and state
js/breeds.js          Breed catalogue (group, size, temperament, look)
js/naming.js          Breed-name generator and description
js/imagegen.js        Prompt building and image-generator calls
js/storage.js         Collection persistence
js/mydogs.js          Turns saved dogs into mergeable "breeds"
js/breed-photos.js    Generated: photo paths and credits for each breed
images/breeds/        Breed photos (120px for lists, 330px for the selected breed)
scripts/              Photo lookup script
CREDITS.md            Generated: photo authors and licenses
tests/                Node tests (naming, saved dogs, image retries)
```

## Deploying

The app is published with GitHub Pages at **https://knoxduval.github.io/doggymerge/**. Pages serves the repository root of the publishing branch (Settings → Pages → Deploy from a branch) and republishes on every push. The empty `.nojekyll` file tells Pages to serve the files as they are, without a Jekyll build.

Any other static host works too (Cloudflare Pages, Vercel, Netlify).
