import { statusText } from './email.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function statusClass(status) {
  if (status === 'accepted') return 'accepted';
  if (status === 'waitlist') return 'waitlist';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function dayCard(choice) {
  const day = choice.club.day;
  const dayName = `星期${day}`;
  const dayIcon = day === '三' ? '🌱' : '🌻';
  return `<article class="day-card day-${day === '三' ? 'wednesday' : 'friday'}"><header><span class="day-pill">${dayIcon} ${dayName}</span><span class="result-pill ${statusClass(choice.status)}">${escapeHtml(statusText(choice))}</span></header><h2>${escapeHtml(choice.club.name)}</h2><dl class="club-facts"><div><dt>上課時間</dt><dd>${escapeHtml(choice.club.time)}</dd></div><div><dt>社團日期</dt><dd>${escapeHtml(choice.club.period)}</dd></div><div><dt>上課地點</dt><dd>${escapeHtml(choice.club.location || '待公告')}</dd></div></dl></article>`;
}

function noticeSheet(registration, schoolName) {
  const cards = [...registration.choices].sort((a, b) => ['三', '五'].indexOf(a.club.day) - ['三', '五'].indexOf(b.club.day)).map(dayCard).join('');
  return `<section class="sheet" data-print-sheet><header class="notice-hero"><p class="notice-kicker">🌾 ${escapeHtml(schoolName)}｜115學年度</p><h1>課後社團錄取結果通知單</h1><p>一起快樂學習，讓興趣在校園裡發芽！</p></header><p class="greeting">親愛的家長您好，以下為學生的課後社團統整結果：</p><div class="student-meta"><div><span>學生姓名</span><strong>${escapeHtml(registration.studentName)}</strong></div><div><span>班級</span><strong>${escapeHtml(registration.className)}</strong></div><div><span>報名編號</span><strong>${escapeHtml(registration.registrationNo)}</strong></div></div><div class="club-day-grid">${cards}</div><footer class="notice-footer"><span>如對結果有疑問，請洽學校社團承辦人。</span><span>請妥善保存本通知單 🌼</span></footer></section>`;
}

function printableDocument(registrations, schoolName, title, stylesheetUrl) {
  const sheets = registrations.map((registration) => noticeSheet(registration, schoolName)).join('');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head><body class="personal-notice-page"><div class="actions"><button type="button" data-print-button>列印／另存 PDF（共 ${registrations.length} 位）</button></div>${sheets}</body></html>`;
}

export function printableNotice(registration, schoolName, stylesheetUrl = '/print.css') {
  return printableDocument([registration], schoolName, `${registration.studentName}－社團結果通知單`, stylesheetUrl);
}

export function printableNotices(registrations, schoolName, stylesheetUrl = '/print.css') {
  return printableDocument(registrations, schoolName, `課後社團個人通知單（${registrations.length} 位）`, stylesheetUrl);
}
