import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  ArrowDownToLine, ArrowUpRight, CheckCircle2, ChevronRight, Clapperboard, Film,
  ListVideo, Menu, MonitorPlay, Play, RotateCcw, SearchX, Settings2, Shuffle,
  Sparkles, Star, TvMinimalPlay, UploadCloud, X
} from 'lucide-react';
import { DEMO_MOVIES } from './data/demo.js';
import { CATEGORIES, drawRandom, mergeMovies, normalizeMovie } from './lib/library.js';
import { lookupPoster } from './lib/posters.js';

const LIBRARY_KEY = 'cineshuffle.library.v1';
const DEMO_KEY = 'cineshuffle.demo.v1';
const OMDB_KEY = 'cineshuffle.omdb.v1';
const icons = {
  'All titles': ListVideo,
  'Movies': Film,
  'TV Series': MonitorPlay,
  'Mini Series': TvMinimalPlay,
  'Short Films': Clapperboard,
  'Other': Play,
};

function initialLibrary() {
  try {
    const saved = localStorage.getItem(LIBRARY_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* Reset unreadable saved data to demo. */ }
  return DEMO_MOVIES;
}

function MoviePoster({ movie, loading }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [movie?.id, movie?.poster]);
  const url = movie?.poster;
  const showImage = Boolean(url && !failed);
  return (
    <div className="poster-frame">
      {showImage ? (
        <img className="movie-poster" src={url} alt={`Poster for ${movie.title}`} onError={() => setFailed(true)} />
      ) : (
        <div className="poster-fallback" aria-label="Poster unavailable">
          <div className="poster-fallback__glow" />
          <span className="poster-fallback__brand">CINESHUFFLE ORIGINAL PICK</span>
          <Film size={58} strokeWidth={1} className="poster-fallback__icon" aria-hidden="true" />
          <strong>{movie?.title || 'Your next watch'}</strong>
          <span className="poster-fallback__foot">{loading ? 'LOOKING FOR ARTWORK…' : 'ARTWORK UNAVAILABLE'}</span>
        </div>
      )}
      <div className="poster-shadow" />
    </div>
  );
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: ({ data, meta }) => {
        const headers = (meta.fields || []).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
        if (!headers.includes('title') && !headers.includes('primarytitle')) {
          reject(new Error(`${file.name} does not look like an IMDb CSV (missing Title column).`));
          return;
        }
        const movies = data.map(normalizeMovie).filter(Boolean);
        if (!movies.length) {
          reject(new Error(`${file.name} does not contain any valid titles.`));
          return;
        }
        resolve(movies);
      },
      error: (err) => reject(new Error(`Could not read ${file.name}: ${err.message}`)),
    });
  });
}

