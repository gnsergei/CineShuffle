export const CATEGORIES = [
  { id: 'All titles', label: 'All titles' },
  { id: 'Movies', label: 'Movies' },
  { id: 'TV Series', label: 'TV series' },
  { id: 'Mini Series', label: 'Mini series' },
  { id: 'Short Films', label: 'Short films' },
  { id: 'Other', label: 'Other' }
];

export function classifyTitle(rawType = '') {
  const value = String(rawType).toLowerCase().replace(/[^a-z0-9]/g, '');
  // Test mini-series before ordinary series because the names overlap.
  if (value.includes('miniseries') || value.includes('limitedseries')) return 'Mini Series';
  if (value.includes('short')) return 'Short Films';
  if (value.includes('tvseries') || value.includes('televisionseries') || value === 'series') return 'TV Series';
  if (value === 'movie' || value === 'film' || value === 'tvmovie' || value === 'video') return 'Movies';
  return 'Other';
}

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
function field(row, ...names) {
  // Accept IMDb's usual headers and similar versions with differing case/spacing.
  const map = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[^a-z0-9]/g, ''), v]));
  for (const name of names) {
    const result = map[name.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (result !== undefined && result !== null) return text(result);
  }
  return '';
}

export function normalizeMovie(row) {
  const title = field(row, 'Title', 'Primary Title');
  if (!title) return null;
  const url = field(row, 'URL', 'IMDb URL');
  const externalId = field(row, 'Const', 'IMDb ID', 'tconst') || (url.match(/tt\d{7,10}/i)?.[0] ?? '');
  const year = field(row, 'Year', 'Start Year');
  const rawType = field(row, 'Title Type', 'Type') || 'Movie';
  const genreText = field(row, 'Genres', 'Genre');
  const rating = field(row, 'IMDb Rating', 'IMDbRating', 'IMDb score');
  const fallbackId = `local:${title.toLowerCase().replace(/\s+/g, '-')}:${year}`;
  return {
    id: externalId || fallbackId,
    title,
    year: year === 'N/A' || year === '\\N' ? '' : year,
    type: classifyTitle(rawType),
    rawType,
    rating: rating && rating !== 'N/A' ? rating : '',
    genres: genreText && genreText !== 'N/A' && genreText !== '\\N'
      ? genreText.split(',').map((g) => g.trim()).filter(Boolean) : [],
    poster: '',
    source: 'import',
  };
}

export function mergeMovies(existing, incoming) {
  const merged = new Map(existing.map((movie) => [movie.id, movie]));
  for (const movie of incoming) {
    const previous = merged.get(movie.id);
    if (!previous) {
      merged.set(movie.id, movie);
    } else {
      merged.set(movie.id, {
        ...previous, ...movie,
        poster: movie.poster || previous.poster || '',
        posterChecked: previous.posterChecked || false,
        rating: movie.rating || previous.rating || '',
        genres: movie.genres.length ? movie.genres : previous.genres,
      });
    }
  }
  return [...merged.values()];
}

export function drawRandom(items, previousId = null, random = Math.random) {
  if (!items.length) return null;
  if (items.length === 1) return items[0];
  const choices = items.filter((item) => item.id !== previousId);
  return choices[Math.floor(random() * choices.length)];
}
