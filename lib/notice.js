import { statusText } from './email.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function noticeSheet(registration, schoolName) {
  const rows = registration.choices.map((choice) => `<tr><td>${escapeHtml(choice.club.name)}</td><td>星期${escapeHtml(choice.club.day)}<br>${escapeHtml(choice.club.time)}</td><td>${escapeHtml(choice.club.period)}</td><td class="result">${escapeHtml(statusText(choice))}</td></tr>`).join('');
  return `<section class="sheet" data-print-sheet><div class="head"><p>${escapeHtml(schoolName)}｜115學年度</p><h1>課後社團個別錄取結果通知單</h1></div><p>親愛的家長您好，學生報名結果如下：</p><div class="meta"><div><strong>學生姓名</strong><br>${escapeHtml(registration.studentName)}</div><div><strong>班級</strong><br>${escapeHtml(registration.className)}</div><div><strong>報名編號</strong><br>${escapeHtml(registration.registrationNo)}</div><div><strong>身分證識別</strong><br>${escapeHtml(registration.studentIdMasked)}</div></div><table><thead><tr><th>社團</th><th>上課時間</th><th>社團日期</th><th>結果</th></tr></thead><tbody>${rows}</tbody></table><p>如對結果有疑問，請洽學校社團承辦人。</p></section>`;
}

function printableDocument(registrations, schoolName, title, stylesheetUrl) {
  const sheets = registrations.map((registration) => noticeSheet(registration, schoolName)).join('');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
    body{font-family:'Microsoft JhengHei',sans-serif;color:#31402f;margin:0;background:#f3f7e8}.actions{position:sticky;top:0;z-index:2;display:flex;justify-content:center;padding:12px;background:#315b2a}.sheet{max-width:760px;min-height:255mm;margin:24px auto;background:#fff;padding:42px;border:2px solid #d9e5b7;border-radius:20px;break-after:page}.sheet:last-child{break-after:auto}.head{border-bottom:4px solid #78a63a;padding-bottom:16px;margin-bottom:24px;text-align:center}.head p{margin:0;color:#66734f}.head h1{margin:4px 0;font-size:28px;color:#315b2a}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.meta div{background:#f4f8e8;padding:10px 12px;border-radius:9px}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#edf4d9}th,td{border:1px solid #aab990;padding:10px;text-align:left}.result{font-weight:800;color:#39713c}button{border:0;border-radius:999px;padding:10px 18px;font-weight:700;cursor:pointer;background:#ffd54a;color:#3f4c1f}@media(max-width:700px){.sheet{min-height:0;margin:10px;padding:20px}.meta{grid-template-columns:1fr}}@media print{body{background:#fff}.actions{display:none}.sheet{border:0;margin:0;max-width:none;min-height:0;padding:0;break-after:page}.sheet:last-child{break-after:auto}}@page{size:A4;margin:16mm}
  </style><link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head><body class="personal-notice-page"><div class="actions"><button type="button" data-print-button>列印／另存 PDF（共 ${registrations.length} 位）</button></div>${sheets}</body></html>`;
}

export function printableNotice(registration, schoolName, stylesheetUrl = '/print.css') {
  return printableDocument([registration], schoolName, `${registration.studentName}－社團結果通知單`, stylesheetUrl);
}

export function printableNotices(registrations, schoolName, stylesheetUrl = '/print.css') {
  return printableDocument(registrations, schoolName, `課後社團個人通知單（${registrations.length} 位）`, stylesheetUrl);
}
