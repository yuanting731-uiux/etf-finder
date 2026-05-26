const { useState, useEffect, useMemo, useRef } = React;

// ---------- Constants ----------
const ASSET_TREE = [
  {
    key: "股票",
    mids: [
      {
        key: "區域",
        leaves: [
          {
            key: "成熟亞太",
            children: [
              { key: "韓國", value: "股票-區域-成熟亞太-韓國" },
              { key: "日本", value: "股票-區域-成熟亞太-日本" },
              { key: "其他", value: "股票-區域-成熟亞太-其他" },
            ],
          },
          { key: "成熟歐洲", value: "股票-區域-成熟歐洲" },
          {
            key: "新興亞太",
            children: [
              { key: "印度", value: "股票-區域-新興亞太-印度" },
              { key: "台灣", value: "股票-區域-新興亞太-台灣" },
              { key: "中國", value: "股票-區域-新興亞太-中國" },
              { key: "越南", value: "股票-區域-新興亞太-越南" },
            ],
          },
          {
            key: "新興市場",
            children: [
              { key: "綜合", value: "股票-區域-新興市場-綜合" },
              { key: "除中國", value: "股票-區域-新興市場-除中國" },
            ],
          },
          { key: "全球", value: "股票-區域-全球" },
          { key: "北美", value: "股票-區域-北美" },
        ],
      },
      {
        key: "產業",
        leaves: [
          { key: "金融類股", value: "股票-產業-金融" },
          { key: "工業類股", value: "股票-產業-工業" },
          { key: "房地產類股", value: "股票-產業-房地產" },
          { key: "科技類股", value: "股票-產業-科技" },
          { key: "醫療保健類股", value: "股票-產業-醫療保健" },
        ],
      },
      {
        key: "風格",
        leaves: [
          { key: "均衡型", value: "股票-風格-均衡" },
          { key: "成長型", value: "股票-風格-成長" },
          { key: "價值型", value: "股票-風格-價值" },
        ],
      },
    ],
  },
  {
    key: "債券",
    mids: [
      {
        key: "債券種類",
        leaves: [
          { key: "新興市場債", value: "債券-種類-新興市場債" },
          { key: "美國公債", value: "債券-種類-美國公債" },
          { key: "高收益債", value: "債券-種類-高收益債" },
          { key: "投資級公司債", value: "債券-種類-投資級公司債" },
        ],
      },
      {
        key: "區域",
        leaves: [
          { key: "全球", value: "債券-區域-全球" },
          { key: "北美", value: "債券-區域-北美" },
          { key: "新興亞太", value: "債券-區域-新興亞太" },
          { key: "成熟歐洲", value: "債券-區域-成熟歐洲" },
          { key: "成熟市場", value: "債券-區域-成熟市場" },
          { key: "新興市場", value: "債券-區域-新興市場" },
          { key: "綜合", value: "債券-區域-綜合" },
        ],
      },
      {
        key: "存續期間",
        leaves: [
          { key: "全天期", value: "債券-期限-全天期" },
          { key: "超短天期", value: "債券-期限-超短天期" },
          { key: "短天期", value: "債券-期限-短天期" },
          { key: "中天期", value: "債券-期限-中天期" },
          { key: "長天期", value: "債券-期限-長天期" },
        ],
      },
    ],
  },
  {
    key: "原物料",
    mids: [
      {
        key: "貴金屬",
        leaves: [
          { key: "黃金", value: "原物料-貴金屬-黃金" },
          { key: "白銀", value: "原物料-貴金屬-白銀" },
        ],
      },
      { key: "能源", leaves: [{ key: "石油", value: "原物料-原油" }] },
      { key: "農產品", leaves: [{ key: "農產品", value: "原物料-農產品" }] },
      { key: "工業金屬", leaves: [{ key: "工業金屬", value: "原物料-工業金屬" }] },
    ],
  },
  {
    key: "外匯",
    mids: [
      {
        key: "幣別",
        leaves: [
          { key: "日圓", value: "外匯-日圓" },
          { key: "人民幣", value: "外匯-人民幣" },
          { key: "美元", value: "外匯-美元" },
        ],
      },
    ],
  },
];

