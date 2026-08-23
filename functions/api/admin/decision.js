import { CLUB_MAP } from '../../../lib/clubs.js';
import { getRegistration } from '../../../lib/data.js';
import { resultEmail, sendMail } from '../../../lib/email.js';
import { handleApiError, json, readJson, requireAdmin } from '../../../lib/http.js';

const STATUSES = new Set(['pending', 'accepted', 'waitlist', 'rejected']);

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    if (!env.DB) return json({ error: '資料庫尚未設定。' }, 503);
    const payload = await readJson(request);
    const registrationNo = String(payload.registrationNo || '').trim();
    const clubId = String(payload.clubId || '').trim();
    const status = String(payload.status || '').trim();
    if (!registrationNo || !CLUB_MAP.has(clubId) || !STATUSES.has(status)) return json({ error: '審核資料不正確。' }, 400);

    const registration = await getRegistration(env.DB, registrationNo);
    if (!registration || !registration.choices.some((choice) => choice.clubId === clubId)) return json({ error: '找不到此學生的社團報名。' }, 404);

    const club = CLUB_MAP.get(clubId);
    if (status === 'accepted' && club.capacity !== null) {
      const accepted = await env.DB.prepare(`SELECT COUNT(*) AS total
        FROM registration_choices
        WHERE club_id = ? AND status = 'accepted'
          AND registration_id <> (SELECT id FROM registrations WHERE registration_no = ?)`)
        .bind(clubId, registrationNo).first();
      if (Number(accepted?.total || 0) >= club.capacity) {
        return json({ error: `${club.name}已達 ${club.capacity} 人上限，請改列候補或未錄取。` }, 409);
      }
    }

    let waitlistNo = status === 'waitlist' ? Number(payload.waitlistNo || 0) : null;
    if (status === 'waitlist' && waitlistNo < 1) {
      const row = await env.DB.prepare(`SELECT COALESCE(MAX(waitlist_no), 0) + 1 AS next_no
        FROM registration_choices WHERE club_id = ? AND status = 'waitlist'`).bind(clubId).first();
      waitlistNo = Number(row?.next_no || 1);
    }
    const now = new Date().toISOString();
    const update = await env.DB.prepare(`UPDATE registration_choices
      SET status = ?, waitlist_no = ?, reviewed_at = ?
      WHERE registration_id = (SELECT id FROM registrations WHERE registration_no = ?) AND club_id = ?`)
      .bind(status, waitlistNo, now, registrationNo, clubId).run();
    if (!update.meta?.changes) return json({ error: '沒有更新任何資料。' }, 404);

    const updated = await getRegistration(env.DB, registrationNo);
    const mail = await sendMail(env, {
      to: updated.guardianEmail,
      ...resultEmail(updated, env.SCHOOL_NAME || '學校'),
    });
    if (mail.sent) {
      await env.DB.batch([
        env.DB.prepare('UPDATE registrations SET last_result_email_at = ? WHERE registration_no = ?').bind(now, registrationNo),
        env.DB.prepare(`UPDATE registration_choices SET result_email_sent_at = ?
          WHERE registration_id = (SELECT id FROM registrations WHERE registration_no = ?) AND club_id = ?`).bind(now, registrationNo, clubId),
      ]);
    }
    return json({ registration: await getRegistration(env.DB, registrationNo), emailSent: mail.sent, emailReason: mail.reason || null });
  } catch (error) {
    return handleApiError(error);
  }
}
