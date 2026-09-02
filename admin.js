const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const groupsElement = document.getElementById('adminGroups');
const adminMessage = document.getElementById('adminMessage');
const manualRegistrationPanel = document.getElementById('manualRegistrationPanel');
const manualRegistrationForm = document.getElementById('manualRegistrationForm');
const manualClubChoices = document.getElementById('manualClubChoices');
const manualRegistrationMessage = document.getElementById('manualRegistrationMessage');
let adminSession = sessionStorage.getItem('clubAdminSession') || '';
let clubs = [];
let registrations = [];
const selectedNoticeNos = new Set();
const classByGrade = { '1年級': '一年忠班', '2年級': '二年忠班', '3年級': '三年忠班', '4年級': '四年忠班', '5年級': '五年忠班', '6年級': '六年忠班' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function statusText(status, waitlistNo) {
  if (status === 'accepted') return '錄取';
  if (status === 'waitlist') return `候補${waitlistNo ? `第 ${waitlistNo} 號` : ''}`;
  if (status === 'rejected') return '未錄取';
  return '待審核';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { accept: 'application/json', authorization: `Bearer ${adminSession}`, ...(options.headers || {}) },
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data.error || data || '系統無法處理。');
  return data;
}

function setMessage(text, type = '') {
  adminMessage.className = `form-message ${type}`;
  adminMessage.textContent = text;
}

function setManualMessage(text, type = '') {
  manualRegistrationMessage.className = `form-message ${type}`;
  manualRegistrationMessage.textContent = text;
}

function capacityText(capacity) {
  return capacity === null ? '不限額' : `上限 ${capacity} 人`;
}

function syncManualGrade() {
  const grade = document.getElementById('manualGrade').value;
  document.getElementById('manualClassName').value = classByGrade[grade] || '';
}

function renderManualChoices() {
  const grade = document.getElementById('manualGrade').value;
  const byDay = { 三: clubs.filter((club) => club.day === '三'), 五: clubs.filter((club) => club.day === '五') };
  manualClubChoices.innerHTML = Object.entries(byDay).map(([day, dayClubs]) => `
    <fieldset class="choice-group"><legend>星期${day}<span>最多選 1 個</span></legend>
      <label class="club-option"><input type="radio" name="manual-club-${day}" value=""><span class="club-copy"><strong>本日不選擇</strong><small>保留空白</small></span></label>
      ${dayClubs.map((club) => {
        const eligible = !grade || club.grades.includes(grade);
        return `<label class="club-option ${eligible ? '' : 'disabled'}"><input type="radio" name="manual-club-${day}" value="${escapeHtml(club.id)}" ${eligible ? '' : 'disabled'}><span class="club-copy"><strong>${escapeHtml(club.name)}</strong><small>${escapeHtml(club.time)} · ${capacityText(club.capacity)}</small>${eligible ? '' : '<em>此年級不符</em>'}</span></label>`;
      }).join('')}
    </fieldset>`).join('');
}

