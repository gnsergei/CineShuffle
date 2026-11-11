export async function lookupPoster(movie, apiKey, signal) {
  if (!apiKey.trim()) return null;
  const query = new URLSearchParams({ apikey: apiKey.trim(), plot: 'short' });
  if (/^tt\d{7,10}$/i.test(movie.id)) {
    query.set('i', movie.id);
  } else {
    query.set('t', movie.title);
    if (/^\d{4}$/.test(movie.year || '')) query.set('y', movie.year);
  }
  const response = await fetch(`https://www.omdbapi.com/?${query.toString()}`, { signal });
  if (!response.ok) throw new Error(`Poster service returned ${response.status}.`);
  const data = await response.json();
  if (data.Response === 'False') throw new Error(data.Error || 'No matching title found.');
  return data.Poster && data.Poster !== 'N/A' ? data.Poster : null;
}
