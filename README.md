# 115 學年度課後社團招生網站

正式版架構為：GitHub 保存程式碼，Cloudflare Pages 部署前端與 API，Cloudflare D1 保存報名資料，Brevo 寄送報名收件與錄取結果郵件。

## 已實作功能

- 家長以學生身分證字號報名；資料庫只保存 HMAC 雜湊，不保存身分證明碼。
- 同一天只能選一個社團，週三與週五可各選一個。
- 直笛音樂社不限額，其餘社團上限 20 人；所有社團的報名皆先列為待審核，由承辦人人工決定錄取、候補或未錄取，不自動錄取或抽籤。
- 報名完成後自動寄送收件通知；承辦人儲存審核結果後自動寄送完整錄取結果。
- 家長不建立帳號，只在報名表提供電子郵件；管理端使用單一管理者帳號密碼登入。
- 班級由年級自動設定為一年忠班至六年忠班，後端會再次強制校正。
- 管理端可填候補序號、匯出 CSV，並由後端生成個別學生通知單、每班一頁的班級彙整通知單，以及可逐社團選擇與列印的錄取名單。

## 本機啟動

需 Node.js 22 以上。

1. 安裝套件：`pnpm install`（也可使用 `npm install`）
2. 將 `.dev.vars.example` 複製成 `.dev.vars`，填入管理密碼、登入簽章密鑰與身分證雜湊密鑰。測試郵件時才填 Brevo 金鑰與已驗證寄件信箱。
3. 初始化本機資料庫：`pnpm db:local`
4. 啟動：`pnpm dev`
5. 家長端：`http://localhost:8788/`
6. 管理端：`http://localhost:8788/admin.html`

`.dev.vars` 已由 `.gitignore` 排除，請勿提交。

若 Windows 啟動 `workerd` 時出現 access violation，請先更新 Microsoft Visual C++ Redistributable；也可先執行 `pnpm check`、`pnpm test`、`pnpm build`，再於 Cloudflare 的預覽部署驗證完整執行環境。

## GitHub 與 Cloudflare 上線

1. 在 GitHub 建立 repository（公開或私人皆可），將本資料夾內容推送上去。
2. 安裝依賴後先執行 `pnpm check` 與 `pnpm build`。
3. 建立 D1：`npx wrangler d1 create after-school-club-registration --location=apac`。
4. 把指令回傳的 `database_id` 填入 `wrangler.jsonc`。
5. 初始化正式資料庫：`pnpm db:remote`。
6. 在 Cloudflare Workers & Pages 建立 Pages 專案並連接 GitHub repository：
   - Build command：`pnpm build`
   - Build output directory：`dist`
7. 在 Pages 專案的 Bindings 新增 D1 binding：名稱必須是 `DB`，資料庫選 `after-school-club-registration`。
8. 設定一般變數：
   - `SCHOOL_NAME`：學校名稱
   - `FROM_NAME`：收件者看到的寄件者名稱
   - `ADMIN_USERNAME`：管理者帳號，目前為 `admin`
9. 設定加密 Secrets：
   - `ADMIN_PASSWORD`：管理者密碼
   - `ADMIN_SESSION_SECRET`：至少 32 字元的隨機登入簽章密鑰
   - `ID_HASH_PEPPER`：另一組至少 32 字元、不得與登入密鑰相同的隨機字串
   - `BREVO_API_KEY`：Brevo API Key
   - `FROM_EMAIL`：已在 Brevo 驗證的寄件信箱
10. 重新部署。日後推送 GitHub，Cloudflare 會自動建置與發佈。

## 審核與列印流程

1. 開啟 `/admin.html`，輸入管理者帳號與密碼。
2. 每一筆報名（包含不限額社團）都須人工選擇錄取、候補或未錄取；候補者填候補序號。
3. 按「儲存並寄送」。系統會保存結果，並把該生週三、週五的完整狀態寄給家長。
4. 按「列印通知單」。通知單由已驗證身分的後端生成，可直接列印或另存 PDF。

## 上線前檢查

- 將 `wrangler.jsonc` 的學校名稱、寄件者和 D1 ID 替換完成。
- Brevo 寄件者已完成驗證；若日後有學校自有網域，建議完成網域驗證以提升送達率。
- 用測試學生完成報名、收件信、審核信、候補序號、CSV 與通知單流程。
- 由校方決定報名資料保存期限、承辦人名單與刪除方式。
- 管理頁網址與帳號密碼只提供承辦人；密碼若外洩立即更換。

更多安全原則請見 [SECURITY.md](./SECURITY.md)。
