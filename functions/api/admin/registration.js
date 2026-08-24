import { getRegistration } from '../../../lib/data.js';
import { handleApiError, json, readJson, requireAdmin } from '../../../lib/http.js';

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    const payload = await readJson(request);
    const registrationNo = String(payload.registrationNo || '').trim();
    const className = String(payload.className || '').trim();
    if (!registrationNo || !className || className.length > 20) return json({ error: '請填寫正確的班級。' }, 400);
    const update = await env.DB.prepare('UPDATE registrations SET class_name = ? WHERE registration_no = ?')
      .bind(className, registrationNo).run();
    if (!update.meta?.changes) return json({ error: '找不到此學生的報名資料。' }, 404);
    return json({ registration: await getRegistration(env.DB, registrationNo) });
  } catch (error) {
    return handleApiError(error);
  }
}
