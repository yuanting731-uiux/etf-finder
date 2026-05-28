// recommender.jsx — 智能配置推薦
// 演算法理論基礎：
//   1. Modern Portfolio Theory (Markowitz, 1952)
//   2. Age-Based Asset Allocation (Bogle 等指數投資先驅)
//   3. Core-Satellite Strategy (Vanguard)

const { useState: useStateR, useEffect: useEffectR, useMemo: useMemoR } = React;

const REC_STATE_KEY = "etf_finder_recstate_v1";

// ---------- Questions ----------
const QUESTIONS = [
  {
    id: "age",
    title: "您目前的年齡？",
    subtitle: "決定您的投資時間長度",
    type: "slider",
    min: 20, max: 70, step: 1, default: 35,
  },
  {
    id: "risk",
    title: "您的風險承受能力？",
    subtitle: "面對市場波動時，您的接受程度",
    type: "card",
    options: [
      { value: "conservative", label: "保守", desc: "希望本金安全，能接受報酬較低" },
      { value: "balanced", label: "穩健", desc: "願意承擔適度波動，追求穩定報酬" },
      { value: "aggressive", label: "積極", desc: "追求高報酬，能接受較大波動" },
    ],
  },
  {
    id: "diversification",
    title: "您希望的配置多元性？",
    subtitle: "投資組合中 ETF 的數量",
    type: "card",
    options: [
      { value: "single", label: "簡單", desc: "1-2 支 ETF，集中於核心市場" },
      { value: "balanced", label: "適度分散", desc: "3-5 支 ETF，跨資產類別" },
      { value: "diversified", label: "高度分散", desc: "6-8 支 ETF，含主題與避險" },
    ],
  },
  {
    id: "goal",
    title: "您的投資目的？",
    subtitle: "決定整體配置的傾向",
    type: "card",
    options: [
      { value: "retirement", label: "退休準備", desc: "20+ 年的長期規劃" },
      { value: "long-term-growth", label: "長期資產成長", desc: "10-20 年累積財富" },
      { value: "mid-term", label: "中期目標", desc: "3-10 年內買房、教育金等" },
      { value: "passive-income", label: "被動收入", desc: "希望透過配息獲得現金流" },
    ],
  },
  {
    id: "cashFlow",
    title: "您是否需要配息現金流？",
    subtitle: "影響推薦的 ETF 是否偏向高股息",
    type: "card",
    options: [
      { value: "no-need", label: "不需要", desc: "全部再投入累積資產" },
      { value: "partial", label: "希望部分配息", desc: "適度配息，部分再投入" },
      { value: "main-income", label: "主要靠配息", desc: "依賴配息作為生活費" },
    ],
  },
];

