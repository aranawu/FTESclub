import { constantTimeEqual, createAdminSession, handleApiError, json, readJson } from '../../../lib/http.js';

export async function onRequestPost({ request, env }) {
  try {
    const payload = await readJson(request);
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const configuredUsername = env.ADMIN_USERNAME || 'admin';
    if (!env.ADMIN_PASSWORD || !constantTimeEqual(username, configuredUsername) || !constantTimeEqual(password, env.ADMIN_PASSWORD)) {
      return json({ error: '管理者帳號或密碼不正確。' }, 401);
    }
    return json({ ok: true, ...(await createAdminSession(configuredUsername, env)) });
  } catch (error) {
    return handleApiError(error);
  }
}