export default function App() {
  const [library, setLibrary] = useState(initialLibrary);
  const [isDemo, setIsDemo] = useState(() => localStorage.getItem(DEMO_KEY) !== 'false');
  const [category, setCategory] = useState('All titles');
  const [selectedId, setSelectedId] = useState(() => initialLibrary()[0]?.id || null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [omdbKey, setOmdbKey] = useState(() => localStorage.getItem(OMDB_KEY) || '');
  const [pendingKey, setPendingKey] = useState(omdbKey);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterMessage, setPosterMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)), [library]);
  useEffect(() => localStorage.setItem(DEMO_KEY, String(isDemo)), [isDemo]);

  const visibleMovies = useMemo(
    () => (category === 'All titles' ? library : library.filter((movie) => movie.type === category)),
    [category, library]
  );
  const selected = visibleMovies.find((movie) => movie.id === selectedId) || visibleMovies[0] || null;
  const numberOfCategories = library.reduce((total, movie) => {
    total[movie.type] = (total[movie.type] || 0) + 1;
    return total;
  }, {});

  useEffect(() => {
    if (!selected || !omdbKey.trim() || selected.poster || selected.posterChecked) {
      setPosterLoading(false);
      setPosterMessage('');
      return;
    }
    const controller = new AbortController();
    setPosterLoading(true);
    setPosterMessage('');
    lookupPoster(selected, omdbKey, controller.signal)
      .then((poster) => {
        if (controller.signal.aborted) return;
        setLibrary((prev) => prev.map((movie) => movie.id === selected.id
          ? { ...movie, poster: poster || '', posterChecked: true }
          : movie
        ));
        if (!poster) setPosterMessage('No artwork found for this title.');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setPosterMessage(`Poster lookup: ${err.message}`);
      })
      .finally(() => { if (!controller.signal.aborted) setPosterLoading(false); });
    return () => controller.abort();
  }, [selected?.id, omdbKey]);

  function selectCategory(next) {
    setCategory(next);
    const candidates = next === 'All titles' ? library : library.filter((movie) => movie.type === next);
    setSelectedId(candidates[0]?.id || null);
    setMobileMenu(false);
    setError('');
    setNotice('');
  }

  function shuffleMovie() {
    const next = drawRandom(visibleMovies, selected?.id);
    if (next) {
      setSelectedId(next.id);
      setPosterMessage('');
    }
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setImporting(true);
    setNotice('');
    setError('');
    try {
      const collections = await Promise.all(files.map(parseCsv));
      const incoming = collections.flat();
      const uniqueIncoming = mergeMovies([], incoming);
      const nextLibrary = mergeMovies(isDemo ? [] : library, uniqueIncoming);
      setLibrary(nextLibrary);
      setIsDemo(false);
      setSelectedId(uniqueIncoming[0]?.id || nextLibrary[0]?.id || null);
      setCategory('All titles');
      setMobileMenu(false);
      setNotice(`Imported ${uniqueIncoming.length} unique title${uniqueIncoming.length === 1 ? '' : 's'} from ${files.length} CSV file${files.length === 1 ? '' : 's'}. Your library now has ${nextLibrary.length} titles.`);
    } catch (err) {
      setError(err.message || 'Could not import CSV.');
    } finally {
      setImporting(false);
    }
  }

  function savePosterKey(event) {
    event.preventDefault();
    const key = pendingKey.trim();
    localStorage.setItem(OMDB_KEY, key);
    if (key !== omdbKey) {
      // A different key may find posters a previous lookup could not resolve.
      setLibrary((prev) => prev.map((movie) => movie.poster ? movie : { ...movie, posterChecked: false }));
    }
    setOmdbKey(key);
    setShowSettings(false);
    setPosterMessage('');
    setNotice(key ? 'Poster lookup enabled. Posters are loaded as you shuffle.' : 'Poster lookup disabled.');
  }

  function clearLibrary() {
    if (!window.confirm('Remove all imported titles from this browser? You can import them again later.')) return;
    setLibrary([]);
    setIsDemo(false);
    setSelectedId(null);
    setCategory('All titles');
    setShowSettings(false);
    setNotice('Library cleared. Import an IMDb CSV to begin.');
  }

  function restoreDemo() {
    if (library.length && !isDemo && !window.confirm('Replace your imported library with the demo collection?')) return;
    setLibrary(DEMO_MOVIES);
    setSelectedId(DEMO_MOVIES[0].id);
    setIsDemo(true);
    setCategory('All titles');
    setShowSettings(false);
    setNotice('Demo collection restored.');
  }

  const availableCategories = CATEGORIES.filter((entry) => entry.id !== 'Other' || numberOfCategories.Other);
  const imdbLink = selected && /^tt\d+$/i.test(selected.id)
    ? `https://www.imdb.com/title/${selected.id}/` : null;

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <div className="brand__mark"><Clapperboard size={25} strokeWidth={2.4} /></div>
          <div className="brand__text"><strong>Cine<span>Shuffle</span></strong><small>YOUR MOVIE PICKER</small></div>
          <button className="icon-button close-mobile" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={20} /></button>
        </div>

        <div className="sidebar__section-label">YOUR LIBRARY</div>
        <nav className="nav-list" aria-label="Title categories">
          {availableCategories.map(({ id, label }) => {
            const Icon = icons[id];
            const count = id === 'All titles' ? library.length : numberOfCategories[id] || 0;
            return (
              <button key={id} className={`nav-item ${category === id ? 'nav-item--active' : ''}`}
                onClick={() => selectCategory(id)} aria-current={category === id ? 'page' : undefined}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
                <span className="nav-item__count">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__bottom">
          <div className="import-mini">
            <div className="import-mini__icon"><UploadCloud size={20} /></div>
            <strong>Bring your watchlist</strong>
            <p>Import your IMDb CSV to start picking from your own library.</p>
            <button className="secondary-button full" onClick={() => inputRef.current?.click()} disabled={importing}>
              <ArrowDownToLine size={16} /> {importing ? 'Importing…' : 'Import CSV'}
            </button>
          </div>
          <button className="settings-link" onClick={() => { setPendingKey(omdbKey); setShowSettings(true); setMobileMenu(false); }}>
            <Settings2 size={18} /><span>Poster settings</span><ChevronRight size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-mobile" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={23} /></button>
          <div className="topbar__eyebrow"><span className="live-dot" /> A LITTLE HELP PICKING A MOVIE</div>
          <div className="topbar__actions">
            {isDemo && <span className="demo-pill">DEMO LIBRARY</span>}
            <button className="topbar__import" onClick={() => inputRef.current?.click()} disabled={importing}><UploadCloud size={16}/><span>Import IMDb CSV</span></button>
          </div>
        </header>

        <section className="intro">
          <div className="eyebrow"><Sparkles size={16} /> LESS SCROLLING, MORE WATCHING</div>
          <h1>What are we <em>watching</em> tonight?</h1>
          <p>One click. One great pick. Straight from your own collection.</p>
        </section>

        <div className="section-line">
          <div><span className="section-label">NOW PICKING FROM</span><h2>{category}</h2></div>
          <span className="count-tag">{visibleMovies.length} title{visibleMovies.length !== 1 ? 's' : ''} available</span>
        </div>

        {error && <div className="alert alert--error" role="alert"><SearchX size={18} />{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={17}/></button></div>}
        {notice && <div className="alert alert--success" role="status"><CheckCircle2 size={18}/>{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={17}/></button></div>}

        {selected ? (
          <section className="pick-card" aria-label="Your selected title">
            <div className="pick-card__poster"><MoviePoster movie={selected} loading={posterLoading} /></div>
            <div className="pick-card__details">
              <div className="selection-label"><span className="selection-label__line" /> THE SHUFFLE PICKED</div>
              <div className="pick-card__title-group"><h3>{selected.title}</h3><div className="meta-line">{selected.year || 'Year unknown'}<span className="meta-dot" />{selected.rawType || selected.type}</div></div>
              <div className="rating-block">
                <div className="rating-block__star"><Star size={23} fill="currentColor" /></div>
                <div className="rating-block__value">{selected.rating || '—'}<span> / 10</span></div>
                <div className="rating-block__source">IMDb RATING</div>
              </div>
              <div className="genre-area"><span>GENRES</span><div className="genre-list">
                {(selected.genres.length ? selected.genres : ['Not listed']).map((g) => <span className="genre-chip" key={g}>{g}</span>)}
              </div></div>
              {imdbLink && <a className="imdb-link" href={imdbLink} target="_blank" rel="noopener noreferrer">View on IMDb <ArrowUpRight size={17}/></a>}
              {posterMessage && <div className="poster-note" role="status">{posterMessage}</div>}
              {!selected.poster && !omdbKey && !isDemo && <button className="poster-note poster-note--link" onClick={() => {setPendingKey(omdbKey);setShowSettings(true);}}>Want posters? Add a free OMDb API key in settings.</button>}
              <div className="pick-card__footer">
                <button className="shuffle-button" onClick={shuffleMovie} disabled={visibleMovies.length === 0}>
                  <Shuffle size={21} strokeWidth={2.5} /> SHUFFLE AGAIN
                </button>
                <span>{visibleMovies.length > 1 ? 'The next pick will be different' : 'Only one title in this category'}</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="empty-card">
            <div className="empty-card__icon"><Film size={32} /></div>
            <h3>No titles here yet</h3>
            <p>{library.length ? 'Try another category, or import more titles from IMDb.' : 'Import your IMDb watchlist to let the shuffling begin.'}</p>
            <button className="shuffle-button" onClick={() => inputRef.current?.click()}><UploadCloud size={20}/> IMPORT IMDb CSV</button>
          </section>
        )}

        <footer className="bottom-note"><span>MAKE MOVIE NIGHT EASY.</span><span>YOUR LIST. YOUR PICK. <span className="bottom-note__spark">✦</span></span></footer>
      </main>

      <input ref={inputRef} className="sr-only" type="file" multiple accept=".csv,text/csv" onChange={handleFiles} aria-label="Import IMDb CSV files" />

      {showSettings && (
        <div className="modal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal__header"><div><span className="eyebrow">OPTIONAL INTEGRATION</span><h2 id="settings-title">Poster settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={21}/></button></div>
            <p>IMDb exports don't include poster images. Add a personal <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer">free OMDb API key <ArrowUpRight size={13}/></a> and CineShuffle will request posters for selected titles.</p>
            <form onSubmit={savePosterKey} className="settings-form"><label htmlFor="omdb-key">OMDb API key</label><input id="omdb-key" type="password" autoComplete="off" placeholder="Enter your API key" value={pendingKey} onChange={(e) => setPendingKey(e.target.value)} /><span className="input-help">Stored only in this browser's local storage. Don't use a sensitive or paid production key in a publicly deployed frontend.</span><button type="submit" className="shuffle-button">SAVE SETTINGS</button></form>
            <div className="modal__divider" />
            <div className="settings-tools"><button onClick={restoreDemo}><RotateCcw size={17}/> Restore demo collection</button><button className="danger-link" onClick={clearLibrary}>Clear my library</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
