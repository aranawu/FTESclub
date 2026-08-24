import { printableClassNotices } from '../../../lib/class-notices.js';
import { listRegistrations } from '../../../lib/data.js';
import { handleApiError, json, requireAdmin } from '../../../lib/http.js';

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    const registrations = await listRegistrations(env.DB);
    const stylesheetUrl = new URL('/print.css', request.url).href;
    return new Response(printableClassNotices(registrations, env.SCHOOL_NAME || '學校', stylesheetUrl), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data: https:; base-uri 'none'; form-action 'none'",
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
