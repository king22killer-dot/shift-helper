# 班表小幫手（月曆班表 PWA）

iPhone 用的月曆班表網頁 App。純靜態網站，沒有建置步驟，部署在 GitHub Pages（推上 main 就自動部署）：https://king22killer-dot.github.io/shift-helper/
網站在子路徑 `/shift-helper/` 底下，所有路徑都要用相對路徑（`manifest.json`、`sw.js`、`icon-180.png`），不要用 `/` 開頭。

## 檔案
- `index.html`：整個 App（HTML＋CSS＋JS 都在這個檔）。
- `sw.js`：Service Worker，`CACHE` 名稱要跟著版本號更新（例如 `shift-helper-v2`）。
- `manifest.json`、`icon-*.png`：加入主畫面用。
- `.nojekyll`：讓 GitHub Pages 直接提供檔案，不經過 Jekyll。
- `netlify.toml`：舊的 Netlify 設定（已改用 GitHub Pages，可忽略）。
- `tests/`、`package.json`、`.github/workflows/test.yml`：自動化測試（只用來測，App 本身不需要建置）。

## 每次修改的規則
1. 改 `index.html` 裡的 `const APP_VER='vNN（YYYY-MM-DD）';`，版本號加 1。
2. `sw.js` 的 `CACHE` 改成同一個版本號。
3. 有新功能或操作改變時，更新 `index.html` 裡 `HELP` 陣列的使用說明。
4. 跑自動化測試 `npm test`（`tests/run.js`，Playwright 模擬 iPhone 13；第一次先 `npm install`、`npx playwright install chromium`），全部通過再 commit。新功能要在 `tests/run.js` 加測試。推上 GitHub 後 `.github/workflows/test.yml` 也會自動跑。
5. commit 訊息用中文簡述改了什麼。

## 資料
- 全部存在手機 localStorage（key `shift-helper-v1`）：
  - `types`（班別）、`days`（`YYYY-MM-DD` → `{t, note}`，`t:'x'` 代表手動清成空白）
  - `cycles`：多組排班循環，每組 `{id, start, seq, months}`；`months` 排幾個月，最後一輪沒輪完會延到下個月排完（`cycleEnd()`）。重疊時以 `start` 較晚的為準（`cycleAt()`）。舊版單一 `cycle` 由 `migrateCycles()` 自動轉換。
  - `memos`（備忘錄，`files: [{id, type:'draw'|'audio', at, dur}]`；手寫 PNG／錄音檔本身存在 IndexedDB `shift-helper-files` 的 `files` store，用 `fileGet/filePut/fileDel`；「備份到 Google 雲端」的備份檔有包含，「複製文字備份」沒有）、`todos`（`date`、`time` 時間、`color` 月曆橫條顏色（沒設就依 id 自動配色，`colorOf()`）、`days` 幾天完成、`repeat` 重複 `day`/`week`/`month`（舊資料 `monthly:true`＝每月，用 `repOf()` 讀）＋`doneM` 完成狀態（每月用 `YYYY-MM`、每天／每週用日期當 key）、`remind` 提早幾分鐘、`cal` 已加入 iPhone 行事曆）
  - `logs`：工作日誌 `{id, date, text, tags:{fav,week,perf}, at}`，三個標記可以同時有。分組期間由 `logPeriod()` 決定：「週報」一次看 1～3 週（`logWeekN`，從這週往回每 N 週一組，週一～週日）、「績效」每月／半年／全年（`logPerfP`: month/half/year）。每組可複製成文字（`logReport()` 條列、`logParagraph()` 段落）。
  - `logFav`：常用內容 `{id, text, tags:{week,perf}}`。日誌標成「常用」時由 `rememberFav()` 自動記錄（相同內容只記一次），新增日誌時顯示成可點的按鈕；刪掉日誌不會刪常用。
  - 假別：班別有 `leave:1` 的算假別（預設特休 al、病假 sl、事假 pl、補休 cl，`LEAVE_TYPES`；舊資料由 `normalizeS()` 補一次，`leaveInit`）。`leaveCfg {start:'MM-DD', quota:{類別id:天數}}`，`leaveUsage()` 算年度內已休／已排。
  - `todoLog`（預設 true）：待辦打勾自動寫進今天的日誌（日誌的 `from` 記待辦 key，取消打勾會刪掉）；`logAutoTags` 自動日誌的標記。`rptFmt`：週報複製格式 `para` 段落／`list` 條列（`logParagraph()`、`logReport()`）。
  - 備份：`lastBackup`、`firstUse`、`bkSnooze`；7 天沒備份在班表上方顯示 `#bkBar`。
  - `theme`：外觀 `{mode:'auto'|'light'|'dark'|'time', day, night}`（`applyTheme()`）
  - `rem`：App 開著時已跳過的提醒（`checkReminders()`）
  - `calTodo`：班表上待辦的顯示方式 `bar` 彩色橫條（預設）／`num` 紅色數字／`off`（`renderCal()`，一週一列 `.wrow`，最多 2 條）
  - `todoView`：待辦分頁顯示「月曆」(`cal`，`renderTodoCal()`) 或「清單」(`list`，`renderTodoList()`)
  - `hol`（`show` 顯示國定假日、`off` 國定假日自動排休）
