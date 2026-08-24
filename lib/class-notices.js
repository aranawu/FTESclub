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
  const grade = String(registration.grade || '').replace('年級', '');
  const className = String(registration.className || '未設定').replace(/班$/, '');
  return `${grade}${className}`;
}

function startDate(choice) {
  const date = String(choice.club.period || '').split(/[～~]/)[0].trim() || '待公告';
  return date === '待公告' ? date : `${date}（${choice.club.day}）`;
}

function resultSection(kind, title, hint, entries) {
  if (kind === 'rejected') {
    const people = [...new Map(entries.map(({ registration }) => [registration.registrationNo || `${registration.studentName}-${registration.grade}-${registration.className}`, registration])).values()];
    const rows = people.map((registration, rowIndex) => `<tr><td>${rowIndex + 1}</td><td class="student">${escapeHtml(registration.studentName)}</td></tr>`).join('');
    return `<section class="result-section ${kind}"><div class="section-title"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(hint)}｜共 ${people.length} 人</p></div>${people.length ? `<table class="name-only"><thead><tr><th>序號</th><th>姓名</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="no-result">本班目前沒有此類結果</p>'}</section>`;
  }
  const showResult = kind === 'attention';
  const rows = entries.map(({ registration, choice }, rowIndex) => `<tr><td>${rowIndex + 1}</td><td>${escapeHtml(shortClass(registration))}</td><td class="student">${escapeHtml(registration.studentName)}</td><td class="club-name">${escapeHtml(choice.club.name)}</td><td>${escapeHtml(startDate(choice))}</td><td>${escapeHtml(choice.club.location || '待公告')}</td>${showResult ? `<td class="result-cell">${escapeHtml(statusText(choice))}</td>` : ''}</tr>`).join('');
  return `<section class="result-section ${kind}"><div class="section-title"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(hint)}｜共 ${entries.length} 人次</p></div>${entries.length ? `<table><thead><tr><th>序號</th><th>班級</th><th>姓名</th><th>社團</th><th>開始日期</th><th>地點</th>${showResult ? '<th>目前結果</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>` : '<p class="no-result">本班目前沒有此類結果</p>'}</section>`;
}

function choiceSummary(choice) {
  if (!choice) return '<span class="not-enrolled">未報名</span>';
  return `<strong>${escapeHtml(choice.club.name)}</strong><br><small>${escapeHtml(statusText(choice))}</small>`;
}

function studentOverview(registrations) {
  const rows = registrations.map((registration, rowIndex) => {
    const wednesday = registration.choices.find((choice) => choice.club.day === '三');
    const friday = registration.choices.find((choice) => choice.club.day === '五');
    return `<tr><td>${rowIndex + 1}</td><td>${escapeHtml(shortClass(registration))}</td><td class="student">${escapeHtml(registration.studentName)}</td><td>${choiceSummary(wednesday)}</td><td>${choiceSummary(friday)}</td></tr>`;
  }).join('');
  return `<section class="student-overview-section"><div class="section-title"><h2>每位學生報名彙整</h2><p>每位學生固定一列｜共 ${registrations.length} 人</p></div><table class="student-overview"><thead><tr><th>序號</th><th>班級</th><th>姓名</th><th>星期三報名／結果</th><th>星期五報名／結果</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

export function printableClassNotices(registrations, schoolName, stylesheetUrl = '/print.css') {
  const groups = groupRegistrations(registrations);
  const options = groups.map((group, index) => `<option value="class-${index + 1}">${escapeHtml(group.grade)} ${escapeHtml(group.className)}</option>`).join('');
  const sheets = groups.map((group, index) => {
    const entries = group.registrations.flatMap((registration) => registration.choices.map((choice) => ({ registration, choice })));
    const accepted = entries.filter(({ choice }) => choice.status === 'accepted');
    const attention = entries.filter(({ choice }) => choice.status === 'waitlist' || choice.status === 'pending');
    const rejected = entries.filter(({ choice }) => choice.status === 'rejected');
    const resultBlocks = [
      resultSection('accepted', '✓ 已錄取名單', '請依上課日準時參加社團活動。', accepted),
      resultSection('attention', '！候補／審核中', '候補序號與最新結果請以學校通知為準。', attention),
      resultSection('rejected', '× 未錄取名單', '本次未取得名額，敬請家長知悉。', rejected),
    ].join('');
    return `<section class="sheet" id="class-${index + 1}"><header><div><p>${escapeHtml(schoolName)}</p><h1>115學年度課後社團名單－${escapeHtml(group.grade)}${escapeHtml(group.className)}</h1></div></header><p class="intro">以下先依學生彙整全部報名，再依審核結果分表列出，敬請導師協助核對。</p><div class="summary"><div class="accepted"><span>錄取</span><strong>${accepted.length}</strong><small>人次</small></div><div class="attention"><span>候補／審核中</span><strong>${attention.length}</strong><small>人次</small></div><div class="rejected"><span>未錄取</span><strong>${rejected.length}</strong><small>人次</small></div></div>${studentOverview(group.registrations)}${resultBlocks}<footer><span>本班共 ${group.registrations.length} 位學生、${entries.length} 個報名選項</span><span>列印日期：${new Date().toLocaleDateString('zh-TW')}</span></footer></section>`;
  }).join('');

  const empty = '<section class="sheet empty-sheet"><h1>目前尚無班級通知單資料</h1><p>收到學生報名後，即可依年級與班級自動彙整。</p></section>';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>課後社團班級通知單</title><style>
    :root{color:#111;background:#eef1ea;font-family:'Microsoft JhengHei',sans-serif}*{box-sizing:border-box}body{margin:0}.tools{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;justify-content:center;padding:12px;background:#315b2a;color:#fff;box-shadow:0 3px 12px #0002}.tools select,.tools button{font:inherit;border:0;border-radius:999px;padding:9px 14px}.tools button{background:#ffd54a;color:#3f4c1f;font-weight:800;cursor:pointer}.sheet{width:min(195mm,calc(100% - 32px));min-height:272mm;margin:18px auto;padding:11mm;background:#fff;border:1px solid #c9c9c9;box-shadow:0 12px 30px #0001;break-after:page}.sheet>header{display:flex;align-items:center;justify-content:center;min-height:58px;text-align:center;border-bottom:0;padding-bottom:6px}.sheet>header p{margin:0;font-size:12px}.sheet>header h1{margin:2px 0;font-family:DFKai-SB,BiauKai,'Microsoft JhengHei',serif;font-size:24px;font-weight:700}.intro{text-align:center;margin:3px 0 8px;font-size:12px;color:#555}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}.summary div{display:flex;align-items:baseline;justify-content:center;gap:5px;padding:5px;border:1px solid #aaa}.summary span{font-weight:800}.summary strong{font-size:18px}.summary small{font-size:11px}.summary .accepted{background:#eef8ef}.summary .attention{background:#fff8dc}.summary .rejected{background:#fff0f0}.student-overview-section,.result-section{margin:10px 0;break-inside:avoid}.student-overview-section .section-title{background:#edf3e8;padding:4px 6px}.section-title{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:2px solid #111;padding:3px 1px}.section-title h2{margin:0;font-size:16px}.section-title p{margin:0;font-size:11px;color:#555}.accepted .section-title h2{color:#205b35}.attention .section-title h2{color:#725500}.rejected .section-title h2{color:#813535}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:0}th,td{border:1px solid #111;padding:6px 4px;text-align:center;vertical-align:middle;font-size:12px;height:29px}th{background:#f2f2f2;font-weight:800}th:first-child,td:first-child{width:7%}th:nth-child(2),td:nth-child(2){width:10%}th:nth-child(3),td:nth-child(3){width:12%}th:nth-child(4),td:nth-child(4){width:31%}th:nth-child(5),td:nth-child(5){width:17%}th:nth-child(6),td:nth-child(6){width:15%}.student-overview th:first-child,.student-overview td:first-child{width:7%}.student-overview th:nth-child(2),.student-overview td:nth-child(2){width:10%}.student-overview th:nth-child(3),.student-overview td:nth-child(3){width:14%}.student-overview th:nth-child(4),.student-overview td:nth-child(4),.student-overview th:nth-child(5),.student-overview td:nth-child(5){width:34.5%}.student-overview td strong{font-weight:700}.student-overview td small{font-size:10px;color:#4f5d46}.not-enrolled{color:#888}.attention th:nth-child(4),.attention td:nth-child(4){width:26%}.attention th:last-child,.attention td:last-child{width:14%}.name-only{width:55%;margin:0 auto}.name-only th:first-child,.name-only td:first-child{width:28%}.name-only th:nth-child(2),.name-only td:nth-child(2){width:auto}.student,.club-name{font-weight:500}.result-cell{font-weight:800}.no-result{margin:0;border:1px solid #111;border-top:0;padding:7px 10px;color:#666;text-align:center;font-size:12px}footer{display:flex;justify-content:space-between;margin-top:10px;color:#555;font-size:11px}.empty-sheet{text-align:center;padding-top:80px}@media(max-width:700px){.tools{flex-wrap:wrap}.sheet{width:calc(100% - 12px);padding:12px;min-height:0}.sheet>header h1{font-size:18px}.summary{grid-template-columns:1fr}.summary div{justify-content:flex-start}.student-overview-section,.result-section{overflow-x:auto}.section-title{align-items:flex-start;flex-direction:column}table{min-width:650px}.name-only{min-width:300px}th,td{font-size:11px;padding:5px 3px}}@media print{body{background:#fff}.tools{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;border:0;box-shadow:none}.sheet.filtered-out{display:none}.sheet:last-child{break-after:auto}.student-overview-section,.result-section{break-inside:avoid}thead{display:table-header-group}}@page{size:A4 portrait;margin:10mm}
  </style><link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head><body class="class-notice-page"><div class="tools"><label for="classFilter">顯示班級</label><select id="classFilter"><option value="all">全部班級</option>${options}</select><button onclick="window.print()">列印／另存 PDF</button></div>${groups.length ? sheets : empty}<script>const filter=document.getElementById('classFilter');filter.addEventListener('change',()=>document.querySelectorAll('.sheet').forEach(sheet=>sheet.classList.toggle('filtered-out',filter.value!=='all'&&sheet.id!==filter.value)));</script></body></html>`;
}