function collectLeafValues(node) {
  const out = [];
  const walk = (n) => {
    if (n.value) out.push(n.value);
    if (n.children) n.children.forEach(walk);
    if (n.leaves) n.leaves.forEach(walk);
    if (n.mids) n.mids.forEach(walk);
  };
  walk(node);
  return out;
}

const VALUE_LABEL = (() => {
  const map = {};
  const walk = (node, path) => {
    if (node.value) map[node.value] = path.join(" › ");
    if (node.children) node.children.forEach(c => walk(c, [...path, c.key]));
    if (node.leaves) node.leaves.forEach(l => walk(l, [...path, l.key]));
    if (node.mids) node.mids.forEach(m => walk(m, [...path, m.key]));
  };
  ASSET_TREE.forEach(b => walk(b, [b.key]));
  return map;
})();

const INVESTMENT_TYPES = ["市值型", "高股息", "主題型", "債券型", "平衡型", "貨幣型", "槓桿反向型"];
const ACTIVE_PASSIVE = ["主動", "被動"];
const LEVERAGE = ["一般", "2x槓桿", "-1x反向", "-2x反向"];
const THEMES = ["ESG", "AI/機器人", "半導體", "生技醫療", "能源轉型", "基礎建設", "低波動", "高品質", "小型股", "動能因子"];

const PAGE_SIZE = 25;
const FAV_KEY = "etf_finder_favs_v1";

// ---------- CSV Parsing ----------
// 處理 RFC 4180 風格 CSV：支援雙引號包裹、欄位內逗號、欄位內換行、雙引號跳脫（"")
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // 移除 BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const len = text.length;
  for (let i = 0; i < len; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function parseIntList(v) {
  if (!v || !v.trim()) return [];
  return v.split(",").map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n));
}
function parseStrList(v, sep = ",") {
  if (!v || !v.trim()) return [];
  return v.split(sep).map(s => s.trim()).filter(Boolean);
}
function parseSubclass(v) {
  if (!v || !v.trim()) return [];
  return v.replace("｜", "|").split("|").map(s => s.trim()).filter(Boolean);
}

// 把 CSV → ETF 物件陣列（欄位順序對應 資料整理範本/欄位說明.md）
function csvToETFs(csvText) {
  const rows = parseCSV(csvText).filter(r => r.length > 1 || (r.length === 1 && r[0].trim()));
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  const idx = (name) => headers.indexOf(name);
  const get = (row, name) => {
    const i = idx(name);
    return i >= 0 ? (row[i] || "").trim() : "";
  };
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const code = get(row, "code");
    if (!code) continue;
    out.push({
      id: code,
      code,
      name: get(row, "name"),
      asset_class: get(row, "asset_class"),
      asset_mid: get(row, "asset_mid"),
      asset_subclass: parseSubclass(get(row, "asset_subclass")),
      investment_type: get(row, "investment_type"),
      active_passive: get(row, "active_passive"),
      leverage: get(row, "leverage"),
      theme_factor: parseStrList(get(row, "theme_factor")),
      dividend_months: parseIntList(get(row, "dividend_months")),
      top5_holdings: parseStrList(get(row, "top5_holdings")),
      investment_direction: get(row, "investment_direction"),
      official_url: get(row, "official_url"),
    });
  }
  return out;
}

// ---------- Data Loader ----------
async function loadETFData() {
  const cfg = window.DATA_SOURCE || {};
  // 1. 優先 Sheet
  if (cfg.SHEET_CSV_URL && cfg.SHEET_CSV_URL.trim()) {
    try {
      const r = await fetch(cfg.SHEET_CSV_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      const data = csvToETFs(text);
      if (data.length === 0) throw new Error("CSV 解析後為空");
      return { data, source: "sheet" };
    } catch (err) {
      console.warn("[ETF] Google Sheet 載入失敗，改用本機 JSON：", err);
    }
  }
  // 2. fallback JSON
  const r2 = await fetch(cfg.FALLBACK_JSON || "data/etf.json");
  const json = await r2.json();
  return { data: json, source: "local" };
}

// ---------- Favorites hook ----------
function useFavorites() {
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
    catch { return new Set(); }
  });
  const toggle = (id) => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      return next;
    });
  };
  return [favs, toggle];
}

