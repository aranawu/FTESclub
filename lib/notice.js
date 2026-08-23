import { statusText } from './email.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

export function printableNotice(registration, schoolName) {
  const rows = registration.choices.map((choice) => `<tr><td>${escapeHtml(choice.club.name)}</td><td>星期${escapeHtml(choice.club.day)}<br>${escapeHtml(choice.club.time)}</td><td>${escapeHtml(choice.club.period)}</td><td class="result">${escapeHtml(statusText(choice))}</td></tr>`).join('');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(registration.studentName)}－社團結果通知單</title><style>
    body{font-family:'Microsoft JhengHei',sans-serif;color:#1f2937;margin:0;background:#eef4f8}.sheet{max-width:760px;margin:24px auto;background:#fff;padding:42px;border:1px solid #cbd5e1}.head{border-bottom:3px solid #23649a;padding-bottom:16px;margin-bottom:24px}.head h1{margin:4px 0;font-size:28px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.meta div{background:#f4f8fb;padding:10px 12px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #9ca3af;padding:10px;text-align:left}.result{font-weight:800;color:#155e75}.actions{margin-top:28px;display:flex;gap:10px}button{border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;background:#23649a;color:#fff}@media print{body{background:#fff}.sheet{border:0;margin:0;max-width:none;padding:0}.actions{display:none}}@page{size:A4;margin:16mm}
  </style></head><body><main class="sheet"><div class="head"><p>${escapeHtml(schoolName)}｜115學年度</p><h1>課後社團個別錄取結果通知單</h1></div><p>親愛的家長您好，學生報名結果如下：</p><div class="meta"><div><strong>學生姓名</strong><br>${escapeHtml(registration.studentName)}</div><div><strong>年級</strong><br>${escapeHtml(registration.grade)}</div><div><strong>報名編號</strong><br>${escapeHtml(registration.registrationNo)}</div><div><strong>身分證識別</strong><br>${escapeHtml(registration.studentIdMasked)}</div></div><table><thead><tr><th>社團</th><th>上課時間</th><th>社團日期</th><th>結果</th></tr></thead><tbody>${rows}</tbody></table><p>如對結果有疑問，請洽學校社團承辦人。</p><div class="actions"><button onclick="window.print()">列印／另存 PDF</button></div></main></body></html>`;
}
