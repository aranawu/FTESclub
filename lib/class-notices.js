import { statusText } from './email.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function groupRegistrations(registrations) {
  const groups = new Map();
  for (const registration of registrations) {
    const className = registration.className || '班級未設定';
    const key = `${registration.grade}\u0000${className}`;
    const group = groups.get(key) || { grade: registration.grade, className, registrations: [] };
    group.registrations.push(registration);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => Number.parseInt(a.grade, 10) - Number.parseInt(b.grade, 10) || a.className.localeCompare(b.className, 'zh-Hant'));
}

function shortClass(registration) {
  return String(registration.className || registration.grade || '班級未設定');
}

function startDate(choice) {
  const date = String(choice.club.period || '').split(/[～~]/)[0].trim() || '待公告';
  return date === '待公告' ? date : `${date}（${choice.club.day}）`;
}

function statusClass(status) {
  if (status === 'accepted') return 'accepted';
  if (status === 'waitlist') return 'waitlist';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function choiceCells(registration, day) {
  const choice = registration.choices.find((item) => item.club.day === day);
  if (!choice) return '<td class="club-detail empty-choice"></td><td class="result-cell empty-choice"></td><td class="location-cell empty-choice"></td>';
  return `<td class="club-detail"><strong>${escapeHtml(choice.club.name)}</strong><small>開始：${escapeHtml(startDate(choice))}</small></td><td class="result-cell"><span class="status-chip ${statusClass(choice.status)}">${escapeHtml(statusText(choice))}</span></td><td class="location-cell">${escapeHtml(choice.club.location || '待公告')}</td>`;
}

function studentTable(registrations) {
  const sorted = [...registrations].sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-Hant'));
  const rows = sorted.map((registration, rowIndex) => `<tr><td>${rowIndex + 1}</td><td>${escapeHtml(shortClass(registration))}</td><td class="student">${escapeHtml(registration.studentName)}</td>${choiceCells(registration, '三')}${choiceCells(registration, '五')}</tr>`).join('');
  return `<table class="class-summary-table"><colgroup><col class="col-sequence"><col class="col-class"><col class="col-student"><col class="col-club"><col class="col-result"><col class="col-location"><col class="col-club"><col class="col-result"><col class="col-location"></colgroup><thead><tr><th rowspan="2">序號</th><th rowspan="2">班級</th><th rowspan="2">姓名</th><th class="day-heading wednesday" colspan="3">星期三</th><th class="day-heading friday" colspan="3">星期五</th></tr><tr><th>社團／開始日期</th><th>結果</th><th>地點</th><th>社團／開始日期</th><th>結果</th><th>地點</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function resultCounts(registrations) {
  const choices = registrations.flatMap((registration) => registration.choices);
  return {
    choices: choices.length,
    accepted: choices.filter((choice) => choice.status === 'accepted').length,
    attention: choices.filter((choice) => choice.status === 'pending' || choice.status === 'waitlist').length,
    rejected: choices.filter((choice) => choice.status === 'rejected').length,
  };
}

export function printableClassNotices(registrations, schoolName, stylesheetUrl = '/print.css') {
  const groups = groupRegistrations(registrations);
  const options = groups.map((group, index) => `<option value="class-${index + 1}"${index === 0 ? ' selected' : ''}>${escapeHtml(group.className)}</option>`).join('');
  const sheets = groups.map((group, index) => {
    const counts = resultCounts(group.registrations);
    return `<section class="sheet class-sheet" id="class-${index + 1}" data-print-sheet><header><div><p>${escapeHtml(schoolName)}｜115學年度</p><h1>課後社團班級通知單－${escapeHtml(group.className)}</h1></div></header><p class="intro">每位學生固定一列，星期三與星期五的報名、審核結果及上課地點均彙整如下。</p><div class="class-summary"><span class="accepted">錄取 <strong>${counts.accepted}</strong> 人次</span><span class="attention">候補／審核中 <strong>${counts.attention}</strong> 人次</span><span class="rejected">未錄取 <strong>${counts.rejected}</strong> 人次</span></div>${studentTable(group.registrations)}<footer><span>本班共 ${group.registrations.length} 位學生、${counts.choices} 個報名選項</span><span>列印日期：${new Date().toLocaleDateString('zh-TW')}</span></footer></section>`;
  }).join('');

  const empty = '<section class="sheet empty-sheet"><h1>目前尚無班級通知單資料</h1><p>收到學生報名後，即可依年級與班級自動彙整。</p></section>';
  const tools = groups.length
    ? `<label for="classFilter">選擇班級</label><select id="classFilter" data-sheet-filter>${options}</select><button type="button" data-print-current>只列印目前班級</button><button type="button" data-print-all>列印全部班級</button>`
    : '<span>目前沒有可列印的班級</span>';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>課後社團班級通知單</title><style>
    :root{color:#263623;background:#eef1ea;font-family:'Microsoft JhengHei',sans-serif}*{box-sizing:border-box}body{margin:0}.tools{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;justify-content:center;padding:12px;background:#315b2a;color:#fff;box-shadow:0 3px 12px #0002}.tools label{font-weight:800}.tools select,.tools button{font:inherit;border:0;border-radius:999px;padding:9px 14px}.tools button{background:#ffd54a;color:#3f4c1f;font-weight:800;cursor:pointer}.sheet{width:min(277mm,calc(100% - 32px));min-height:190mm;margin:18px auto;padding:9mm;background:#fff;border:1px solid #c9c9c9;box-shadow:0 12px 30px #0001;break-after:page}.sheet>header{text-align:center;border-bottom:3px solid #6f9f49;padding-bottom:5px}.sheet>header p{margin:0;font-size:11px}.sheet>header h1{margin:2px 0;font-size:23px}.intro{text-align:center;margin:6px 0 8px;font-size:12px;color:#55624f}.class-summary{display:flex;justify-content:center;gap:8px;margin-bottom:8px}.class-summary span{padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}.class-summary .accepted{background:#e8f4e4;color:#27633b}.class-summary .attention{background:#fff2bf;color:#755a00}.class-summary .rejected{background:#f9e1e1;color:#873b3b}.class-summary-table{width:100%;border-collapse:collapse;table-layout:fixed}.class-summary-table th,.class-summary-table td{height:31px;padding:5px 4px;text-align:center;vertical-align:middle;border:1px solid #829276;font-size:11px}.class-summary-table th{color:#315d2d;background:#edf4df;font-weight:800}.class-summary-table .day-heading.wednesday{background:#e3f2d7}.class-summary-table .day-heading.friday{background:#fff0bd}.class-summary-table th:nth-child(1){width:4%}.class-summary-table th:nth-child(2){width:9%}.class-summary-table th:nth-child(3){width:9%}.student{font-weight:700}.club-detail strong,.club-detail small{display:block}.club-detail small{margin-top:2px;color:#63715c;font-size:9px}.status-chip{display:inline-block;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:800}.status-chip.accepted{color:#fff;background:#4c8a49}.status-chip.pending,.status-chip.waitlist{color:#654f00;background:#ffe17a}.status-chip.rejected{color:#fff;background:#bc6262}.location-cell{font-weight:700}.empty-choice{background:#fafaf7}footer{display:flex;justify-content:space-between;margin-top:8px;color:#596454;font-size:10px}.empty-sheet{text-align:center;padding-top:70px}@media(max-width:800px){.tools{flex-wrap:wrap}.sheet{width:calc(100% - 12px);padding:12px;min-height:0;overflow-x:auto}.sheet>header h1{font-size:18px}.class-summary-table{min-width:900px}}@media print{body{background:#fff}.tools{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;border:0;box-shadow:none;break-after:page}.sheet.filtered-out{display:none}.sheet:last-child{break-after:auto}.class-summary-table thead{display:table-header-group}.class-summary-table tr{break-inside:avoid}}@page{size:A4 landscape;margin:8mm}
  </style><link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head><body class="class-notice-page"><div class="tools">${tools}</div>${groups.length ? sheets : empty}</body></html>`;
}
