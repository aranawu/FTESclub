import { listRegistrations } from '../../../lib/data.js';
import { handleApiError, json, requireAdmin } from '../../../lib/http.js';

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    return json({ registrations: await listRegistrations(env.DB) });
  } catch (error) {
    return handleApiError(error);
  }
}
