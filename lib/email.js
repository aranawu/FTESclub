function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

export function statusText(choice) {
  if (choice.status === 'accepted') return '錄取';
  if (choice.status === 'waitlist') return `候補（第 ${choice.waitlistNo || '待確認'} 號）`;
  if (choice.status === 'rejected') return '未錄取';
  return '審核中';
}

function choiceRows(registration) {
  return registration.choices.map((choice) => `
    <tr>
      <td style="padding:10px;border:1px solid #dce5ef">${escapeHtml(choice.club.name)}</td>
      <td style="padding:10px;border:1px solid #dce5ef">星期${escapeHtml(choice.club.day)} ${escapeHtml(choice.club.time)}</td>
      <td style="padding:10px;border:1px solid #dce5ef;font-weight:700">${escapeHtml(statusText(choice))}</td>
    </tr>`).join('');
}

export function receiptEmail(registration, schoolName) {
  return {
    subject: `【${schoolName}】課後社團報名已收到`,
    html: `<div style="font-family:Arial,'Microsoft JhengHei',sans-serif;color:#1f2937;line-height:1.7;max-width:680px;margin:auto">
      <h2 style="color:#23649a">課後社團報名已收到</h2>
      <p>家長您好，學生 <strong>${escapeHtml(registration.studentName)}</strong>（${escapeHtml(registration.grade)}）的報名已送達。</p>
      <p>報名編號：<strong>${escapeHtml(registration.registrationNo)}</strong></p>
      <table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:10px;border:1px solid #dce5ef">社團</th><th style="padding:10px;border:1px solid #dce5ef">時間</th><th style="padding:10px;border:1px solid #dce5ef">狀態</th></tr></thead><tbody>${choiceRows(registration)}</tbody></table>
      <p>超額社團將由學校人工篩選；結果完成後會再以電子郵件通知。</p>
    </div>`,
  };
}

export function resultEmail(registration, schoolName) {
  return {
    subject: `【${schoolName}】課後社團報名結果通知`,
    html: `<div style="font-family:Arial,'Microsoft JhengHei',sans-serif;color:#1f2937;line-height:1.7;max-width:680px;margin:auto">
      <h2 style="color:#23649a">課後社團報名結果</h2>
      <p>家長您好，學生 <strong>${escapeHtml(registration.studentName)}</strong>（${escapeHtml(registration.grade)}）的目前結果如下：</p>
      <table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:10px;border:1px solid #dce5ef">社團</th><th style="padding:10px;border:1px solid #dce5ef">時間</th><th style="padding:10px;border:1px solid #dce5ef">結果</th></tr></thead><tbody>${choiceRows(registration)}</tbody></table>
      <p>報名編號：${escapeHtml(registration.registrationNo)}</p>
    </div>`,
  };
}

export async function sendMail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: [to], subject, html }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Email provider error', response.status, detail);
    return { sent: false, reason: 'EMAIL_PROVIDER_ERROR' };
  }
  const data = await response.json();
  return { sent: true, id: data.id };
}
