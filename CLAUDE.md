# 班表小幫手（月曆班表 PWA）

iPhone 用的月曆班表網頁 App。純靜態網站，沒有建置步驟，部署在 Netlify（推上 main 就自動部署）。

## 檔案
- `index.html`：整個 App（HTML＋CSS＋JS 都在這個檔）。
- `sw.js`：Service Worker，`CACHE` 名稱要跟著版本號更新（例如 `shift-helper-v2`）。
- `manifest.json`、`icon-*.png`：加入主畫面用。
- `netlify.toml`：Netlify 設定（index.html／sw.js 不快取）。

## 每次修改的規則
1. 改 `index.html` 裡的 `const APP_VER='vNN（YYYY-MM-DD）';`，版本號加 1。
2. `sw.js` 的 `CACHE` 改成同一個版本號。
3. 有新功能或操作改變時，更新 `index.html` 裡 `HELP` 陣列的使用說明。
4. 用 Playwright（iPhone 13 模擬）開頁面測試，確認沒有 JS 錯誤再 commit。
5. commit 訊息用中文簡述改了什麼。

## 資料
- 全部存在手機 localStorage（key `shift-helper-v1`）：
  - `types`（班別）、`days`（`YYYY-MM-DD` → `{t, note}`，`t:'x'` 代表手動清成空白）
  - `cycle`（`start`、`seq`、`months`：排幾個月，最後一輪沒輪完會延到下個月排完，見 `cycleEnd()`）
  - `memos`（備忘錄）、`todos`（`date`、`days` 幾天完成、`monthly` 每月重複＋`doneM` 各月完成狀態）
  - `hol`（`show` 顯示國定假日、`off` 國定假日自動排休）
- 某天班別 `shiftOf()`：手動設定 → 國定假日排休（有開才算）→ 排班循環。
- 國定假日寫死在 `HOLIDAYS`（目前有 2026、2027 年），每年人事行政總處公布新年度後要補上。

## 使用者偏好
- 介面與說明一律繁體中文。
- 使用者主要在 iPhone 上使用。
