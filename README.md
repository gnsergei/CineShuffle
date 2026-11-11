# CineShuffle — IMDb library movie picker

A minimal, browser-based React + Vite app that imports IMDb CSV lists and randomly picks something to watch.

## Features

- One-click Shuffle (avoids picking the same title twice in a row, if another title is available)
- Sidebar: All titles, Movies, TV series, Mini series, Short films, and Other when present
- Title, year, IMDb rating, genres, and poster (when available)
- Import multiple IMDb CSV files; repeated IMDb IDs are merged
- Local-only library storage in your browser (`localStorage`)
- Optional OMDb poster lookup by IMDb title ID; no account sign-in or backend required
- Responsive dark interface, working demo collection

## Running it locally

1. Install **Node.js 20.19+** (or 22.12+).
2. Unzip this project.
3. Open a terminal inside the `cineshuffle` folder.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local address displayed in your terminal (usually http://localhost:5173).

Build for production with `npm run build`, then `npm run preview` to test the build.

## How to import IMDb lists

1. Sign in to IMDb and open your Watchlist, Your Ratings, or a custom list.
2. Use the list's **Export** option to download a `.csv` file.
3. In CineShuffle click **Import IMDb CSV** and select one or several files.
4. Switch categories in the left sidebar and press **SHUFFLE AGAIN**.

An example `public/sample-imdb-watchlist.csv` is included if you want to test importing.

Supported IMDb columns: `Const` (IMDb ID), `Title`, `Title Type`, `IMDb Rating`, `Genres`, `Year`. `URL` also works to derive an IMDb ID. The importer is tolerant of extra columns and header capitalization. `TV Mini Series` maps to Mini series; `Short` maps to Short films. Other unsupported title types are shown under Other.

When you import for the first time, the demo collection is replaced. Additional CSV imports are **merged** and de-duplicated by IMDb ID. No CSV file is uploaded to a server.

## Poster images (optional)

IMDb CSV files do **not** contain poster images. To get artwork for imported titles:

1. Request an OMDb key at https://www.omdbapi.com/apikey.aspx
2. In CineShuffle, open **Poster settings** (bottom of the sidebar).
3. Paste your key and save it.
4. Shuffle. The app fetches a poster for each selected title, and caches the result in your browser.

OMDb's regular title response may contain a `Poster` URL, which this MVP uses. No paid Poster API endpoint is needed. Some titles may not have posters and will use a designed fallback card. The included demo uses some sample artwork URLs.

**Security**: This browser-only MVP stores the OMDb key in localStorage and sends it in requests to OMDb. It is visible to anyone with access to your browser and in browser network logs. Suitable for personal use, **not** for hiding a secret in a public web deployment. A later production version should move API calls and secrets into a serverless function or backend.

## Tech stack

- React 19
- Vite 7
- Papa Parse for CSV parsing (handles quoted commas)
- Lucide React for icons
- Plain CSS, browser localStorage

## Tests

```bash
npm test
```

The included Node tests cover IMDb type mapping, normalizing rows, deduplication, and shuffle logic. UI and live OMDb requests have not been end-to-end verified in this environment.

## Notes / current limitations

- This is a **CSV import**, not an IMDb account login or live watchlist sync.
- Removing an item from an IMDb list does not remove it from CineShuffle on a future import; use **Clear my library** and re-import if you want an exact replacement.
- Data is kept in a single browser/profile. Clearing browser storage removes it.
- IMDb ratings and genres are read from the imported file, not refreshed live.
- Imported titles without an IMDb ID can use title-based lookup but matching may be less precise.
