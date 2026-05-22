# 資料整理範本

這個資料夾包含整理 ETF 資料所需的工具：

```
資料整理範本/
├── etf_template.csv        # Google Sheet 匯入用範本（含 5 筆範例）
├── 欄位說明.md             # 完整欄位定義 + 列舉值清單
├── 轉換腳本.py             # CSV → JSON 自動轉換
└── README.md               # 你正在看這個
```

## 整體流程

```
1. 在 Google Sheet 整理 ETF
        │
        │ 檔案 → 下載 → CSV
        ▼
2. 取得 etf_data.csv
        │
        │ python 轉換腳本.py etf_data.csv
        ▼
3. 自動產生 data/etf.json
        │
        │ git push
        ▼
4. 網站更新完成
```

## 第一步：建立 Google Sheet

1. 開新的 Google Sheet
2. 檔案 → 匯入 → 上傳 `etf_template.csv`
3. 匯入位置選「**取代目前的工作表**」
4. 分隔符選「**逗號**」、勾選「**將文字轉換為數字…**」**不要勾**（避免 0050 變 50）
5. 開始整理

## 第二步：欄位設定

請先看 `欄位說明.md`，重點：
- `code` 欄要設為「純文字」格式
- `asset_subclass` 多項時用 ` | ` 分隔
- `theme_factor`、`top5_holdings` 多項用 `, ` 分隔
- 空欄位**直接留空**，不要寫 `null` 或 `[]`

## 第三步：轉換成 JSON

下載 CSV 後，把它放到本資料夾命名為 `etf_data.csv`，執行：

```bash
cd 資料整理範本
python 轉換腳本.py
```

預設會輸出到 `../data/etf.json`，網站重新整理就會看到更新。

可選參數：

```bash
python 轉換腳本.py 自訂輸入.csv 自訂輸出.json
```

## 提示

- **不用一次填完 270+ 支**。建議先填 30~50 支熱門的（0050、0056、00878、00919…）讓網站能用，再慢慢補。
- **驗證會印出警告**（必填欄為空、asset_subclass 沒填等），但不會擋住轉換，自己看著修就好。
- **下次新增 ETF**：直接在 Google Sheet 加一行 → 下載 CSV → 跑腳本 → push。

下一步可以開始寫 Python 爬蟲，自動從投信投顧公會抓更新，省下手動維護的功夫。