function toggleManualRegistration(show) {
  manualRegistrationPanel.classList.toggle('hidden', !show);
  const toggleButton = document.getElementById('toggleManualRegistration');
  toggleButton.setAttribute('aria-expanded', String(show));
  if (show) {
    syncManualGrade();
    renderManualChoices();
    document.getElementById('manualStudentName').focus();
    manualRegistrationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function loadData() {
  setMessage('正在載入報名資料…');
  const [clubData, registrationData] = await Promise.all([
    fetch('/api/clubs').then((response) => response.json()),
    api('/api/admin/registrations'),
  ]);
  clubs = clubData.clubs;
  registrations = registrationData.registrations;
  if (!manualClubChoices.dataset.ready) {
    renderManualChoices();
    manualClubChoices.dataset.ready = 'true';
  }
  const available = new Set(registrations.map((registration) => registration.registrationNo));
  [...selectedNoticeNos].forEach((registrationNo) => { if (!available.has(registrationNo)) selectedNoticeNos.delete(registrationNo); });
  renderAdmin();
  setMessage('');
}

function renderAdmin() {
  const choices = registrations.flatMap((registration) => registration.choices);
  document.getElementById('summaryTitle').textContent = `${registrations.length} 位學生、${choices.length} 個社團選項`;
  document.getElementById('summaryText').textContent = `待審核 ${choices.filter((choice) => choice.status === 'pending').length} · 錄取 ${choices.filter((choice) => choice.status === 'accepted').length} · 候補 ${choices.filter((choice) => choice.status === 'waitlist').length} · 未錄取 ${choices.filter((choice) => choice.status === 'rejected').length}`;
  groupsElement.innerHTML = clubs.map((club) => {
    const applicants = registrations.flatMap((registration) => registration.choices.filter((choice) => choice.clubId === club.id).map((choice) => ({ registration, choice })));
    const capacity = club.capacity === null ? '不限額' : `上限 ${club.capacity} 人`;
    const accepted = applicants.filter(({ choice }) => choice.status === 'accepted').length;
    const capacityState = club.capacity === null ? `${capacity} · 已錄取 ${accepted}` : `${capacity} · 已錄取 ${accepted}/${club.capacity}`;
    return `<section class="card admin-group"><div class="group-heading"><div><p class="eyebrow dark">星期${club.day}</p><h2>${escapeHtml(club.name)}</h2><p class="helper">${escapeHtml(club.time)} · ${escapeHtml(club.period)}</p></div><span class="capacity-unlimited">${capacityState}</span></div><div class="applicant-list">${applicants.length ? applicants.map(({ registration, choice }) => applicantHtml(registration, choice)).join('') : '<p class="empty-state">目前沒有報名者。</p>'}</div></section>`;
  }).join('');

  document.querySelectorAll('[data-status]').forEach((select) => select.addEventListener('change', () => {
    const waitlistInput = select.closest('.applicant-actions').querySelector('[data-waitlist]');
    waitlistInput.disabled = select.value !== 'waitlist';
    waitlistInput.classList.toggle('hidden', select.value !== 'waitlist');
  }));
  document.querySelectorAll('[data-save]').forEach((button) => button.addEventListener('click', () => saveDecision(button)));
  document.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => printNotice(button.dataset.print)));
  document.querySelectorAll('[data-select-notice]').forEach((checkbox) => checkbox.addEventListener('change', () => setNoticeSelection(checkbox.value, checkbox.checked)));
  updateNoticeSelectionControls();
}

function applicantHtml(registration, choice) {
  const selected = (value) => choice.status === value ? 'selected' : '';
  const waitlistHidden = choice.status === 'waitlist' ? '' : 'hidden';
  const noticeChecked = selectedNoticeNos.has(registration.registrationNo) ? 'checked' : '';
  const phone = registration.guardianPhone || '未提供電話';
  const email = registration.guardianEmail || '未提供信箱';
  return `<div class="applicant-row" data-row="${escapeHtml(registration.registrationNo)}-${escapeHtml(choice.clubId)}">
    <div class="applicant-main"><label class="notice-select"><input data-select-notice type="checkbox" value="${escapeHtml(registration.registrationNo)}" ${noticeChecked}>選取個人通知單</label><strong>${escapeHtml(registration.studentName)}</strong><span>${escapeHtml(registration.className || '班級未設定')} · ${escapeHtml(registration.studentIdMasked)} · ${escapeHtml(phone)}</span><small>${escapeHtml(email)} · 報名編號 ${escapeHtml(registration.registrationNo)}</small></div>
    <div class="applicant-actions">
      <select data-status aria-label="${escapeHtml(registration.studentName)}審核結果"><option value="pending" ${selected('pending')}>待審核</option><option value="accepted" ${selected('accepted')}>錄取</option><option value="waitlist" ${selected('waitlist')}>候補</option><option value="rejected" ${selected('rejected')}>未錄取</option></select>
      <input class="candidate-input ${waitlistHidden}" data-waitlist type="number" min="1" value="${escapeHtml(choice.waitlistNo || '')}" placeholder="候補序號" ${choice.status === 'waitlist' ? '' : 'disabled'}>
      <button class="primary-button compact-button" data-save data-registration="${escapeHtml(registration.registrationNo)}" data-club="${escapeHtml(choice.clubId)}">儲存審核結果</button>
      <button class="link-button" data-print="${escapeHtml(registration.registrationNo)}">個別通知單</button>
    </div>
    <small class="email-state">目前：${escapeHtml(statusText(choice.status, choice.waitlistNo))}${choice.resultEmailSentAt ? ` · 已寄信 ${new Date(choice.resultEmailSentAt).toLocaleString('zh-TW')}` : ''}</small>
  </div>`;
}

