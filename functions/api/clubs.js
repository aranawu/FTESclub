import { publicClubs } from '../../lib/clubs.js';
import { json } from '../../lib/http.js';

export function onRequestGet() {
  return json({ clubs: publicClubs() }, 200, { 'cache-control': 'public, max-age=300' });
}
