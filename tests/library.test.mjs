import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTitle, normalizeMovie, mergeMovies, drawRandom } from '../src/lib/library.js';

test('IMDb title categories map to sidebar entries', () => {
  assert.equal(classifyTitle('Movie'), 'Movies');
  assert.equal(classifyTitle('TV Movie'), 'Movies');
  assert.equal(classifyTitle('TV Series'), 'TV Series');
  assert.equal(classifyTitle('TV Mini Series'), 'Mini Series');
  assert.equal(classifyTitle('TV Mini-Series'), 'Mini Series');
  assert.equal(classifyTitle('Short'), 'Short Films');
  assert.equal(classifyTitle('TV Episode'), 'Other');
});

test('IMDb exported record normalises title rating genres and ID', () => {
  const movie = normalizeMovie({ 'Const': 'tt1234567', 'Title': 'A Film', 'Title Type': 'TV Mini Series', 'IMDb Rating': '8.9', 'Genres': 'Drama, Mystery', Year: '2021' });
  assert.deepEqual([movie.id, movie.type, movie.rating, movie.year], ['tt1234567', 'Mini Series', '8.9', '2021']);
  assert.deepEqual(movie.genres, ['Drama', 'Mystery']);
});

test('IMDb URL can supply a missing IMDb ID', () => {
  assert.equal(normalizeMovie({ Title: 'B', URL: 'https://www.imdb.com/title/tt1111111/' }).id, 'tt1111111');
});

test('merge retains cached posters, de-duplicates by ID', () => {
  const old = [{ ...normalizeMovie({ Const: 'tt1234567', Title: 'A' }), poster: 'https://example.com/poster.jpg', posterChecked: true }];
  const updated = [normalizeMovie({ Const: 'tt1234567', Title: 'A', 'IMDb Rating': '7.2' })];
  const merged = mergeMovies(old, updated);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].poster, 'https://example.com/poster.jpg');
  assert.equal(merged[0].rating, '7.2');
});

test('drawRandom never repeats immediately if there are alternatives', () => {
  const titles = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.notEqual(drawRandom(titles, 'a', () => 0).id, 'a');
  assert.equal(drawRandom([{ id: 'a' }], 'a').id, 'a');
  assert.equal(drawRandom([], 'a'), null);
});