- 某天班別 `shiftOf()`：手動設定 → 國定假日排休（有開才算）→ 排班循環（`cycleAt()`）。
- 國定假日寫死在 `HOLIDAYS`（目前有 2026、2027 年），每年人事行政總處公布新年度後要補上。

## 備份
- 「備份到 Google 雲端」：`buildBackup()` 做成 `{app:'shift-helper', ver, at, data:S, files:{id:dataURL}}`（含手寫、錄音），用 `navigator.share` 檔案分享，使用者在分享選單存到 Google 雲端硬碟。沒有分享功能時改成下載。
- 「從備份檔還原」：選 .json 檔，`restoreData()` 還原資料和檔案（舊的純 S 格式也吃）。資料整理都走 `normalizeS()`。
- 沒有用 Google Drive API（要 Google Cloud 專案和登入，主畫面 App 登入常失敗）。

## 提醒的做法
- 網頁 App 在 iPhone 上不能自己定時跳通知，所以用「加到 iPhone 行事曆」（`addToCalendar()`）：`icsOf()` 產生 .ics（含 VALARM、RRULE）。主畫面 App 不吃 data: 網址，所以 `icsUrl()` 把內容 base64url 放在 `todo.ics?d=`，由 `sw.js` 轉成真正的 `text/calendar` 回應（沒有 Service Worker 時才退回 data: 網址）。使用者確認在 iPhone 上可用。
- 曾經做過「用捷徑加到提醒事項」，使用者要求刪除，不要再加回來。
- App 開著時另外每 30 秒檢查一次，到時間在畫面上方跳出 `#remBar`。

## 介面設計
- 沿用使用者「薪資出勤」App 的設計：深藍漸層頂欄（`--hdr`）、淺灰藍底（`--bg`）、白色圓角卡片、圓角日期格（班別是彩色標籤、今天琥珀色框、週日紅／週六藍）、藍色漸層主要按鈕（`--grad`）、底部分頁列（選中藍色＋底線）、底部視窗有拖曳把手。
- 現代極簡風：頂欄和按鈕用純色（`--hdr`、`--grad` 現在是單色，不用漸層）、細線框、幾乎不用陰影。
- 圖示一律用 Google 的 Material Symbols Outlined（線條、wght 300），用 `ic('名稱')` 產生 `<span class="ms">`。字型只載入用到的圖示：`<head>` 裡網址的 `icon_names=` 清單（要照字母排序），**新增圖示時要把名稱加進這個清單**，否則會顯示成文字。字型載好前圖示是透明的（`html.ms-ok`）；`sw.js` 會快取 Google Fonts，離線也看得到。
- 按鈕不要再用 emoji 當圖示。
- 顏色都用 `:root` 的變數，深色模式在 `prefers-color-scheme` 與 `[data-theme="dark"]` 兩處各寫一份。樣式在 `<style>` 最後的「薪資出勤風格」區塊覆蓋舊樣式。

## 使用者偏好
- 介面與說明一律繁體中文。
- 使用者主要在 iPhone 上使用。
