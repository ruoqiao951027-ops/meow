// 健康週報卡片：分數、體重折線、症狀本週 vs 平常
const LEVEL_EMOJI = { green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴' }

function WeightLine({ weights }) {
  if (weights.length < 2) return <p className="hc-empty">體重紀錄不足，記錄 2 次以上就能看到趨勢</p>
  const W = 240
  const H = 64
  const kgs = weights.map((w) => w.kg)
  const min = Math.min(...kgs)
  const max = Math.max(...kgs)
  const span = max - min || 1
  const pts = weights.map((w, i) => [8 + (i / (weights.length - 1)) * (W - 16), 10 + (1 - (w.kg - min) / span) * (H - 22)])
  const last = pts.at(-1)
  return (
    <svg className="hc-line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`體重從 ${kgs[0]} kg 到 ${kgs.at(-1)} kg`}>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.5 : 2} />)}
      <text x={8} y={H - 2}>{weights[0].d}</text>
      <text x={W - 8} y={H - 2} textAnchor="end">{weights.at(-1).d}</text>
      <text className="hc-line-val" x={Math.min(last[0], W - 30)} y={Math.max(9, last[1] - 6)} textAnchor="middle">{kgs.at(-1)}</text>
    </svg>
  )
}

export default function HealthCard({ r }) {
  const maxObs = Math.max(1, ...r.obs.map((o) => Math.max(o.recent, o.baseWeek)))
  return (
    <div className={`hc lv-${r.level}`}>
      <div className="hc-head">
        <div className="hc-score" style={{ '--p': r.score }}>
          <b>{r.score}</b>
          <span>分</span>
        </div>
        <div className="hc-title">
          <p className="hc-name">{r.pet} 的健康週報</p>
          <p className="hc-range">{r.range}・近 4 週</p>
          <p className="hc-level">
            {LEVEL_EMOJI[r.level]} {r.label}
          </p>
        </div>
      </div>

      {r.flags.length > 0 && (
        <div className="hc-flags">
          {r.flags.map((f) => <span key={f}>{f}</span>)}
        </div>
      )}

      <div className="hc-sec">
        <p className="hc-sec-title">
          體重
          {r.weightPct != null && (
            <em className={Math.abs(r.weightPct) >= 3 ? 'warn' : ''}>
              {r.weightPct > 0 ? '+' : ''}
              {r.weightPct}%
            </em>
          )}
        </p>
        <WeightLine weights={r.weights} />
      </div>

      {r.obs.length > 0 && (
        <div className="hc-sec">
          <p className="hc-sec-title">
            特殊狀況次數 <small>本週 ／ 平常每週</small>
          </p>
          {r.obs.map((o) => (
            <div key={o.name} className="hc-bar">
              <span className="hc-bar-name">{o.name}</span>
              <span className="hc-bar-track">
                <i className="now" style={{ width: `${(o.recent / maxObs) * 100}%` }} />
                <i className="base" style={{ width: `${(o.baseWeek / maxObs) * 100}%` }} />
              </span>
              <span className="hc-bar-num">
                {o.recent} ／ {o.baseWeek}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="hc-stats">
        <span>
          正餐吃完<b>{r.mealsPct ?? '—'}%</b>
        </span>
        <span>
          零食/天<b>{r.snackRecent}</b>
        </span>
        <span>
          心情<b>{r.moodRecent ?? '—'}★</b>
        </span>
      </div>
      {r.demoDays > 0 && <p className="hc-demo">＊有 {r.demoDays} 天沒有紀錄，以示範資料補上</p>}
    </div>
  )
}