// ---------- Algorithm ----------
function bucketize(answers) {
  const { age, risk, diversification, goal, cashFlow } = answers;

  // 1. 股債基礎比例（Bogle 110 法則）
  let baseStock = (110 - age) / 100;
  const riskMult = { conservative: 0.85, balanced: 1.0, aggressive: 1.15 }[risk];
  let stockPct = Math.max(0.2, Math.min(0.95, baseStock * riskMult));

  // 2. 目的調整
  if (goal === "retirement" && age >= 50) stockPct *= 0.9;
  if (goal === "long-term-growth") stockPct = Math.min(0.95, stockPct * 1.1);
  if (goal === "mid-term") stockPct *= 0.75;
  if (goal === "passive-income") stockPct *= 0.85;

  // 3. 現金流需求
  if (cashFlow === "main-income") stockPct *= 0.8;

  stockPct = Math.max(0.2, Math.min(0.95, stockPct));
  const bondPct = 1 - stockPct;

  // 4. 高股息偏好等級
  const divBias = (cashFlow === "main-income" || goal === "passive-income") ? "high"
    : cashFlow === "partial" ? "medium" : "low";
  const allowThemes = risk === "aggressive";

  // 5. 建立配置桶
  let buckets = [];

  if (diversification === "single") {
    const dividendPref = divBias !== "low";
    buckets = [
      { id: "tw-core", name: dividendPref ? "台股高息" : "台股核心", pct: stockPct,
        criteria: { subclass: "股票-區域-新興亞太-台灣", preferDividend: dividendPref } },
      { id: "us-bond", name: "美國公債", pct: bondPct,
        criteria: { subclass: "債券-種類-美國公債" } },
    ];
  } else if (diversification === "balanced") {
    const twPct = stockPct * 0.45;
    const usPct = stockPct * 0.35;
    const extraPct = stockPct * 0.20;
    buckets = [
      { id: "tw-core", name: "台股核心", pct: twPct,
        criteria: { subclass: "股票-區域-新興亞太-台灣", preferMarketCap: true } },
      { id: "us-core", name: "美股核心", pct: usPct,
        criteria: { subclass: "股票-區域-北美" } },
    ];
    if (divBias === "high" || divBias === "medium") {
      buckets.push({ id: "tw-div", name: "台股高股息", pct: extraPct,
        criteria: { subclass: "股票-區域-新興亞太-台灣", preferDividend: true } });
    } else if (allowThemes) {
      buckets.push({ id: "theme-tech", name: "科技主題", pct: extraPct,
        criteria: { subclass: "股票-產業-科技" } });
    } else {
      buckets[0].pct += extraPct; // 給回台股核心
    }
    buckets.push({ id: "us-bond", name: "美國公債", pct: bondPct,
      criteria: { subclass: "債券-種類-美國公債" } });
  } else { // diversified
    const twPct = stockPct * 0.28;
    const usPct = stockPct * 0.24;
    const globalPct = stockPct * 0.12;
    const themePct = stockPct * 0.14;
    const divPct = stockPct * 0.14;
    const goldPct = stockPct * 0.08;
    buckets = [
      { id: "tw-core", name: "台股核心", pct: twPct,
        criteria: { subclass: "股票-區域-新興亞太-台灣", preferMarketCap: true } },
      { id: "us-core", name: "美股核心", pct: usPct,
        criteria: { subclass: "股票-區域-北美" } },
      { id: "global", name: "全球股市", pct: globalPct,
        criteria: { subclass: "股票-區域-全球" } },
    ];
    // Theme vs dividend based on bias
    if (allowThemes && divBias === "low") {
      buckets.push({ id: "theme", name: "AI / 半導體", pct: themePct,
        criteria: { subclass: "股票-產業-科技" } });
      buckets.push({ id: "tw-div", name: "台股高股息", pct: divPct,
        criteria: { subclass: "股票-區域-新興亞太-台灣", preferDividend: true } });
    } else if (divBias !== "low") {
      // Combine theme into dividend
      buckets.push({ id: "tw-div", name: "台股高股息", pct: divPct + themePct,
        criteria: { subclass: "股票-區域-新興亞太-台灣", preferDividend: true } });
    } else {
      // No themes, no high div — push to core
      buckets[0].pct += (divPct + themePct) * 0.5;
      buckets[1].pct += (divPct + themePct) * 0.5;
    }
    // Gold (避險)
    buckets.push({ id: "gold", name: "黃金避險", pct: goldPct,
      criteria: { subclass: "原物料-貴金屬-黃金" } });
    // Bonds split
    buckets.push({ id: "us-bond-long", name: "長期美債", pct: bondPct * 0.6,
      criteria: { subclass: "債券-種類-美國公債" } });
    buckets.push({ id: "ig-bond", name: "投資級債", pct: bondPct * 0.4,
      criteria: { subclass: "債券-種類-投資級公司債" } });
  }

  // 整數化並標準化到 100
  buckets = buckets.map(b => ({ ...b, pct: Math.round(b.pct * 100) }));
  buckets = buckets.filter(b => b.pct > 0);
  const total = buckets.reduce((s, b) => s + b.pct, 0);
  if (total !== 100 && buckets.length) {
    buckets[0].pct += (100 - total);
  }

  return { buckets, stockPct: Math.round(stockPct * 100), bondPct: Math.round(bondPct * 100) };
}

