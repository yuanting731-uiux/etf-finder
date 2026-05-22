# 串接 Google Sheet（方案 B）

讓網站直接讀 Google Sheet，你改 Sheet → 使用者重新整理就看得到，不用 git push。

---

## 一次性設定（約 5 分鐘）

### 第 1 步：準備 Google Sheet

1. 用 Google Sheet 開啟 → **檔案 → 匯入 → 上傳** `資料整理範本/etf_template.csv`
2. 匯入時：
   - 匯入位置選「**取代目前的工作表**」
   - 分隔符選「**逗號**」
   - **取消勾選「將文字轉換為數字、日期和公式」**（否則 0050 會變成 50）
3. 在這個 Sheet 裡新增 / 編輯你的 ETF 資料

> ⚠️ **欄位順序與名稱必須跟範本一致**，網站靠欄位名稱對應資料。

### 第 2 步：發佈 Sheet 為 CSV

1. Google Sheet → **檔案 → 共用 → 發佈到網路**
2. 「連結」分頁：
   - 左邊選擇要發佈的工作表（通常選整份文件，或選 ETF 那個分頁）
   - 右邊選擇「**逗號分隔值 (.csv)**」
3. 點「**發佈**」→ 確認
4. 複製出現的網址，長得像：
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vXXXXXXXXXX.../pub?output=csv
   ```

> ⚠️ 「發佈到網路」**不同於**「共用」。前者產生一個公開的純資料連結；後者只是給人看 Sheet 介面。網站需要的是前者。

### 第 3 步：填到網站設定

打開 `data-source.js`，把網址貼進去：

```javascript
window.DATA_SOURCE = {
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vXXXXXX.../pub?output=csv",
  FALLBACK_JSON: "data/etf.json",
  REFRESH_MS: 0,
};
```

存檔 → 重新整理網站 → Header 應該會出現一個綠色 **LIVE** 徽章，表示資料來自 Sheet。

---

## 日常更新流程

```
編輯 Google Sheet → 等個 1-5 分鐘（Google 快取） → 使用者重新整理就看到
```

不用 git push、不用跑腳本、不用部署。

---

## 進階：自動刷新

如果你希望網站「不用重新整理」也能自動拉最新資料，把 `REFRESH_MS` 改成例如：

```javascript
REFRESH_MS: 5 * 60 * 1000,  // 每 5 分鐘自動重新抓
```

> 注意：太頻繁會浪費使用者流量，建議 ≥ 5 分鐘。

---

## 常見問題

### Q1: 我貼上網址了，但網站沒有 LIVE 徽章？
打開瀏覽器開發者工具 → Console，看是否有錯誤訊息。常見原因：
- **網址錯誤**：必須是「發佈到網路」的 CSV 連結，不是 Sheet 編輯介面的連結（編輯介面是 `/edit#gid=0` 結尾）
- **Sheet 沒發佈**：要按過「發佈」按鈕，不是只有「分享」
- **欄位名稱不對**：必須跟 `etf_template.csv` 的標題一字不差

### Q2: 我改了 Sheet，但網站沒更新？
Google 的 CSV 公開網址有 **1-5 分鐘的快取**。等一下再重新整理。

### Q3: 我想讓網站完全脫離 Google Sheet，回到原本架構？
把 `SHEET_CSV_URL` 改回空字串 `""`，網站會自動讀 `data/etf.json`。

### Q4: 我同時想保留 git 版本紀錄？
建議定期把 Sheet 下載成 CSV → 跑 `python 轉換腳本.py` 同步到 `data/etf.json` 進 git，這樣兩邊都有：
- 即時資料 → Google Sheet
- 版本歷史 → Git

### Q5: Sheet 是私人的，可以用嗎？
不行。「發佈到網路」會把資料設為公開（任何拿到網址的人都讀得到）。如果你的資料敏感，請改用方案 A（手動匯出 JSON）。

ETF 公開資訊本身就是公開的，發佈通常沒問題。

---

## 一些限制

| 項目 | 限制 |
|---|---|
| 同時請求次數 | Google 有 rate limit，正常使用不會碰到 |
| 資料更新延遲 | 1-5 分鐘 Google 快取 |
| 檔案大小 | 沒有實際限制，但建議 < 10MB |
| 權限 | 必須是公開資料 |
| HTTPS | Google CSV 連結是 HTTPS，可在任何網站使用 |
