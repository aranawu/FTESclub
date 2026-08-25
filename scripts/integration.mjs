import assert from 'node:assert/strict';
import { onRequestPost as register } from '../functions/api/register.js';
import { onRequestPost as login } from '../functions/api/admin/login.js';
import { onRequestGet as list } from '../functions/api/admin/registrations.js';
import { onRequestPost as decide } from '../functions/api/admin/decision.js';
import { onRequestGet as notice } from '../functions/api/admin/notice.js';
import { onRequestGet as classNotices } from '../functions/api/admin/class-notices.js';
import { onRequestPost as batchNotices } from '../functions/api/admin/notices.js';
import { CLASS_BY_GRADE, CLUB_MAP } from '../lib/clubs.js';

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim(); this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return this.db.first(this.sql, this.args); }
  async all() { return this.db.all(this.sql, this.args); }
  async run() { return this.db.run(this.sql, this.args); }
}

class FakeD1 {
  constructor() { this.registrations = []; this.choices = []; this.nextChoiceId = 1; }
  prepare(sql) { return new Statement(this, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
  async first(sql, args) {
    if (sql.includes('SELECT registration_no FROM registrations WHERE student_id_hash')) {
      const row = this.registrations.find((item) => item.student_id_hash === args[0]);
      return row ? { registration_no: row.registration_no } : null;
    }
    if (sql.includes('FROM registrations WHERE registration_no = ?')) {
      return this.registrations.find((item) => item.registration_no === args[0]) || null;
    }
    if (sql.includes('SELECT COUNT(*) AS total')) {
      const [clubId, registrationNo] = args;
      const excludedId = this.registrations.find((item) => item.registration_no === registrationNo)?.id;
      return { total: this.choices.filter((item) => item.club_id === clubId && item.status === 'accepted' && item.registration_id !== excludedId).length };
    }
    if (sql.includes('COALESCE(MAX(waitlist_no)')) {
      const values = this.choices.filter((item) => item.club_id === args[0] && item.status === 'waitlist').map((item) => item.waitlist_no || 0);
      return { next_no: Math.max(0, ...values) + 1 };
    }
    throw new Error(`Unhandled first SQL: ${sql}`);
  }
  async all(sql, args) {
    if (sql.includes('FROM registration_choices WHERE registration_id = ?')) {
      return { results: this.choices.filter((item) => item.registration_id === args[0]).sort((a, b) => a.id - b.id) };
    }
    if (sql.includes('FROM registrations ORDER BY submitted_at')) {
      return { results: [...this.registrations].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)) };
    }
    if (sql.includes('FROM registration_choices ORDER BY id')) return { results: [...this.choices].sort((a, b) => a.id - b.id) };
    throw new Error(`Unhandled all SQL: ${sql}`);
  }
  async run(sql, args) {
    if (sql.startsWith('INSERT INTO registrations')) {
      const [id, registration_no, student_name, grade, class_name, student_id_hash, student_id_masked, guardian_phone, guardian_email, submitted_at] = args;
      this.registrations.push({ id, registration_no, student_name, grade, class_name, student_id_hash, student_id_masked, guardian_phone, guardian_email, submitted_at, last_result_email_at: null });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('INSERT INTO registration_choices')) {
      this.choices.push({ id: this.nextChoiceId++, registration_id: args[0], club_id: args[1], status: 'pending', waitlist_no: null, reviewed_at: null, result_email_sent_at: null });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('UPDATE registration_choices SET status')) {
      const [status, waitlistNo, reviewedAt, registrationNo, clubId] = args;
      const registrationId = this.registrations.find((item) => item.registration_no === registrationNo)?.id;
      const choice = this.choices.find((item) => item.registration_id === registrationId && item.club_id === clubId);
      if (!choice) return { meta: { changes: 0 } };
      Object.assign(choice, { status, waitlist_no: waitlistNo, reviewed_at: reviewedAt });
      return { meta: { changes: 1 } };
    }
    if (sql.startsWith('UPDATE registrations SET last_result_email_at')) {
      const row = this.registrations.find((item) => item.registration_no === args[1]);
      if (row) row.last_result_email_at = args[0];
      return { meta: { changes: row ? 1 : 0 } };
    }
    if (sql.startsWith('UPDATE registration_choices SET result_email_sent_at')) {
      const registrationId = this.registrations.find((item) => item.registration_no === args[1])?.id;
      const choice = this.choices.find((item) => item.registration_id === registrationId && item.club_id === args[2]);
      if (choice) choice.result_email_sent_at = args[0];
      return { meta: { changes: choice ? 1 : 0 } };
    }
    throw new Error(`Unhandled run SQL: ${sql}`);
  }
}