function pickETF(criteria, etfs, alreadyPicked) {
  // 過濾候選
  const baseFilter = (etf) => {
    if (alreadyPicked.has(etf.id)) return false;
    if (etf.leverage && etf.leverage !== "一般") return false;
    return etf.asset_subclass && etf.asset_subclass.includes(criteria.subclass);
  };

  let candidates = etfs.filter(baseFilter);

  // 偏好高股息：先嚴格過濾
  if (criteria.preferDividend) {
    const strict = candidates.filter(e => e.investment_type === "高股息");
    if (strict.length) candidates = strict;
  }
  // 偏好市值型
  if (criteria.preferMarketCap) {
    const strict = candidates.filter(e => e.investment_type === "市值型");
    if (strict.length) candidates = strict;
  }

  // 排序：被動優先 → 代碼數字小者優先（通常 = 較老牌、規模較大）
  candidates.sort((a, b) => {
    if (a.active_passive !== b.active_passive) {
      return a.active_passive === "被動" ? -1 : 1;
    }
    const codeA = parseInt(a.code.replace(/\D/g, ""), 10) || 99999;
    const codeB = parseInt(b.code.replace(/\D/g, ""), 10) || 99999;
    return codeA - codeB;
  });

  return candidates[0] || null;
}

function recommend(answers, etfs) {
  const plan = bucketize(answers);
  const picked = new Set();
  const results = [];

  for (const bucket of plan.buckets) {
    const etf = pickETF(bucket.criteria, etfs, picked);
    if (etf) {
      picked.add(etf.id);
      results.push({ bucket, etf });
    } else {
      // 找不到也保留桶供顯示
      results.push({ bucket, etf: null });
    }
  }
  return { ...plan, results };
}

// ---------- Hero CTA ----------
function RecommendHero({ onOpen, hasUsed }) {
  return (
    <div className={`rec-hero ${hasUsed ? "rec-hero--mini" : ""}`}>
      <div className="rec-hero__icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      </div>
      <div className="rec-hero__text">
        <div className="rec-hero__title">{hasUsed ? "重新進行智能配置推薦" : "不知道從哪開始？"}</div>
        <div className="rec-hero__subtitle">
          {hasUsed
            ? "回答 5 個問題，更新你的 ETF 組合建議"
            : "回答 5 個問題，找出適合你的 ETF 組合"}
        </div>
      </div>
      <button className="rec-hero__btn" onClick={onOpen}>
        {hasUsed ? "重新推薦" : "開始推薦"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}

// ---------- Step Indicator ----------
function StepDots({ current, total }) {
  return (
    <div className="rec-dots">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`rec-dot ${i < current ? "rec-dot--done" : ""} ${i === current ? "rec-dot--on" : ""}`} />
      ))}
    </div>
  );
}

// ---------- Allocation Bar ----------
const BUCKET_COLORS = {
  "tw-core":      { bg: "#2A5F59", fg: "#FFFFFF" },
  "us-core":      { bg: "#D9E74C", fg: "#1A3F3A" },
  "global":       { bg: "#75C566", fg: "#FFFFFF" },
  "theme":        { bg: "#295CB5", fg: "#FFFFFF" },
  "theme-tech":   { bg: "#295CB5", fg: "#FFFFFF" },
  "tw-div":       { bg: "#99CFF5", fg: "#1A3F3A" },
  "gold":         { bg: "#FBF344", fg: "#1A3F3A" },
  "us-bond":      { bg: "#F06838", fg: "#FFFFFF" },
  "us-bond-long": { bg: "#D3C3E8", fg: "#1A3F3A" },
  "ig-bond":      { bg: "#FCBCCA", fg: "#1A3F3A" },
};
function colorFor(id) { return (BUCKET_COLORS[id] || { bg: "#7A7A7A", fg: "#FFFFFF" }).bg; }
function textColorFor(id) { return (BUCKET_COLORS[id] || { bg: "#7A7A7A", fg: "#FFFFFF" }).fg; }

function RecDivStrip({ months }) {
  const has = months && months.length > 0;
  const set = new Set(months || []);
  return (
    <div className="rec-div" title={has ? `配息月份: ${months.join(", ")}` : "無配息"}>
      {Array.from({ length: 12 }, (_, i) => {
        const m = i + 1, on = set.has(m);
        return <span key={m} className={`rec-div__cell ${on ? "rec-div__cell--on" : ""}`}>{m}</span>;
      })}
    </div>
  );
}

