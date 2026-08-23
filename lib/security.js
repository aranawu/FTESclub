export function normalizeTaiwanId(value) {
  return String(value || '').trim().toUpperCase();
}

export function isValidTaiwanId(value) {
  const id = normalizeTaiwanId(value);
  if (!/^[A-Z][12]\d{8}$/.test(id)) return false;
  const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
  const code = letters.indexOf(id[0]) + 10;
  const nums = [Math.floor(code / 10), code % 10, ...id.slice(1).split('').map(Number)];
  return (nums[0] + nums[1] * 9 + nums[2] * 8 + nums[3] * 7 + nums[4] * 6 + nums[5] * 5 + nums[6] * 4 + nums[7] * 3 + nums[8] * 2 + nums[9] + nums[10]) % 10 === 0;
}

export function maskTaiwanId(value) {
  const id = normalizeTaiwanId(value);
  return `${id.slice(0, 1)}******${id.slice(-3)}`;
}

export async function hashTaiwanId(value, pepper) {
  if (!pepper) throw new Error('ID_HASH_PEPPER_NOT_CONFIGURED');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(normalizeTaiwanId(value)));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function validPhone(value) {
  return /^[0-9+()\-\s]{8,20}$/.test(String(value || '').trim());
}

export function registrationNumber() {
  return `115-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
