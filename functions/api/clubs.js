import { CLASS_BY_GRADE, publicClubs } from '../../lib/clubs.js';
import { json } from '../../lib/http.js';

export function onRequestGet() {
  return json({ clubs: publicClubs(), classByGrade: CLASS_BY_GRADE }, 200, { 'cache-control': 'public, max-age=300' });
}
