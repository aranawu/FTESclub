import { classForGrade, validateClubSelection } from '../../../lib/clubs.js';
import { getRegistration, listRegistrations } from '../../../lib/data.js';
import { receiptEmail, sendMail } from '../../../lib/email.js';
import { handleApiError, json, readJson, requireAdmin } from '../../../lib/http.js';
import { registrationNumber, validEmail, validPhone } from '../../../lib/security.js';

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

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    const payload = await readJson(request);
    const studentName = String(payload.studentName || '').trim();
    const grade = String(payload.grade || '').trim();
    const guardianPhone = String(payload.guardianPhone || '').trim();
    const guardianEmail = String(payload.guardianEmail || '').trim().toLowerCase();
    const clubIds = Array.isArray(payload.clubs) ? payload.clubs.map(String) : [];

    if (!studentName || studentName.length > 40) return json({ error: '請填寫正確的學生姓名。' }, 400);
    if (!classForGrade(grade)) return json({ error: '請選擇正確年級。' }, 400);
    if (guardianPhone && !validPhone(guardianPhone)) return json({ error: '家長聯絡電話格式不正確。' }, 400);
    if (guardianEmail && !validEmail(guardianEmail)) return json({ error: '家長電子郵件格式不正確。' }, 400);
    const selection = validateClubSelection(grade, clubIds);
    if (!selection.ok) return json({ error: selection.message }, 400);

    const id = crypto.randomUUID();
    const registrationNo = registrationNumber();
    const submittedAt = new Date().toISOString();
    const statements = [
      env.DB.prepare(`INSERT INTO registrations
        (id, registration_no, student_name, grade, class_name, student_id_hash, student_id_masked, guardian_phone, guardian_email, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, registrationNo, studentName, grade, classForGrade(grade), `admin:${crypto.randomUUID()}`, '後台新增', guardianPhone, guardianEmail, submittedAt),
      ...selection.selected.map((club) => env.DB.prepare(`INSERT INTO registration_choices
        (registration_id, club_id, status) VALUES (?, ?, 'pending')`).bind(id, club.id)),
    ];
    await env.DB.batch(statements);

    const registration = await getRegistration(env.DB, registrationNo);
    let email = { sent: false, reason: 'NO_EMAIL' };
    if (guardianEmail) {
      email = await sendMail(env, { to: guardianEmail, ...receiptEmail(registration, env.SCHOOL_NAME || '學校') });
    }
    return json({ registrationNo, emailSent: email.sent, emailReason: email.reason || null, choices: registration.choices }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
