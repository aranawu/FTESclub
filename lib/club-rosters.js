import { CLUBS } from './clubs.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function startDate(club) {
  return String(club.period || '').split(/[～~]/)[0].trim() || '待公告';
}

function acceptedMembers(registrations, clubId) {
  return registrations
    .filter((registration) => registration.choices.some((choice) => choice.clubId === clubId && choice.status === 'accepted'))
    .sort((a, b) => Number.parseInt(a.grade, 10) - Number.parseInt(b.grade, 10)
      || String(a.className).localeCompare(String(b.className), 'zh-Hant')
      || String(a.studentName).localeCompare(String(b.studentName), 'zh-Hant'));
}

export function printableClubRosters(registrations, schoolName, stylesheetUrl = '/print.css') {
  const options = CLUBS.map((club, index) => `<option value="club-${index + 1}">${escapeHtml(club.name)}</option>`).join('');
  const sheets = CLUBS.map((club, index) => {
    const members = acceptedMembers(registrations, club.id);
    const rows = members.map((registration, rowIndex) => `<tr><td>${rowIndex + 1}</td><td>${escapeHtml(registration.className || registration.grade || '班級未設定')}</td><td class="student">${escapeHtml(registration.studentName)}</td><td>${escapeHtml(club.time)}</td><td>${escapeHtml(startDate(club))}</td><td>${escapeHtml(club.location || '待公告')}</td></tr>`).join('');
    const capacity = club.capacity === null ? '不限額' : `上限 ${club.capacity} 人`;
    return `<section class="sheet club-sheet" id="club-${index + 1}"><header><p>${escapeHtml(schoolName)}</p><h1>115學年度課後社團名單－${escapeHtml(club.name)}</h1><div class="club-meta"><span>星期${escapeHtml(club.day)}</span><span>${escapeHtml(club.time)}</span><span>${escapeHtml(club.period)}</span><span>${escapeHtml(club.location || '待公告')}</span></div></header><div class="roster-summary"><strong>錄取 ${members.length} 人</strong><span>${escapeHtml(capacity)}</span></div>${members.length ? `<table><thead><tr><th>序號</th><th>班級</th><th>姓名</th><th>上課時間</th><th>開始日期</th><th>地點</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="no-result">目前沒有錄取學生</p>'}<footer><span>本名單僅列已錄取學生</span><span>列印日期：${new Date().toLocaleDateString('zh-TW')}</span></footer></section>`;
  }).join('');

  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>課後社團名單</title><link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head><body class="club-roster-page"><div class="tools"><label for="clubFilter">顯示社團</label><select id="clubFilter"><option value="all">全部社團</option>${options}</select><button type="button" onclick="window.print()">列印／另存 PDF</button></div>${sheets}<script>const filter=document.getElementById('clubFilter');filter.addEventListener('change',()=>document.querySelectorAll('.club-sheet').forEach(sheet=>sheet.classList.toggle('filtered-out',filter.value!=='all'&&sheet.id!==filter.value)));</script></body></html>`;
}