function setNoticeSelection(registrationNo, checked) {
  if (checked) selectedNoticeNos.add(registrationNo);
  else selectedNoticeNos.delete(registrationNo);
  document.querySelectorAll('[data-select-notice]').forEach((checkbox) => {
    if (checkbox.value === registrationNo) checkbox.checked = checked;
  });
  updateNoticeSelectionControls();
}

function updateNoticeSelectionControls() {
  const count = selectedNoticeNos.size;
  const batchButton = document.getElementById('batchNotices');
  batchButton.disabled = count === 0;
  batchButton.textContent = `列印個人通知單（${count}）`;
  document.getElementById('selectAllNotices').textContent = registrations.length > 0 && count === registrations.length ? '清除全選' : '全選學生';
}

async function saveDecision(button) {
  const row = button.closest('.applicant-row');
  const status = row.querySelector('[data-status]').value;
  const waitlistNo = row.querySelector('[data-waitlist]').value;
  button.disabled = true;
  button.textContent = '處理中…';
  try {
    const data = await api('/api/admin/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ registrationNo: button.dataset.registration, clubId: button.dataset.club, status, waitlistNo }),
    });
    if (data.emailSent) setMessage('星期三與星期五結果已統整，並寄送一封結果信給家長。', 'success');
    else if (data.emailReason === 'REVIEW_INCOMPLETE') setMessage('審核已儲存；待該生所有社團結果都完成後，系統才會寄送一封統整結果信。', 'success');
    else if (data.emailReason === 'UNCHANGED') setMessage('審核結果沒有變更，因此未重複寄信。', 'success');
    else if (data.emailReason === 'NO_EMAIL') setMessage('審核結果已儲存；此筆後台報名未提供信箱，請列印紙本通知單。', 'success');
    else setMessage('結果已儲存，但寄信服務未完成設定或寄送失敗。', 'warning-text');
    await loadData();
  } catch (error) {
    setMessage(error.message, 'error');
    button.disabled = false;
    button.textContent = '儲存審核結果';
  }
}

async function submitManualRegistration(event) {
  event.preventDefault();
  setManualMessage('');
  const studentName = document.getElementById('manualStudentName').value.trim();
  const grade = document.getElementById('manualGrade').value;
  const className = document.getElementById('manualClassName').value;
  const guardianPhone = document.getElementById('manualGuardianPhone').value.trim();
  const guardianEmail = document.getElementById('manualGuardianEmail').value.trim().toLowerCase();
  const selected = [...manualRegistrationForm.querySelectorAll('input[name^="manual-club-"]:checked')].map((input) => input.value).filter(Boolean);
  const submitButton = document.getElementById('submitManualRegistration');

  if (!studentName || !grade || !className) return setManualMessage('請填寫學生姓名並選擇年級。', 'error');
  if (guardianEmail && !document.getElementById('manualGuardianEmail').checkValidity()) return setManualMessage('家長電子郵件格式不正確。', 'error');
  if (selected.length < 1) return setManualMessage('請至少選擇一個社團。', 'error');

  submitButton.disabled = true;
  submitButton.textContent = '新增中…';
  try {
    const data = await api('/api/admin/registrations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentName, grade, guardianPhone, guardianEmail, clubs: selected }),
    });
    manualRegistrationForm.reset();
    syncManualGrade();
    renderManualChoices();
    await loadData();
    const emailText = data.emailSent ? '，收件通知已寄到家長信箱' : data.emailReason === 'NO_EMAIL' ? '；未填信箱，之後請使用紙本通知單' : '；報名已保存，但收件信未寄出';
    setManualMessage(`已新增 ${studentName} 的報名（${data.registrationNo}）${emailText}。`, data.emailSent || data.emailReason === 'NO_EMAIL' ? 'success' : 'warning-text');
  } catch (error) {
    setManualMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '新增報名';
  }
}

async function printNotice(registrationNo) {
  return openPrintable(`/api/admin/notice?registrationNo=${encodeURIComponent(registrationNo)}`, '無法產生個別通知單。');
}

async function printSelectedNotices() {
  if (!selectedNoticeNos.size) return setMessage('請先勾選要列印的學生。', 'error');
  return openPrintable('/api/admin/notices', '無法產生批次個人通知單。', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ registrationNos: [...selectedNoticeNos] }),
  });
}