function AllocationBar({ buckets }) {
  return (
    <div className="rec-bar">
      <div className="rec-bar__track">
        {buckets.map((b, i) => (
          <div
            key={b.id}
            className="rec-bar__seg"
            style={{ flex: b.pct, background: colorFor(b.id), color: textColorFor(b.id) }}
            title={`${b.name} ${b.pct}%`}
          >
            {b.pct >= 8 && <span className="rec-bar__pct">{b.pct}%</span>}
          </div>
        ))}
      </div>
      <div className="rec-bar__legend">
        {buckets.map(b => (
          <div key={b.id} className="rec-bar__lg">
            <span className="rec-bar__sw" style={{ background: colorFor(b.id) }} />
            <span className="rec-bar__lbl">{b.name}</span>
            <span className="rec-bar__num">{b.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Modal Frame ----------
function RecommendModal({ etfs, onClose, onDone, onAddFavs }) {
  const [step, setStep] = useStateR(0);
  const [answers, setAnswers] = useStateR({
    age: 35,
    risk: null,
    diversification: null,
    goal: null,
    cashFlow: null,
  });
  const [result, setResult] = useStateR(null);

  useEffectR(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isResult = step >= QUESTIONS.length;
  const totalSteps = QUESTIONS.length;
  const currentQ = QUESTIONS[step];

  const canProceed = isResult ? false : (
    currentQ.type === "slider" ? true : answers[currentQ.id] != null
  );

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      const r = recommend(answers, etfs);
      setResult(r);
      setStep(step + 1);
      try {
        localStorage.setItem(REC_STATE_KEY, JSON.stringify({
          hasUsed: true,
          lastAnswers: answers,
          lastAt: new Date().toISOString(),
        }));
      } catch {}
      if (onDone) onDone();
    }
  };

  const handleBack = () => {
    if (isResult) {
      setStep(totalSteps - 1);
      setResult(null);
    } else if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleAddAllFavs = () => {
    if (!result) return;
    const ids = result.results.filter(r => r.etf).map(r => r.etf.id);
    onAddFavs(ids);
  };

  return ReactDOM.createPortal(
    <div className="rec-overlay" role="dialog" aria-modal="true">
      <div className="rec-overlay__scrim" onClick={onClose} />
      <div className="rec-modal">
        <header className="rec-modal__head">
          <div className="rec-modal__title">{isResult ? "您的專屬配置建議" : "智能配置推薦"}</div>
          <button className="rec-modal__close" onClick={onClose} aria-label="關閉">×</button>
        </header>

        {!isResult && (
          <div className="rec-modal__progress">
            <StepDots current={step} total={totalSteps} />
            <span className="rec-modal__count">{step + 1} / {totalSteps}</span>
          </div>
        )}

        <div className="rec-modal__body">
          {!isResult ? (
            <QuestionView
              question={currentQ}
              value={answers[currentQ.id]}
              onChange={(v) => setAnswers(a => ({ ...a, [currentQ.id]: v }))}
            />
          ) : (
            <ResultView result={result} answers={answers} />
          )}
        </div>

        <footer className="rec-modal__foot">
          {!isResult ? (
            <>
              <button className="rec-btn rec-btn--ghost" onClick={handleBack} disabled={step === 0}>← 上一題</button>
              <button className="rec-btn rec-btn--primary" onClick={handleNext} disabled={!canProceed}>
                {step === totalSteps - 1 ? "看推薦結果 →" : "下一題 →"}
              </button>
            </>
          ) : (
            <>
              <button className="rec-btn rec-btn--ghost" onClick={handleBack}>← 修改答案</button>
              <button className="rec-btn rec-btn--primary" onClick={handleAddAllFavs}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.3l7.1-.7L12 2z"/></svg>
                將推薦 ETF 全部加入最愛
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}

// ---------- Question View ----------
function QuestionView({ question, value, onChange }) {
  return (
    <div className="rec-q">
      <div className="rec-q__title">{question.title}</div>
      <div className="rec-q__subtitle">{question.subtitle}</div>

      {question.type === "slider" ? (
        <div className="rec-q__slider">
          <div className="rec-q__sliderval">
            <span className="rec-q__sliderbig">{value ?? question.default}</span>
            <span className="rec-q__sliderunit">歲</span>
          </div>
          <input
            type="range"
            min={question.min} max={question.max} step={question.step}
            value={value ?? question.default}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="rec-q__sliderrange">
            <span>{question.min} 歲</span>
            <span>{question.max} 歲</span>
          </div>
        </div>
      ) : (
        <div className={`rec-q__cards rec-q__cards--${question.options.length}`}>
          {question.options.map(opt => (
            <button
              key={opt.value}
              className={`rec-card ${value === opt.value ? "rec-card--on" : ""}`}
              onClick={() => onChange(opt.value)}
            >
              <div className="rec-card__label">{opt.label}</div>
              <div className="rec-card__desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Result View ----------
function ResultView({ result, answers }) {
  const { buckets, results, stockPct, bondPct } = result;
  const profile = describeProfile(answers, stockPct, bondPct);
  const reasoning = explainReasoning(answers, stockPct, bondPct);

  return (
    <div className="rec-result">
      <div className="rec-summary">
        <div className="rec-summary__profile">{profile}</div>
        <div className="rec-summary__split">
          股 <strong>{stockPct}%</strong> / 債 <strong>{bondPct}%</strong>
          {hasOtherAssets(buckets) && <span className="rec-summary__other">＋ 其他資產</span>}
        </div>
      </div>

      <div className="rec-section">
        <div className="rec-section__head">建議資產配置比例</div>
        <AllocationBar buckets={buckets} />
      </div>

      <div className="rec-section">
        <div className="rec-section__head">推薦 ETF</div>
        <div className="rec-etfs">
          {results.map(({ bucket, etf }) => (
            <div key={bucket.id} className="rec-etf">
              <div className="rec-etf__sw" style={{ background: colorFor(bucket.id) }} />
              <div className="rec-etf__bucket">
                <div className="rec-etf__bname">{bucket.name}</div>
                <div className="rec-etf__bpct">{bucket.pct}%</div>
              </div>
              {etf ? (
                <div className="rec-etf__detail">
                  <div className="rec-etf__code">{etf.code}</div>
                  <div className="rec-etf__name">{etf.name}</div>
                  <RecDivStrip months={etf.dividend_months || []} />
                </div>
              ) : (
                <div className="rec-etf__detail rec-etf__detail--empty">
                  <span>資料庫無對應 ETF</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rec-section">
        <div className="rec-section__head">為什麼是這個配置？</div>
        <ol className="rec-reasoning">
          {reasoning.map((line, i) => (
            <li key={i}>
              <span className="rec-reasoning__label">{line.label}</span>
              <span className="rec-reasoning__detail">{line.detail}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rec-disclaimer">
        <div className="rec-disclaimer__title">免責聲明與理論來源</div>
        <p>本推薦僅供參考，<strong>不構成任何投資建議</strong>。投資前請評估自身財務狀況、諮詢專業顧問，並自行承擔風險。</p>
        <p className="rec-disclaimer__theory">演算法基於下列投資理論：</p>
        <ul>
          <li><strong>現代投資組合理論</strong>（Modern Portfolio Theory）— Harry Markowitz, 1952（諾貝爾經濟學獎）</li>
          <li><strong>年齡導向資產配置法則</strong>（Age-Based Asset Allocation, 110 法則）— John Bogle 等指數投資先驅倡導</li>
          <li><strong>核心衛星配置策略</strong>（Core-Satellite Strategy）— Vanguard Group</li>
        </ul>
        <p className="rec-disclaimer__note">推薦組合會依您填寫的答案動態計算，每次調整答案結果可能不同。</p>
      </div>
    </div>
  );
}

function explainReasoning(answers, stockPct, bondPct) {
  const { age, risk, diversification, goal, cashFlow } = answers;
  const riskLabel = { conservative: "保守", balanced: "穩健", aggressive: "積極" }[risk];
  const riskMult = { conservative: 0.85, balanced: 1.0, aggressive: 1.15 }[risk];
  const baseStock = Math.round((110 - age));
  const divLabel = { single: "集中型（1-2 支）", balanced: "適度分散（4-5 支）", diversified: "高度分散（7-8 支）" }[diversification];
  const goalLabel = {
    "retirement": "退休準備",
    "long-term-growth": "長期資產成長",
    "mid-term": "中期目標",
    "passive-income": "被動收入",
  }[goal];
  const cashFlowLabel = {
    "no-need": "不需要配息",
    "partial": "希望部分配息",
    "main-income": "依賴配息為主要收入",
  }[cashFlow];

  const lines = [];

  // 1. Age base
  lines.push({
    label: `年齡 ${age} 歲`,
    detail: `依「110 法則」基礎股票比例為 ${baseStock}%（110 − ${age}），剩餘 ${100 - baseStock}% 配置於債券與避險資產。`,
  });

  // 2. Risk
  lines.push({
    label: `${riskLabel}風險`,
    detail: risk === "conservative"
      ? `股票比例下調 15%（×${riskMult}），增加債券比重以降低波動。`
      : risk === "aggressive"
        ? `股票比例上調 15%（×${riskMult}），追求較高的長期報酬。`
        : `維持標準股債比例（×${riskMult}），平衡成長與穩定。`,
  });

  // 3. Goal
  let goalDetail = "";
  if (goal === "retirement") goalDetail = age >= 50 ? "因接近退休，股票部位再下調 10% 保護本金。" : "20 年以上長線投資，維持原本股債比。";
  else if (goal === "long-term-growth") goalDetail = "10-20 年時間軸允許承擔更多波動，股票部位上調 10%。";
  else if (goal === "mid-term") goalDetail = "3-10 年內需動用資金，股票部位下調 25% 降低短期回撤風險。";
  else if (goal === "passive-income") goalDetail = "重視配息現金流，股票部位略降 15% 改配高息資產與債券。";
  lines.push({ label: `目的：${goalLabel}`, detail: goalDetail });

  // 4. Cash flow
  let cfDetail = "";
  if (cashFlow === "main-income") cfDetail = "依賴配息生活，再降股票 20% 並大幅偏向高股息 ETF。";
  else if (cashFlow === "partial") cfDetail = "適度偏向高股息 ETF，但仍保留成長型核心持股。";
  else cfDetail = "全部再投入累積資產，優先選擇市值型核心 ETF，最大化複利。";
  lines.push({ label: `現金流：${cashFlowLabel}`, detail: cfDetail });

  // 5. Final allocation
  lines.push({
    label: "最終配置",
    detail: `經以上調整後，股 ${stockPct}% / 債 ${bondPct}%（必要時加入黃金等避險資產）。`,
  });

  // 6. Diversification
  let divDetail = "";
  if (diversification === "single") divDetail = "用 1 支台股核心 + 1 支美債達成最簡單的全球配置。";
  else if (diversification === "balanced") divDetail = "拆成台股、美股、債券三大塊，搭配少量主題或高息加強。";
  else divDetail = "進一步加入全球股、新興市場、產業主題、黃金避險、雙債等，跨資產降低相關性。";
  lines.push({ label: `多元性：${divLabel}`, detail: divDetail });

  // 7. ETF picking rule
  lines.push({
    label: "ETF 篩選邏輯",
    detail: "每個配置桶從您 Sheet 中符合條件的 ETF 評分挑選：被動型優於主動型、規模較大（代碼較舊）優先、排除槓桿反向產品。",
  });

  return lines;
}

function describeProfile(answers, stockPct, bondPct) {
  const { age, risk, diversification } = answers;
  const riskLabel = { conservative: "保守", balanced: "穩健", aggressive: "積極" }[risk];
  const divLabel = { single: "集中型", balanced: "適度分散", diversified: "高度分散" }[diversification];
  return `${age} 歲｜${riskLabel}風險｜${divLabel}`;
}

function hasOtherAssets(buckets) {
  return buckets.some(b => !b.id.includes("core") && !b.id.includes("bond") && !b.id.includes("div"));
}

// ---------- Public hook to read state ----------
function useRecommenderState() {
  const [state, setState] = useStateR(() => {
    try {
      const raw = localStorage.getItem(REC_STATE_KEY);
      return raw ? JSON.parse(raw) : { hasUsed: false };
    } catch { return { hasUsed: false }; }
  });
  const markUsed = () => {
    setState(s => ({ ...s, hasUsed: true }));
  };
  return [state, markUsed];
}

Object.assign(window, {
  RecommendHero,
  RecommendModal,
  useRecommenderState,
});