// ---------- Icons ----------
function StarIcon({ filled }) {
  return filled
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.3l7.1-.7L12 2z"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.3l7.1-.7L12 2z"/></svg>;
}
function Chevron({ open }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s ease" }}><polyline points="9 18 15 12 9 6"/></svg>;
}

// ---------- Asset Accordion ----------
function AssetAccordion({ selected, onToggle, onToggleMany }) {
  const [openClasses, setOpenClasses] = useState(() => new Set(["股票"]));
  const [openMids, setOpenMids] = useState(() => new Set(["股票/區域"]));
  const [openSubs, setOpenSubs] = useState(() => new Set());

  const toggleSet = (set, setter, k) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const allLeafSelected = (values) => values.length > 0 && values.every(v => selected.has(v));
  const someLeafSelected = (values) => values.some(v => selected.has(v));

  return (
    <div className="acc">
      {ASSET_TREE.map(cls => {
        const classOpen = openClasses.has(cls.key);
        const classLeaves = collectLeafValues(cls);
        const classAll = allLeafSelected(classLeaves);
        const classSome = !classAll && someLeafSelected(classLeaves);

        return (
          <div key={cls.key} className="acc__class">
            <div className="acc__row acc__row--class">
              <Checkbox
                checked={classAll}
                indeterminate={classSome}
                onChange={() => onToggleMany(classLeaves, !classAll)}
              />
              <button
                className="acc__btn acc__btn--class"
                onClick={() => toggleSet(openClasses, setOpenClasses, cls.key)}
              >
                <Chevron open={classOpen} />
                <span className="acc__label">{cls.key}</span>
                {classSome && !classAll && <span className="acc__partial">部分</span>}
              </button>
            </div>

            {classOpen && (
              <div className="acc__children">
                {cls.mids.map(mid => {
                  const midKey = `${cls.key}/${mid.key}`;
                  const midOpen = openMids.has(midKey);
                  const midLeaves = collectLeafValues(mid);
                  const midAll = allLeafSelected(midLeaves);
                  const midSome = !midAll && someLeafSelected(midLeaves);

                  return (
                    <div key={mid.key} className="acc__mid">
                      <div className="acc__row acc__row--mid">
                        <Checkbox
                          checked={midAll}
                          indeterminate={midSome}
                          onChange={() => onToggleMany(midLeaves, !midAll)}
                        />
                        <button
                          className="acc__btn"
                          onClick={() => toggleSet(openMids, setOpenMids, midKey)}
                        >
                          <Chevron open={midOpen} />
                          <span className="acc__label">{mid.key}</span>
                        </button>
                      </div>

                      {midOpen && (
                        <div className="acc__children">
                          {mid.leaves.map(leaf => {
                            if (leaf.children) {
                              const subKey = `${midKey}/${leaf.key}`;
                              const subOpen = openSubs.has(subKey);
                              const subLeaves = leaf.children.map(c => c.value);
                              const subAll = allLeafSelected(subLeaves);
                              const subSome = !subAll && someLeafSelected(subLeaves);
                              return (
                                <div key={leaf.key} className="acc__sub">
                                  <div className="acc__row acc__row--sub">
                                    <Checkbox
                                      checked={subAll}
                                      indeterminate={subSome}
                                      onChange={() => onToggleMany(subLeaves, !subAll)}
                                    />
                                    <button
                                      className="acc__btn"
                                      onClick={() => toggleSet(openSubs, setOpenSubs, subKey)}
                                    >
                                      <Chevron open={subOpen} />
                                      <span className="acc__label">{leaf.key}</span>
                                    </button>
                                  </div>
                                  {subOpen && (
                                    <div className="acc__children">
                                      {leaf.children.map(c => (
                                        <LeafRow
                                          key={c.value}
                                          label={c.key}
                                          checked={selected.has(c.value)}
                                          onChange={() => onToggle(c.value)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <LeafRow
                                key={leaf.value}
                                label={leaf.key}
                                checked={selected.has(leaf.value)}
                                onChange={() => onToggle(leaf.value)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Checkbox({ checked, indeterminate, onChange }) {
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate && !checked; }, [indeterminate, checked]);
  return (
    <span className={`cb ${checked ? "cb--on" : ""} ${indeterminate && !checked ? "cb--mix" : ""}`}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} />
      <span className="cb__box" aria-hidden="true">
        {checked && <svg viewBox="0 0 16 16" width="10" height="10"><polyline points="2,8 6,12 14,4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        {indeterminate && !checked && <span className="cb__dash" />}
      </span>
    </span>
  );
}

function LeafRow({ label, checked, onChange }) {
  return (
    <label className={`leaf ${checked ? "leaf--on" : ""}`}>
      <Checkbox checked={checked} onChange={onChange} />
      <span className="leaf__label">{label}</span>
    </label>
  );
}

// ---------- Collapsible Filter Section ----------
function CollapsibleFilter({ title, options, selected, onToggle, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const count = selected.length;
  return (
    <div className="cf">
      <button className="cf__head" onClick={() => setOpen(o => !o)}>
        <Chevron open={open} />
        <span className="cf__title">{title}</span>
        {count > 0 && <span className="cf__count">{count}</span>}
      </button>
      {open && (
        <div className="cf__body">
          {options.map(opt => {
            const active = selected.includes(opt);
            return (
              <label key={opt} className={`leaf ${active ? "leaf--on" : ""}`}>
                <Checkbox checked={active} onChange={() => onToggle(opt)} />
                <span className="leaf__label">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Cells ----------
function DividendStrip({ months }) {
  if (!months || months.length === 0) return <span className="div-none">無配息</span>;
  const set = new Set(months);
  return (
    <div className="div-strip" aria-label={`配息月份: ${months.join(", ")}`}>
      {Array.from({ length: 12 }, (_, i) => {
        const m = i + 1, on = set.has(m);
        return <span key={m} className={`div-cell ${on ? "div-cell--on" : ""}`} title={`${m}月`}>{on ? m : ""}</span>;
      })}
    </div>
  );
}

function TruncCell({ text }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, isTruncated: false });
  const ref = useRef(null);

  const handleEnter = () => {
    if (!ref.current) return;
    const el = ref.current;
    const isTruncated = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (!isTruncated) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top, left: r.left, isTruncated });
    setOpen(true);
  };

  return (
    <span
      ref={ref}
      className="trunc"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
    >
      {text}
      {open && ReactDOM.createPortal(
        <span
          className="trunc__pop"
          style={{ position: "fixed", top: pos.top - 10, left: pos.left, transform: "translateY(-100%)" }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}

function Chip({ children, tone = "neutral" }) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}
function chipToneByType(t) {
  if (t === "市值型") return "inv-cap";
  if (t === "高股息") return "inv-div";
  if (t === "主題型") return "inv-theme";
  if (t === "債券型") return "inv-bond";
  if (t === "平衡型") return "inv-bal";
  if (t === "貨幣型") return "inv-curr";
  if (t === "槓桿反向型") return "inv-lev";
  return "neutral";
}

// ---------- Sidebar ----------
function CollapsibleAssetSection({ selected, onToggle, onToggleMany }) {
  const [open, setOpen] = useState(true);
  const count = selected.size;
  return (
    <div className="cf cf--asset">
      <button className="cf__head" onClick={() => setOpen(o => !o)}>
        <Chevron open={open} />
        <span className="cf__title">資產類別</span>
        {count > 0 && <span className="cf__count">{count}</span>}
      </button>
      {open && (
        <div className="cf__body">
          <AssetAccordion selected={selected} onToggle={onToggle} onToggleMany={onToggleMany} />
        </div>
      )}
    </div>
  );
}

function Sidebar({ filters, setFilters, favCount, onClear, mobileOpen, onClose }) {
  const togglerFor = (key) => (val) => {
    setFilters(prev => {
      const cur = prev[key];
      const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val];
      return { ...prev, [key]: next };
    });
  };
  const toggleSubclass = (val) => {
    setFilters(prev => {
      const cur = prev.asset_subclass;
      const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val];
      return { ...prev, asset_subclass: next };
    });
  };
  const toggleManySubclass = (values, addAll) => {
    setFilters(prev => {
      const set = new Set(prev.asset_subclass);
      if (addAll) values.forEach(v => set.add(v));
      else values.forEach(v => set.delete(v));
      return { ...prev, asset_subclass: [...set] };
    });
  };

  const selectedSet = new Set(filters.asset_subclass);

  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__head">
        <div className="sidebar__title">篩選條件</div>
        <button className="sidebar__close" onClick={onClose} aria-label="關閉篩選">×</button>
      </div>

      <label className="fav-toggle">
        <input type="checkbox" checked={filters.favOnly} onChange={e => setFilters(f => ({ ...f, favOnly: e.target.checked }))} />
        <span className="fav-toggle__track"><span className="fav-toggle__dot" /></span>
        <span className="fav-toggle__label">
          <span className="fav-toggle__star"><StarIcon filled={true} /></span>
          只顯示我的最愛
          <span className="fav-toggle__count">{favCount}</span>
        </span>
      </label>

      {/* Selected chips */}
      {filters.asset_subclass.length > 0 && (
        <div className="selected-bar">
          <div className="selected-bar__head">
            <span>已選 {filters.asset_subclass.length} 項</span>
            <button onClick={() => setFilters(f => ({ ...f, asset_subclass: [] }))} className="selected-bar__clear">清除</button>
          </div>
          <div className="selected-bar__chips">
            {filters.asset_subclass.map(v => (
              <button key={v} className="selected-chip" onClick={() => toggleSubclass(v)}>
                <span>{(VALUE_LABEL[v] || v).split(" › ").slice(-1)[0]}</span>
                <span className="selected-chip__x">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <CollapsibleAssetSection
        selected={selectedSet}
        onToggle={toggleSubclass}
        onToggleMany={toggleManySubclass}
      />

      <CollapsibleFilter title="投資分類" options={INVESTMENT_TYPES} selected={filters.investment_type} onToggle={togglerFor("investment_type")} defaultOpen={false} />
      <CollapsibleFilter title="主被動" options={ACTIVE_PASSIVE} selected={filters.active_passive} onToggle={togglerFor("active_passive")} defaultOpen={false} />
      <CollapsibleFilter title="槓桿 / 反向倍數" options={LEVERAGE} selected={filters.leverage} onToggle={togglerFor("leverage")} defaultOpen={false} />
      <CollapsibleFilter title="主題 / 因子" options={THEMES} selected={filters.theme_factor} onToggle={togglerFor("theme_factor")} defaultOpen={false} />

      <button className="clear-btn" onClick={onClear}>清除所有篩選</button>
    </aside>
  );
}

// ---------- Table ----------
function Table({ rows, favs, onToggleFav }) {
  if (rows.length === 0) {
    return (
      <div className="empty">
        <div className="empty__title">找不到符合條件的 ETF</div>
        <div className="empty__hint">請調整左側篩選條件或清除部分篩選</div>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="etf-table">
        <colgroup>
          <col style={{ width: "44px" }} />
          <col style={{ width: "84px" }} />
          <col style={{ width: "180px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "100px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "108px" }} />
          <col style={{ width: "180px" }} />
          <col style={{ width: "238px" }} />
          <col style={{ width: "220px" }} />
          <col style={{ width: "260px" }} />
          <col style={{ width: "84px" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="col-fav sticky-l1"><span className="sr">收藏</span></th>
            <th className="col-code sticky-l2">代碼</th>
            <th>ETF 名稱</th>
            <th>資產類別</th>
            <th>投資分類</th>
            <th>主被動</th>
            <th>槓桿/反向</th>
            <th>主題/因子</th>
            <th>配息月份</th>
            <th>前五大持股</th>
            <th>投資方向</th>
            <th>官方</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(etf => {
            const faved = favs.has(etf.id);
            return (
              <tr key={etf.id}>
                <td className="col-fav sticky-l1">
                  <button className={`star ${faved ? "star--on" : ""}`} onClick={() => onToggleFav(etf.id)} aria-label={faved ? "取消收藏" : "加入收藏"}>
                    <StarIcon filled={faved} />
                  </button>
                </td>
                <td className="col-code sticky-l2"><span className="code-text">{etf.code}</span></td>
                <td className="cell-name">{etf.name}</td>
                <td><Chip tone="neutral">{etf.asset_class}</Chip></td>
                <td><Chip tone={chipToneByType(etf.investment_type)}>{etf.investment_type}</Chip></td>
                <td><Chip tone={etf.active_passive === "主動" ? "warm" : "neutral"}>{etf.active_passive}</Chip></td>
                <td><Chip tone={etf.leverage === "一般" ? "neutral" : "warm"}>{etf.leverage}</Chip></td>
                <td>
                  {etf.theme_factor.length === 0
                    ? <span className="muted">—</span>
                    : <div className="tag-row">{etf.theme_factor.map(t => <span key={t} className="tag">{t}</span>)}</div>}
                </td>
                <td><DividendStrip months={etf.dividend_months} /></td>
                <td><TruncCell text={etf.top5_holdings.join("、")} /></td>
                <td><TruncCell text={etf.investment_direction} /></td>
                <td><a className="ext-link" href={etf.official_url} target="_blank" rel="noopener noreferrer">查看 ↗</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Pagination ----------
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const push = n => pages.push(n);
  const range = (a, b) => { for (let i = a; i <= b; i++) push(i); };
  if (totalPages <= 7) range(1, totalPages);
  else {
    push(1);
    if (page > 4) push("…");
    range(Math.max(2, page - 1), Math.min(totalPages - 1, page + 1));
    if (page < totalPages - 3) push("…");
    push(totalPages);
  }
  return (
    <nav className="pager" aria-label="分頁">
      <button className="pager__btn" disabled={page === 1} onClick={() => onPage(page - 1)}>← 上一頁</button>
      <div className="pager__nums">
        {pages.map((p, i) => p === "…"
          ? <span key={"e" + i} className="pager__ell">…</span>
          : <button key={p} className={`pager__num ${p === page ? "pager__num--on" : ""}`} onClick={() => onPage(p)}>{p}</button>)}
      </div>
      <button className="pager__btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>下一頁 →</button>
    </nav>
  );
}

// ---------- App ----------
function App() {
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dataSource, setDataSource] = useState("");
  const [loadError, setLoadError] = useState("");
  const [favs, toggleFav] = useFavorites();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    asset_subclass: [],
    investment_type: [],
    active_passive: [],
    leverage: [],
    theme_factor: [],
    favOnly: false,
  });
  const [page, setPage] = useState(1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sort, setSort] = useState({ key: "code", dir: "asc" });

  useEffect(() => {
    document.documentElement.setAttribute("data-density", "compact");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data, source } = await loadETFData();
        if (cancelled) return;
        setData(data);
        setDataSource(source);
        setLoadError("");
      } catch (err) {
        if (cancelled) return;
        setLoadError(String(err.message || err));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    run();
    const interval = (window.DATA_SOURCE && window.DATA_SOURCE.REFRESH_MS) || 0;
    let timer;
    if (interval > 0) timer = setInterval(run, interval);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(etf => {
      if (filters.favOnly && !favs.has(etf.id)) return false;
      if (q) {
        const hay = (etf.name + " " + etf.code).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.asset_subclass.length) {
        const subs = etf.asset_subclass || [];
        if (!filters.asset_subclass.some(v => subs.includes(v))) return false;
      }
      if (filters.investment_type.length && !filters.investment_type.includes(etf.investment_type)) return false;
      if (filters.active_passive.length && !filters.active_passive.includes(etf.active_passive)) return false;
      if (filters.leverage.length && !filters.leverage.includes(etf.leverage)) return false;
      if (filters.theme_factor.length && !filters.theme_factor.some(t => (etf.theme_factor || []).includes(t))) return false;
      return true;
    });
  }, [data, query, filters, favs]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearAll = () => {
    setFilters({ asset_subclass: [], investment_type: [], active_passive: [], leverage: [], theme_factor: [], favOnly: false });
    setQuery("");
  };

  const activeFilterCount =
    filters.asset_subclass.length + filters.investment_type.length +
    filters.active_passive.length + filters.leverage.length +
    filters.theme_factor.length + (filters.favOnly ? 1 : 0) + (query ? 1 : 0);

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr__inner">
          <div className="hdr__brand">
            <a className="hdr__logo" href="" aria-label="TIVA">
              <img src="assets/tiva-logo.svg" alt="TIVA" />
            </a>
            <span className="hdr__caption">輕鬆找到適合你的台股 ETF</span>
          </div>
          <div className="hdr__stats">
            <div className="stat">
              <div className="stat__num">{loaded ? data.length : "—"}</div>
              <div className="stat__label">
                收錄 ETF
                {dataSource === "sheet" && <span className="stat__badge" title="即時讀取自 Google Sheet">LIVE</span>}
              </div>
            </div>
            <div className="stat stat--divider" />
            <div className="stat">
              <div className="stat__num">{favs.size}</div>
              <div className="stat__label">已收藏</div>
            </div>
          </div>
        </div>
      </header>

      <div className="layout">
        <Sidebar
          filters={filters}
          setFilters={setFilters}
          favCount={favs.size}
          onClear={clearAll}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <main className="main">
          <div className="toolbar">
            <div className="search">
              <svg className="search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input type="search" placeholder="搜尋 ETF 代碼或名稱（如 0050、高股息）" value={query} onChange={e => setQuery(e.target.value)} />
              {query && <button className="search__clear" onClick={() => setQuery("")} aria-label="清除搜尋">×</button>}
            </div>
            <button className="mobile-filter-btn" onClick={() => setMobileOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              篩選 {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
            </button>
          </div>

          <div className="result-bar">
            <div className="result-bar__count">
              找到 <strong>{sorted.length}</strong> 支 ETF
              {activeFilterCount > 0 && <span className="result-bar__hint">· {activeFilterCount} 項條件</span>}
            </div>
            <div className="result-bar__sort">
              <span className="result-bar__sort-label">排序：代碼</span>
              <button
                type="button"
                className="sort-dir"
                onClick={() => setSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
                aria-label={sort.dir === "asc" ? "升冪，點擊切換為降冪" : "降冪，點擊切換為升冪"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {sort.dir === "asc"
                    ? <g><path d="M5 14l4-4 4 4"/><path d="M9 10v10"/><path d="M14 6h6"/><path d="M14 10h4"/><path d="M14 14h2"/></g>
                    : <g><path d="M5 10l4 4 4-4"/><path d="M9 14V4"/><path d="M14 6h2"/><path d="M14 10h4"/><path d="M14 14h6"/></g>}
                </svg>
                <span>{sort.dir === "asc" ? "升冪" : "降冪"}</span>
              </button>
            </div>
          </div>

          <Table rows={pageRows} favs={favs} onToggleFav={toggleFav} />

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </main>
      </div>

      <footer className="ftr">
        <div className="ftr__inner">
          <span>Copyright © {new Date().getFullYear()} Tiva All Rights Reserved.</span>
          <span className="ftr__note">資料僅供參考，投資前請自行查證</span>
        </div>
      </footer>

      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}

window.App = App;
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