function wirePrintableWindow(printWindow) {
  const printDocument = printWindow.document;
  const printButton = printDocument.querySelector('[data-print-button]');
  if (printButton) printButton.addEventListener('click', () => {
    printWindow.focus();
    printWindow.print();
  });
  const filter = printDocument.querySelector('[data-sheet-filter]');
  if (filter) filter.addEventListener('change', () => {
    printDocument.querySelectorAll('[data-print-sheet]').forEach((sheet) => {
      sheet.classList.toggle('filtered-out', filter.value !== 'all' && sheet.id !== filter.value);
    });
  });
}

async function openPrintable(path, fallbackMessage, options = {}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    setMessage('瀏覽器阻擋了列印視窗，請允許本站開啟彈出式視窗後再試一次。', 'error');
    return;
  }
  printWindow.document.open();
  printWindow.document.write('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>正在產生通知單</title></head><body style="font-family:Microsoft JhengHei,sans-serif;padding:40px;color:#315d2d"><p>正在產生通知單，請稍候…</p></body></html>');
  printWindow.document.close();
  try {
    const response = await fetch(path, { ...options, headers: { authorization: `Bearer ${adminSession}`, ...(options.headers || {}) } });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || fallbackMessage); }
    const html = await response.text();
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    wirePrintableWindow(printWindow);
    printWindow.opener = null;
    setMessage('通知單已在新分頁開啟，請按「列印／另存 PDF」。', 'success');
  } catch (error) {
    printWindow.close();
    setMessage(error.message, 'error');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const loginMessage = document.getElementById('loginMessage');
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '登入失敗。');
    adminSession = data.token;
    sessionStorage.setItem('clubAdminSession', adminSession);
    document.getElementById('adminPassword').value = '';
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    await loadData();
  } catch (error) {
    loginMessage.className = 'form-message error';
    loginMessage.textContent = error.message;
  }
});

document.getElementById('refreshData').addEventListener('click', () => loadData().catch((error) => setMessage(error.message, 'error')));
document.getElementById('toggleManualRegistration').addEventListener('click', () => toggleManualRegistration(manualRegistrationPanel.classList.contains('hidden')));
document.getElementById('closeManualRegistration').addEventListener('click', () => toggleManualRegistration(false));
document.getElementById('manualGrade').addEventListener('change', () => { syncManualGrade(); renderManualChoices(); });
manualRegistrationForm.addEventListener('submit', submitManualRegistration);
manualRegistrationForm.addEventListener('reset', () => setTimeout(() => { syncManualGrade(); renderManualChoices(); setManualMessage(''); }, 0));
document.getElementById('classNotices').addEventListener('click', () => openPrintable('/api/admin/class-notices', '無法產生班級通知單。'));
document.getElementById('clubRosters').addEventListener('click', () => openPrintable('/api/admin/club-rosters', '無法產生社團名單。'));
document.getElementById('batchNotices').addEventListener('click', printSelectedNotices);
document.getElementById('selectAllNotices').addEventListener('click', () => {
  if (registrations.length > 0 && selectedNoticeNos.size === registrations.length) selectedNoticeNos.clear();
  else registrations.forEach((registration) => selectedNoticeNos.add(registration.registrationNo));
  document.querySelectorAll('[data-select-notice]').forEach((checkbox) => { checkbox.checked = selectedNoticeNos.has(checkbox.value); });
  updateNoticeSelectionControls();
});
document.getElementById('logout').addEventListener('click', () => { sessionStorage.removeItem('clubAdminSession'); location.reload(); });
document.getElementById('exportCsv').addEventListener('click', () => {
  const header = ['報名編號', '學生姓名', '年級', '班級', '身分證遮罩', '家長電話', '家長信箱', '社團', '結果', '候補序號', '報名時間'];
  const rows = registrations.flatMap((registration) => registration.choices.map((choice) => [registration.registrationNo, registration.studentName, registration.grade, registration.className, registration.studentIdMasked, registration.guardianPhone, registration.guardianEmail, choice.club.name, statusText(choice.status, choice.waitlistNo), choice.waitlistNo || '', registration.submittedAt]));
  const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = '社團報名清單.csv'; link.click(); URL.revokeObjectURL(url);
});

if (location.protocol === 'file:') {
  document.getElementById('loginMessage').className = 'form-message error';
  document.getElementById('loginMessage').textContent = '管理頁需要後端 API，請從正式部署網址開啟。';
} else if (adminSession) {
  loginPanel.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  loadData().catch(() => { sessionStorage.removeItem('clubAdminSession'); loginPanel.classList.remove('hidden'); adminPanel.classList.add('hidden'); });
}
