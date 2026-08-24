import { listRegistrations } from '../../../lib/data.js';
import { handleApiError, json, readJson, requireAdmin } from '../../../lib/http.js';
import { printableNotices } from '../../../lib/notice.js';

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    const payload = await readJson(request);
    const registrationNos = [...new Set((Array.isArray(payload.registrationNos) ? payload.registrationNos : []).map((value) => String(value).trim()).filter(Boolean))];
    if (!registrationNos.length) return json({ error: '請至少選取一位學生。' }, 400);
    if (registrationNos.length > 200) return json({ error: '一次最多列印 200 位學生。' }, 400);

    const registrations = await listRegistrations(env.DB);
    const byNumber = new Map(registrations.map((registration) => [registration.registrationNo, registration]));
    const selected = registrationNos.map((registrationNo) => byNumber.get(registrationNo)).filter(Boolean);
    if (selected.length !== registrationNos.length) return json({ error: '部分學生報名資料不存在，請重新整理後再選取。' }, 404);

    const stylesheetUrl = new URL('/print.css', request.url).href;
    return new Response(printableNotices(selected, env.SCHOOL_NAME || '學校', stylesheetUrl), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
