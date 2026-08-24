import { statusText } from './email.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function choiceText(choice) {
  if (!choice) return '<span class="empty">未報名</span>';
  return `<strong>${escapeHtml(choice.club.name)}</strong><br><span class="status">${escapeHtml(statusText(choice))}</span>`;
}

function groupRegistrations(registrations) {
  const groups = new Map();
  for (const registration of registrations) {
    const key = `${registration.grade}\u0000${registration.className}`;
    const group = groups.get(key) || { grade: registration.grade, className: registration.className, registrations: [] };
    group.registrations.push(registration);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => Number.parseInt(a.grade, 10) - Number.parseInt(b.grade, 10) || a.className.localeCompare(b.className, 'zh-Hant'));
}

export function printableClassNotices(registrations, schoolName, logoUrl = '') {
  const groups = groupRegistrations(registrations);
  const options = groups.map((group, index) => `<option value="class-${index + 1}">${escapeHtml(group.grade)} ${escapeHtml(group.className)}</option>`).join('');
  const sheets = groups.map((group, index) => {
    const rows = group.registrations.map((registration, studentIndex) => {
      const wednesday = registration.choices.find((choice) => choice.club.day === '三');
      const friday = registration.choices.find((choice) => choice.club.day === '五');
      return `<tr><td>${studentIndex + 1}</td><td class="student">${escapeHtml(registration.studentName)}</td><td>${choiceText(wednesday)}</td><td>${choiceText(friday)}</td><td class="sign"></td></tr>`;
    }).join('');
    return `<section class="sheet" id="class-${index + 1}"><header><div class="identity">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="校徽">` : ''}<div><p>${escapeHtml(schoolName)}｜115學年度</p><h1>課後社團班級通知單</h1></div></div><div class="class-badge">${escapeHtml(group.grade)}<strong>${escapeHtml(group.className)}</strong></div></header><p class="intro">導師您好，以下為本班學生課後社團報名與審核結果，敬請協助轉知學生及家長。</p><table><thead><tr><th>序號</th><th>學生姓名</th><th>星期三社團／結果</th><th>星期五社團／結果</th><th>家長簽章</th></tr></thead><tbody>${rows}</tbody></table><footer><span>本班共 ${group.registrations.length} 位學生完成報名</span><span>如有疑問請洽社團承辦人</span></footer></section>`;
  }).join('');

  const empty = '<section class="sheet empty-sheet"><h1>目前尚無班級通知單資料</h1><p>收到學生報名後，即可依年級與班級自動彙整。</p></section>';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>課後社團班級通知單</title><style>
    :root{color:#30402f;background:#eef5df;font-family:'Microsoft JhengHei',sans-serif}*{box-sizing:border-box}body{margin:0}.tools{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;justify-content:center;padding:12px;background:#315b2a;color:#fff;box-shadow:0 3px 12px #0002}.tools select,.tools button{font:inherit;border:0;border-radius:999px;padding:9px 14px}.tools button{background:#ffd54a;color:#3f4c1f;font-weight:800;cursor:pointer}.sheet{width:min(190mm,calc(100% - 32px));min-height:267mm;margin:18px auto;padding:14mm;background:#fff;border:2px solid #d4e2ad;border-radius:18px;box-shadow:0 14px 35px #35501e1c;break-after:page}.sheet header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:4px solid #78a63a;padding-bottom:12px}.identity{display:flex;align-items:center;gap:14px}.identity img{width:70px;height:70px;object-fit:contain;border-radius:50%}.identity p{margin:0;color:#687653}.identity h1{margin:2px 0;color:#315b2a;font-size:25px}.class-badge{display:grid;text-align:center;background:#edf5d8;border:2px dashed #93b657;border-radius:14px;padding:8px 18px;color:#66734f}.class-badge strong{font-size:22px;color:#315b2a}.intro{margin:18px 0 12px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #9dad83;padding:9px 7px;text-align:center;vertical-align:middle}th{background:#eaf3d5;color:#315b2a}th:first-child,td:first-child{width:8%}th:nth-child(2),td:nth-child(2){width:16%}.student{font-weight:800}.status{font-weight:800;color:#39713c}.empty{color:#8b927c}.sign{height:48px}footer{display:flex;justify-content:space-between;margin-top:14px;color:#6a745c;font-size:13px}.empty-sheet{text-align:center;padding-top:80px}@media(max-width:700px){.tools{flex-wrap:wrap}.sheet{width:calc(100% - 16px);padding:16px;min-height:0}.sheet header{align-items:flex-start}.identity img{width:52px;height:52px}.identity h1{font-size:20px}th,td{font-size:12px;padding:6px 4px}.class-badge{padding:6px 10px}}@media print{body{background:#fff}.tools{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;border:0;border-radius:0;box-shadow:none}.sheet.filtered-out{display:none}.sheet:last-child{break-after:auto}}@page{size:A4 portrait;margin:13mm}
  </style></head><body><div class="tools"><label for="classFilter">顯示班級</label><select id="classFilter"><option value="all">全部班級</option>${options}</select><button onclick="window.print()">列印／另存 PDF</button></div>${groups.length ? sheets : empty}<script>const filter=document.getElementById('classFilter');filter.addEventListener('change',()=>document.querySelectorAll('.sheet').forEach(sheet=>sheet.classList.toggle('filtered-out',filter.value!=='all'&&sheet.id!==filter.value)));</script></body></html>`;
}
