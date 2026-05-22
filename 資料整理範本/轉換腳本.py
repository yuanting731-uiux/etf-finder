"""
ETF CSV → JSON 轉換腳本

用法：
    python 轉換腳本.py etf_data.csv > etf.json

或直接在 IDE 跑：修改下面 INPUT_FILE / OUTPUT_FILE 即可。

依賴：只用 Python 內建函式庫，無需額外安裝。
"""

import csv
import json
import sys
from pathlib import Path

# ---------- 設定 ----------
INPUT_FILE = "etf_data.csv"          # 從 Google Sheet 下載的 CSV
OUTPUT_FILE = "../data/etf.json"     # 輸出位置（直接覆蓋網站資料）


def parse_int_list(value: str) -> list[int]:
    """把 '1, 4, 7, 10' 轉成 [1, 4, 7, 10]，空字串回傳 []"""
    if not value or not value.strip():
        return []
    return [int(x.strip()) for x in value.split(",") if x.strip()]


def parse_str_list(value: str, sep: str = ",") -> list[str]:
    """把逗號分隔字串轉成 list，空字串回傳 []"""
    if not value or not value.strip():
        return []
    return [x.strip() for x in value.split(sep) if x.strip()]


def parse_subclass(value: str) -> list[str]:
    """asset_subclass 用 ' | ' 分隔（避免和細類名稱中的『-』衝突）"""
    if not value or not value.strip():
        return []
    # 同時支援 | 和 ｜（全形）
    value = value.replace("｜", "|")
    return [x.strip() for x in value.split("|") if x.strip()]


def csv_to_etf_record(row: dict) -> dict:
    """單行 CSV → 一筆 ETF JSON 物件"""
    code = row["code"].strip()
    return {
        "id": code,
        "code": code,
        "name": row["name"].strip(),
        "asset_class": row["asset_class"].strip(),
        "asset_mid": row["asset_mid"].strip(),
        "asset_subclass": parse_subclass(row["asset_subclass"]),
        "investment_type": row["investment_type"].strip(),
        "active_passive": row["active_passive"].strip(),
        "leverage": row["leverage"].strip(),
        "theme_factor": parse_str_list(row.get("theme_factor", "")),
        "dividend_months": parse_int_list(row.get("dividend_months", "")),
        "top5_holdings": parse_str_list(row.get("top5_holdings", "")),
        "investment_direction": row["investment_direction"].strip(),
        "official_url": row["official_url"].strip(),
    }


def validate(record: dict, line_num: int) -> list[str]:
    """檢查必填欄位，回傳錯誤訊息清單"""
    errors = []
    required = ["code", "name", "asset_class", "asset_mid",
                "investment_type", "active_passive", "leverage"]
    for f in required:
        if not record.get(f):
            errors.append(f"第 {line_num} 行：{f} 為空")
    if not record["asset_subclass"]:
        errors.append(f"第 {line_num} 行（{record['code']}）：asset_subclass 為空")
    return errors


def convert(input_path: str, output_path: str) -> None:
    records = []
    all_errors = []

    with open(input_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):  # 從 2 開始（1 是表頭）
            # 跳過空行
            if not row.get("code") or not row["code"].strip():
                continue
            try:
                rec = csv_to_etf_record(row)
                errs = validate(rec, i)
                if errs:
                    all_errors.extend(errs)
                records.append(rec)
            except Exception as e:
                all_errors.append(f"第 {i} 行解析失敗：{e}")

    if all_errors:
        print("⚠️  發現問題：", file=sys.stderr)
        for e in all_errors:
            print(f"  - {e}", file=sys.stderr)
        print("", file=sys.stderr)

    # 依代碼排序
    records.sort(key=lambda r: r["code"])

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"✅ 轉換完成：{len(records)} 筆 ETF → {output_path}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else OUTPUT_FILE
    else:
        input_file = INPUT_FILE
        output_file = OUTPUT_FILE
    convert(input_file, output_file)
