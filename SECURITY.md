# 資料安全說明

- 學生身分證字號只用於辨識重複報名，後端以 HMAC-SHA-256 雜湊後儲存，不保存明碼。
- 家長電子郵件、電話、學生姓名與班級屬個人資料，僅供社團報名與錄取通知使用。
- `ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`、`ID_HASH_PEPPER`、`BREVO_API_KEY`、`FROM_EMAIL` 必須設為 Cloudflare 的加密 Secret，絕對不可提交至 GitHub。
- 管理者帳號密碼只傳給後端驗證；登入成功後，瀏覽器分頁僅暫存有效 8 小時的 HMAC 簽章憑證。
- 若管理密碼、登入簽章密鑰或郵件金鑰外洩，請立即在 Cloudflare／Brevo 撤銷並更換。
- 正式上線前應依校方個資政策設定資料保存期限、承辦人存取權與刪除程序。
