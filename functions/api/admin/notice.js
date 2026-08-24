import { getRegistration } from '../../../lib/data.js';
import { json, requireAdmin } from '../../../lib/http.js';
import { printableNotice } from '../../../lib/notice.js';

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
  const registrationNo = new URL(request.url).searchParams.get('registrationNo') || '';
  const registration = await getRegistration(env.DB, registrationNo);
  if (!registration) return json({ error: '找不到此學生的報名資料。' }, 404);
  return new Response(printableNotice(registration, env.SCHOOL_NAME || '學校'), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data: https:; base-uri 'none'; form-action 'none'",
      'x-content-type-options': 'nosniff',
    },
  });
}
