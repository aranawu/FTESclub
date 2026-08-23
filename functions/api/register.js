import { validateClubSelection } from '../../lib/clubs.js';
import { getRegistration } from '../../lib/data.js';
import { receiptEmail, sendMail } from '../../lib/email.js';
import { handleApiError, json, readJson } from '../../lib/http.js';
import { hashTaiwanId, isValidTaiwanId, maskTaiwanId, registrationNumber, validEmail, validPhone } from '../../lib/security.js';

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    const payload = await readJson(request);
    const studentName = String(payload.studentName || '').trim();
    const grade = String(payload.grade || '').trim();
    const studentId = String(payload.studentId || '').trim();
    const guardianPhone = String(payload.guardianPhone || '').trim();
    const guardianEmail = String(payload.guardianEmail || '').trim().toLowerCase();
    const clubIds = Array.isArray(payload.clubs) ? payload.clubs.map(String) : [];

    if (!studentName || studentName.length > 40) return json({ error: '請填寫正確的學生姓名。' }, 400);
    if (!['1年級', '2年級', '3年級', '4年級', '5年級', '6年級'].includes(grade)) return json({ error: '請選擇正確年級。' }, 400);
    if (!isValidTaiwanId(studentId)) return json({ error: '身分證字號格式或檢核碼不正確。' }, 400);
    if (!validPhone(guardianPhone)) return json({ error: '家長聯絡電話格式不正確。' }, 400);
    if (!validEmail(guardianEmail)) return json({ error: '家長電子郵件格式不正確。' }, 400);
    const selection = validateClubSelection(grade, clubIds);
    if (!selection.ok) return json({ error: selection.message }, 400);

    const studentIdHash = await hashTaiwanId(studentId, env.ID_HASH_PEPPER);
    const existing = await env.DB.prepare('SELECT registration_no FROM registrations WHERE student_id_hash = ?').bind(studentIdHash).first();
    if (existing) return json({ error: '此學生已完成報名，請勿重複送出。', registrationNo: existing.registration_no }, 409);

    const id = crypto.randomUUID();
    const registrationNo = registrationNumber();
    const submittedAt = new Date().toISOString();
    const statements = [
      env.DB.prepare(`INSERT INTO registrations
        (id, registration_no, student_name, grade, student_id_hash, student_id_masked, guardian_phone, guardian_email, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, registrationNo, studentName, grade, studentIdHash, maskTaiwanId(studentId), guardianPhone, guardianEmail, submittedAt),
      ...selection.selected.map((club) => env.DB.prepare(`INSERT INTO registration_choices
        (registration_id, club_id, status) VALUES (?, ?, 'pending')`).bind(id, club.id)),
    ];
    await env.DB.batch(statements);

    const registration = await getRegistration(env.DB, registrationNo);
    const schoolName = env.SCHOOL_NAME || '學校';
    const email = await sendMail(env, { to: guardianEmail, ...receiptEmail(registration, schoolName) });
    return json({ registrationNo, emailSent: email.sent, choices: registration.choices }, 201);
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE constraint failed')) return json({ error: '此學生已完成報名，請勿重複送出。' }, 409);
    return handleApiError(error);
  }
}
