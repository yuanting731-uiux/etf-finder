/* =========================================
   ETF Finder — 資料來源設定
   ─────────────────────────────────────────
   只要編輯這個檔案的 SHEET_CSV_URL，
   就能切換資料來源在「Google Sheet」和「本機 JSON」之間。
   ========================================= */

window.DATA_SOURCE = {
  // 你的 Google Sheet 發佈到網路後拿到的 CSV 網址。
  // 留空字串 "" → 改用本機 data/etf.json
  //
  // 取得方式：Google Sheet → 檔案 → 共用 → 發佈到網路 →
  //          選「逗號分隔值 (.csv)」→ 複製連結
  // 範例：https://docs.google.com/spreadsheets/d/e/2PACX-1vXXXXX.../pub?output=csv
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQavziPjOlVaMkV6QsvuILg6aCC54xxgOm5obUBIr_afTj-4CCne_fJDHsq_q7blN7BR0IVTzsG1Dct/pub?output=csv",

  // 後備來源（Sheet 拿不到時自動使用）
  FALLBACK_JSON: "data/etf.json",

  // 多久重新抓一次 Sheet（毫秒）。設 0 = 只在頁面載入時抓一次。
  // 預設 5 分鐘，符合 Google 的 cache 週期。
  REFRESH_MS: 0,
};
