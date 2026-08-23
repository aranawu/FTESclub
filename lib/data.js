import { CLUB_MAP } from './clubs.js';

export async function getRegistration(db, registrationNo) {
  const registration = await db.prepare(`
    SELECT id, registration_no, student_name, grade, student_id_masked,
           guardian_phone, guardian_email, submitted_at, last_result_email_at
    FROM registrations WHERE registration_no = ?
  `).bind(registrationNo).first();
  if (!registration) return null;
  const choices = await db.prepare(`
    SELECT club_id, status, waitlist_no, reviewed_at, result_email_sent_at
    FROM registration_choices WHERE registration_id = ? ORDER BY id
  `).bind(registration.id).all();
  return hydrate(registration, choices.results || []);
}

export async function listRegistrations(db) {
  const registrations = await db.prepare(`
    SELECT id, registration_no, student_name, grade, student_id_masked,
           guardian_phone, guardian_email, submitted_at, last_result_email_at
    FROM registrations ORDER BY submitted_at ASC
  `).all();
  const choices = await db.prepare(`
    SELECT registration_id, club_id, status, waitlist_no, reviewed_at, result_email_sent_at
    FROM registration_choices ORDER BY id ASC
  `).all();
  const byRegistration = new Map();
  for (const choice of choices.results || []) {
    const list = byRegistration.get(choice.registration_id) || [];
    list.push(choice);
    byRegistration.set(choice.registration_id, list);
  }
  return (registrations.results || []).map((registration) => hydrate(registration, byRegistration.get(registration.id) || []));
}

function hydrate(registration, choices) {
  return {
    registrationNo: registration.registration_no,
    studentName: registration.student_name,
    grade: registration.grade,
    studentIdMasked: registration.student_id_masked,
    guardianPhone: registration.guardian_phone,
    guardianEmail: registration.guardian_email,
    submittedAt: registration.submitted_at,
    lastResultEmailAt: registration.last_result_email_at,
    choices: choices.map((choice) => ({
      clubId: choice.club_id,
      club: CLUB_MAP.get(choice.club_id) || { id: choice.club_id, name: choice.club_id },
      status: choice.status,
      waitlistNo: choice.waitlist_no,
      reviewedAt: choice.reviewed_at,
      resultEmailSentAt: choice.result_email_sent_at,
    })),
  };
}
