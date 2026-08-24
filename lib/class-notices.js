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

function resultSection(kind, title, hint, entries) {
  const rows = entries.map(({ registration, choice }, rowIndex) => `<tr><td>${rowIndex + 1}</td><td class="student">${escapeHtml(registration.studentName)}</td><td><span class="day-badge">週${escapeHtml(choice.club.day)}</span></td><td class="club-name">${escapeHtml(choice.club.name)}</td><td><span class="result-chip">${escapeHtml(statusText(choice))}</span></td><td class="sign"></td></tr>`).join('');
  return `<section class="result-section ${kind}"><div class="section-title"><div><h2>${escapeHtml(title)} <span>${entries.length} 人次</span></h2><p>${escapeHtml(hint)}</p></div></div>${entries.length ? `<table><thead><tr><th>序號</th><th>學生姓名</th><th>上課日</th><th>社團名稱</th><th>審核結果</th><th>家長簽章</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="no-result">本班目前沒有此類結果</p>'}</section>`;
}

export function printableClassNotices(registrations, schoolName, logoUrl = '') {
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
    return `<section class="sheet" id="class-${index + 1}"><header><div class="identity">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="校徽">` : ''}<div><p>${escapeHtml(schoolName)}｜115學年度</p><h1>課後社團班級通知單</h1></div></div><div class="class-badge">${escapeHtml(group.grade)}<strong>${escapeHtml(group.className)}</strong></div></header><p class="intro">導師您好，以下依審核結果分區彙整，敬請協助轉知學生及家長。</p><div class="summary"><div class="accepted"><span>已錄取</span><strong>${accepted.length}</strong><small>人次</small></div><div class="attention"><span>候補／審核中</span><strong>${attention.length}</strong><small>人次</small></div><div class="rejected"><span>未錄取</span><strong>${rejected.length}</strong><small>人次</small></div></div>${resultBlocks}<footer><span>本班共 ${group.registrations.length} 位學生、${entries.length} 個報名選項</span><span>如有疑問請洽社團承辦人</span></footer></section>`;
  }).join('');

  const empty = '<section class="sheet empty-sheet"><h1>目前尚無班級通知單資料</h1><p>收到學生報名後，即可依年級與班級自動彙整。</p></section>';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>課後社團班級通知單</title><style>
    :root{color:#30402f;background:#eef5df;font-family:'Microsoft JhengHei',sans-serif}*{box-sizing:border-box}body{margin:0}.tools{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;justify-content:center;padding:12px;background:#315b2a;color:#fff;box-shadow:0 3px 12px #0002}.tools select,.tools button{font:inherit;border:0;border-radius:999px;padding:9px 14px}.tools button{background:#ffd54a;color:#3f4c1f;font-weight:800;cursor:pointer}.sheet{width:min(190mm,calc(100% - 32px));min-height:267mm;margin:18px auto;padding:12mm;background:#fff;border:2px solid #d4e2ad;border-radius:18px;box-shadow:0 14px 35px #35501e1c;break-after:page}.sheet header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:4px solid #78a63a;padding-bottom:10px}.identity{display:flex;align-items:center;gap:14px}.identity img{width:64px;height:64px;object-fit:contain;border-radius:50%}.identity p{margin:0;color:#687653}.identity h1{margin:2px 0;color:#315b2a;font-size:24px}.class-badge{display:grid;text-align:center;background:#edf5d8;border:2px dashed #93b657;border-radius:14px;padding:7px 18px;color:#66734f}.class-badge strong{font-size:21px;color:#315b2a}.intro{margin:13px 0 9px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}.summary div{display:flex;align-items:baseline;justify-content:center;gap:5px;border-radius:10px;padding:7px;border:1px solid}.summary span{font-weight:800}.summary strong{font-size:22px}.summary small{font-size:11px}.summary .accepted{color:#23613a;background:#e9f7ec;border-color:#9ed1aa}.summary .attention{color:#765800;background:#fff7d9;border-color:#e6ca6f}.summary .rejected{color:#873b3b;background:#fdeaea;border-color:#e1aaaa}.result-section{margin:11px 0;border:2px solid;border-radius:12px;overflow:hidden;break-inside:avoid}.section-title{padding:7px 11px}.section-title h2{display:flex;align-items:center;gap:7px;margin:0;font-size:17px}.section-title h2 span{font-size:11px;border-radius:99px;padding:2px 8px;background:#fff9}.section-title p{margin:1px 0 0;font-size:11px}.result-section.accepted{border-color:#7fbd8e}.result-section.accepted .section-title{color:#225f38;background:#e5f5e8}.result-section.attention{border-color:#dfbd4f}.result-section.attention .section-title{color:#725500;background:#fff4c9}.result-section.rejected{border-color:#d79595}.result-section.rejected .section-title{color:#823838;background:#fbe5e5}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #c7cfba;padding:6px 5px;text-align:center;vertical-align:middle;font-size:12px}th{background:#f4f6ee;color:#47533e;font-size:11px}th:first-child,td:first-child{width:7%}th:nth-child(2),td:nth-child(2){width:14%}th:nth-child(3),td:nth-child(3){width:11%}th:nth-child(5),td:nth-child(5){width:17%}th:nth-child(6),td:nth-child(6){width:15%}.student,.club-name{font-weight:800}.day-badge,.result-chip{display:inline-block;border-radius:99px;padding:2px 7px;font-weight:800}.day-badge{background:#edf2e3;color:#4b653e}.accepted .result-chip{background:#dff2e3;color:#24643b}.attention .result-chip{background:#fff0b8;color:#755500}.rejected .result-chip{background:#f8dada;color:#8a3434}.sign{height:31px}.no-result{margin:0;padding:8px 12px;color:#7b8373;font-size:12px;background:#fafbf7}footer{display:flex;justify-content:space-between;margin-top:12px;color:#6a745c;font-size:12px}.empty-sheet{text-align:center;padding-top:80px}@media(max-width:700px){.tools{flex-wrap:wrap}.sheet{width:calc(100% - 16px);padding:16px;min-height:0}.sheet header{align-items:flex-start}.identity img{width:52px;height:52px}.identity h1{font-size:20px}.summary{grid-template-columns:1fr}.summary div{justify-content:flex-start}th,td{font-size:11px;padding:5px 3px}.class-badge{padding:6px 10px}.result-section{overflow-x:auto}table{min-width:620px}}@media print{body{background:#fff}.tools{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;border:0;border-radius:0;box-shadow:none}.sheet.filtered-out{display:none}.sheet:last-child{break-after:auto}.result-section{break-inside:avoid}thead{display:table-header-group}}@page{size:A4 portrait;margin:11mm}
  </style></head><body><div class="tools"><label for="classFilter">顯示班級</label><select id="classFilter"><option value="all">全部班級</option>${options}</select><button onclick="window.print()">列印／另存 PDF</button></div>${groups.length ? sheets : empty}<script>const filter=document.getElementById('classFilter');filter.addEventListener('change',()=>document.querySelectorAll('.sheet').forEach(sheet=>sheet.classList.toggle('filtered-out',filter.value!=='all'&&sheet.id!==filter.value)));</script></body></html>`;
}