const db = new FakeD1();
const env = { DB: db, ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password', ADMIN_SESSION_SECRET: 'test-session-secret-32-characters-long', ID_HASH_PEPPER: 'test-id-pepper-32-characters-long', SCHOOL_NAME: '測試國小' };
const post = (url, body, headers = {}) => new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

const submitted = await register({ request: post('http://local/api/register', { studentName: '測試學生', grade: '2年級', className: '甲班', studentId: 'A123456789', guardianPhone: '0912345678', guardianEmail: 'parent@example.com', clubs: ['flute', 'yushan-english'] }), env });
assert.equal(submitted.status, 201);
const submission = await submitted.json();
assert.match(submission.registrationNo, /^115-/);
assert.equal(submission.emailSent, false);
assert.equal(db.registrations[0].student_id_masked, 'A******789');
assert.equal(db.registrations[0].class_name, '二年忠班');
assert.equal(db.choices.length, 2);
assert.ok(db.choices.every((choice) => choice.status === 'pending'), '不限額與有限額社團都必須先進入人工審核');
assert.ok(submission.choices.every((choice) => choice.status === 'pending'), '報名回應不得自動錄取任何社團');
assert.deepEqual(CLASS_BY_GRADE, {
  '1年級': '一年忠班', '2年級': '二年忠班', '3年級': '三年忠班',
  '4年級': '四年忠班', '5年級': '五年忠班', '6年級': '六年忠班',
});
assert.ok(!JSON.stringify(db).includes('A123456789'), '身分證明碼不得寫入資料庫');

const duplicate = await register({ request: post('http://local/api/register', { studentName: '測試學生', grade: '2年級', className: '甲班', studentId: 'A123456789', guardianPhone: '0912345678', guardianEmail: 'parent@example.com', clubs: ['flute'] }), env });
assert.equal(duplicate.status, 409);

const invalidDays = await register({ request: post('http://local/api/register', { studentName: '另一學生', grade: '2年級', className: '乙班', studentId: 'F123456782', guardianPhone: '0912345678', guardianEmail: 'parent@example.com', clubs: ['flute', 'diabolo'] }), env });
assert.equal(invalidDays.status, 400);

const invalidDiaboloGrade = await register({ request: post('http://local/api/register', { studentName: '另一學生', grade: '2年級', className: '乙班', studentId: 'F123456782', guardianPhone: '0912345678', guardianEmail: 'parent@example.com', clubs: ['diabolo'] }), env });
assert.equal(invalidDiaboloGrade.status, 400);

assert.equal((await login({ request: post('http://local/api/admin/login', { username: 'admin', password: 'wrong' }), env })).status, 401);
const loggedIn = await login({ request: post('http://local/api/admin/login', { username: 'admin', password: env.ADMIN_PASSWORD }), env });
assert.equal(loggedIn.status, 200);
const loginData = await loggedIn.json();
assert.ok(loginData.token);
const adminHeaders = { authorization: `Bearer ${loginData.token}` };

const listed = await list({ request: new Request('http://local/api/admin/registrations', { headers: adminHeaders }), env });
assert.equal(listed.status, 200);
assert.equal((await listed.json()).registrations.length, 1);

const decided = await decide({ request: post('http://local/api/admin/decision', { registrationNo: submission.registrationNo, clubId: 'flute', status: 'accepted' }, adminHeaders), env });
assert.equal(decided.status, 200);
const decision = await decided.json();
assert.equal(decision.registration.choices.find((choice) => choice.clubId === 'flute').status, 'accepted');
assert.equal(decision.emailSent, false);

const rejectedDecision = await decide({ request: post('http://local/api/admin/decision', { registrationNo: submission.registrationNo, clubId: 'yushan-english', status: 'rejected' }, adminHeaders), env });
assert.equal(rejectedDecision.status, 200);

const printed = await notice({ request: new Request(`http://local/api/admin/notice?registrationNo=${submission.registrationNo}`, { headers: adminHeaders }), env });
assert.equal(printed.status, 200);
const printedHtml = await printed.text();
assert.ok(printedHtml.includes('測試學生'));
assert.ok(printedHtml.includes('錄取'));
assert.ok(printedHtml.includes('二年忠班'));
assert.ok(!printedHtml.includes('<img'));
assert.ok(printedHtml.includes('http://local/print.css'));
assert.ok(printedHtml.includes('class="personal-notice-page"'));

const classPrinted = await classNotices({ request: new Request('http://local/api/admin/class-notices', { headers: adminHeaders }), env });
assert.equal(classPrinted.status, 200);
const classPrintedHtml = await classPrinted.text();
assert.ok(classPrintedHtml.includes('課後社團班級通知單'));
assert.ok(classPrintedHtml.includes('二年忠班'));
assert.ok(classPrintedHtml.includes('測試學生'));
assert.ok(!classPrintedHtml.includes('<img'));
assert.ok(classPrintedHtml.includes('http://local/print.css'));
assert.ok(classPrintedHtml.includes('class="class-notice-page"'));
assert.ok(classPrintedHtml.includes('已錄取名單'));
assert.ok(classPrintedHtml.includes('候補／審核中'));
assert.ok(classPrintedHtml.includes('未錄取名單'));
assert.ok(classPrintedHtml.includes('請依上課日準時參加社團活動'));
assert.ok(classPrintedHtml.includes('<th>班級</th>'));
assert.ok(classPrintedHtml.includes('<th>開始日期</th>'));
assert.ok(classPrintedHtml.includes('<th>地點</th>'));
assert.ok(classPrintedHtml.includes('115/9/9（三）'));
assert.ok(classPrintedHtml.includes('音樂教室'));
assert.ok(classPrintedHtml.includes('class="name-only"'));
assert.ok(classPrintedHtml.includes('每位學生報名彙整'));
assert.ok(classPrintedHtml.includes('星期三報名／結果'));
assert.ok(classPrintedHtml.includes('星期五報名／結果'));
assert.equal(CLUB_MAP.get('flute').location, '音樂教室');
assert.equal(CLUB_MAP.get('diabolo').location, '活動中心');
assert.equal(CLUB_MAP.get('young-english').location, '多功能教室');
assert.equal(CLUB_MAP.get('yushan-english').location, '音樂教室');
assert.equal(CLUB_MAP.get('table-tennis').location, '活動中心B1');

const secondSubmitted = await register({ request: post('http://local/api/register', { studentName: '第二位學生', grade: '3年級', className: '甲班', studentId: 'A223456781', guardianPhone: '0912345678', guardianEmail: 'parent2@example.com', clubs: ['flute', 'table-tennis'] }), env });
assert.equal(secondSubmitted.status, 201);
const secondSubmission = await secondSubmitted.json();
assert.equal(db.registrations.find((registration) => registration.registration_no === secondSubmission.registrationNo).class_name, '三年忠班');

const batchPrinted = await batchNotices({ request: post('http://local/api/admin/notices', { registrationNos: [submission.registrationNo, secondSubmission.registrationNo] }, adminHeaders), env });
assert.equal(batchPrinted.status, 200);
const batchPrintedHtml = await batchPrinted.text();
assert.ok(batchPrintedHtml.includes('測試學生'));
assert.ok(batchPrintedHtml.includes('第二位學生'));
assert.equal((batchPrintedHtml.match(/class="sheet"/g) || []).length, 2);
assert.ok(batchPrintedHtml.includes('列印／另存 PDF（共 2 位）'));

console.log('Integration test passed: registration, duplicate protection, validation, admin auth, review, individual notice, and class notices.');
