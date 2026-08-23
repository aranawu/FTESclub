export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function methodNotAllowed(allowed) {
  return json({ error: '不支援的請求方式。' }, 405, { allow: allowed.join(', ') });
}

export async function readJson(request, maxBytes = 20_000) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  try { return JSON.parse(text || '{}'); } catch { throw new Error('INVALID_JSON'); }
}

function constantTimeEqual(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

export async function createAdminSession(username, env, lifetimeSeconds = 8 * 60 * 60) {
  if (!env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET_NOT_CONFIGURED');
  const expiresAt = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ sub: username, exp: expiresAt })));
  const signature = toBase64Url(await hmac(payload, env.ADMIN_SESSION_SECRET));
  return { token: `${payload}.${signature}`, expiresAt: new Date(expiresAt * 1000).toISOString() };
}

export async function isAdmin(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !env.ADMIN_SESSION_SECRET) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  try {
    const expected = toBase64Url(await hmac(payload, env.ADMIN_SESSION_SECRET));
    if (!constantTimeEqual(signature, expected)) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return data.sub === (env.ADMIN_USERNAME || 'admin') && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAdmin(request, env) {
  return await isAdmin(request, env) ? null : json({ error: '管理者登入已失效，請重新登入。' }, 401);
}

export { constantTimeEqual };

export function handleApiError(error) {
  console.error(error);
  if (error?.message === 'PAYLOAD_TOO_LARGE') return json({ error: '送出的資料過大。' }, 413);
  if (error?.message === 'INVALID_JSON') return json({ error: '資料格式不正確。' }, 400);
  return json({ error: '系統暫時無法處理，請稍後再試。' }, 500);
}
