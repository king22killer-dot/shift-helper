# 班表小幫手（月曆班表 PWA）

iPhone 用的月曆班表網頁 App。純靜態網站，沒有建置步驟，部署在 GitHub Pages（推上 main 就自動部署）：https://king22killer-dot.github.io/shift-helper/
網站在子路徑 `/shift-helper/` 底下，所有路徑都要用相對路徑（`manifest.json`、`sw.js`、`icon-180.png`），不要用 `/` 開頭。

## 檔案
- `index.html`：整個 App（HTML＋CSS＋JS 都在這個檔）。
- `sw.js`：Service Worker，`CACHE` 名稱要跟著版本號更新（例如 `shift-helper-v2`）。
- `manifest.json`、`icon-*.png`：加入主畫面用。
- `.nojekyll`：讓 GitHub Pages 直接提供檔案，不經過 Jekyll。
- `netlify.toml`：舊的 Netlify 設定（已改用 GitHub Pages，可忽略）。

## 每次修改的規則
1. 改 `index.html` 裡的 `const APP_VER='vNN（YYYY-MM-DD）';`，版本號加 1。
2. `sw.js` 的 `CACHE` 改成同一個版本號。
3. 有新功能或操作改變時，更新 `index.html` 裡 `HELP` 陣列的使用說明。
4. 用 Playwright（iPhone 13 模擬）開頁面測試，確認沒有 JS 錯誤再 commit。
5. commit 訊息用中文簡述改了什麼。

## 資料
- 全部存在手機 localStorage（key `shift-helper-v1`）：
  - `types`（班別）、`days`（`YYYY-MM-DD` → `{t, note}`，`t:'x'` 代表手動清成空白）
  - `cycles`：多組排班循環，每組 `{id, start, seq, months}`；`months` 排幾個月，最後一輪沒輪完會延到下個月排完（`cycleEnd()`）。重疊時以 `start` 較晚的為準（`cycleAt()`）。舊版單一 `cycle` 由 `migrateCycles()` 自動轉換。
  - `memos`（備忘錄，`files: [{id, type:'draw'|'audio', at, dur}]`；手寫 PNG／錄音檔本身存在 IndexedDB `shift-helper-files` 的 `files` store，用 `fileGet/filePut/fileDel`，不在匯出備份裡）、`todos`（`date`、`time` 時間、`color` 月曆橫條顏色（沒設就依 id 自動配色，`colorOf()`）、`days` 幾天完成、`repeat` 重複 `day`/`week`/`month`（舊資料 `monthly:true`＝每月，用 `repOf()` 讀）＋`doneM` 完成狀態（每月用 `YYYY-MM`、每天／每週用日期當 key）、`remind` 提早幾分鐘、`cal` 已加入 iPhone 行事曆）
  - `theme`：外觀 `{mode:'auto'|'light'|'dark'|'time', day, night}`（`applyTheme()`）
  - `rem`：App 開著時已跳過的提醒（`checkReminders()`）
  - `calTodo`：班表上待辦的顯示方式 `bar` 彩色橫條（預設）／`num` 紅色數字／`off`（`renderCal()`，一週一列 `.wrow`，最多 2 條）
  - `todoView`：待辦分頁顯示「月曆」(`cal`，`renderTodoCal()`) 或「清單」(`list`，`renderTodoList()`)
  - `hol`（`show` 顯示國定假日、`off` 國定假日自動排休）
- 某天班別 `shiftOf()`：手動設定 → 國定假日排休（有開才算）→ 排班循環（`cycleAt()`）。
- 國定假日寫死在 `HOLIDAYS`（目前有 2026、2027 年），每年人事行政總處公布新年度後要補上。

## 提醒的做法
- 網頁 App 在 iPhone 上不能自己定時跳通知，所以用「加到 iPhone 行事曆」：`icsOf()` 產生 .ics（含 VALARM、RRULE），用 data: 網址交給 iPhone 行事曆。
- App 開著時另外每 30 秒檢查一次，到時間在畫面上方跳出 `#remBar`。

## 介面設計
- 沿用使用者「薪資出勤」App 的設計：深藍漸層頂欄（`--hdr`）、淺灰藍底（`--bg`）、白色圓角卡片、圓角日期格（班別是彩色標籤、今天琥珀色框、週日紅／週六藍）、藍色漸層主要按鈕（`--grad`）、底部分頁列（選中藍色＋底線）、底部視窗有拖曳把手。
- 顏色都用 `:root` 的變數，深色模式在 `prefers-color-scheme` 與 `[data-theme="dark"]` 兩處各寫一份。樣式在 `<style>` 最後的「薪資出勤風格」區塊覆蓋舊樣式。

## 使用者偏好
- 介面與說明一律繁體中文。
- 使用者主要在 iPhone 上使用。
