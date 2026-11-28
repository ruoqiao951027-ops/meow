// AI 健康週報：從日常頁近 4 週的紀錄算出趨勢與健康分數（規則計算），再交給 AI 解讀
// 還沒有紀錄的日子用示範資料補上，展示時才看得出趨勢；使用者真的有記錄的日子一律以真實資料為準
const DAYS = 28

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const md = (key) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
const round1 = (n) => Math.round(n * 10) / 10

function realRecords(pet) {
  const re = new RegExp(`^${pet.storage}-(\\d{4}-\\d{2}-\\d{2})$`)
  const out = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = localStorage.key(i).match(re)
      if (m) out[m[1]] = JSON.parse(localStorage.getItem(m[0]))
    }
  } catch {
    /* 讀不到就當作沒有 */
  }
  return out
}

// 固定亂數：同一天每次打開結果都一樣
function rand(seed) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

// 示範資料：i = 0 是 27 天前，越後面越接近今天
function demoDay(pet, i, date) {
  const r = rand(`${pet.id}-${date}`)
  const yes = (p) => r() < p
  const between = (a, b) => a + Math.floor(r() * (b - a + 1))
  if (pet.species === 'cat') {
    // Stacey：後兩週體重往下掉、頻尿變多、偶爾沒吃完
    const late = i >= 14
    const pee = late ? (yes(0.3 + (i - 14) * 0.05) ? between(1, 3) : 0) : yes(0.1) ? 1 : 0
    const vomit = yes(0.07) ? 1 : 0
    const meals = Array.from({ length: pet.meals }, (_, j) => !(i >= 20 && j === pet.meals - 1 && yes(0.45)))
    return {
      mood: late ? between(3, 4) : between(4, 5),
      meals,
      snack: between(1, 2),
      oral: yes(0.95) ? 1 : 0,
      topical: 0,
      weight: i % 3 === 0 ? ((late ? 4.6 - (i - 13) * 0.024 : 4.6) + (r() - 0.5) * 0.04).toFixed(2) : '',
      obs: { 嘔吐: vomit > 0, 頻尿: pee > 0, 咳嗽: false },
      obsCount: { ...(vomit && { 嘔吐: '1' }), ...(pee && { 頻尿: String(pee) }) },
    }
  }
  // 年糕：體重慢慢上升、零食變多、最近又開始抓耳朵，耳朵藥水偶爾漏點
  const late = i >= 20
  const scratch = late ? (yes(0.7) ? between(2, 5) : 0) : yes(0.1) ? 1 : 0
  const vomit = yes(0.03) ? 1 : 0
  // 最近一週開始點耳朵藥水（一天 2 次），中間漏了幾天
  const topical = i >= 21 ? [2, 0, 2, 1, 2, 0, 2][i - 21] : 0
  return {
    mood: between(4, 5),
    meals: Array(pet.meals).fill(true),
    snack: late ? between(4, 5) : between(2, 3),
    oral: yes(0.9) ? 1 : 0,
    topical,
    weight: i % 3 === 1 ? (8.3 + i * 0.02 + (r() - 0.5) * 0.06).toFixed(2) : '',
    obs: { 嘔吐: vomit > 0, 頻尿: false, 咳嗽: false, 抓耳朵: scratch > 0 },
    obsCount: { ...(vomit && { 嘔吐: '1' }), ...(scratch && { 抓耳朵: String(scratch) }) },
  }
}

const countOf = (rec, k) => (rec?.obs?.[k] ? Number(rec.obsCount?.[k]) || 1 : 0)
const sum = (rows, fn) => rows.reduce((s, r) => s + fn(r), 0)

export function healthStats(pet) {
  const real = realRecords(pet)
  const now = new Date()
  const rows = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (DAYS - 1 - i))
    const date = dayKey(d)
    const isToday = i === DAYS - 1
    if (real[date]) return { date, rec: real[date], demo: false }
    return { date, rec: isToday ? null : demoDay(pet, i, date), demo: !isToday }
  })
  const recent = rows.slice(-7).filter((r) => r.rec)
  const base = rows.slice(0, DAYS - 7).filter((r) => r.rec)
  const baseWeeks = Math.max(1, base.length / 7)

  // 體重：最近一次 vs 前三週平均
  const weights = rows.filter((r) => Number(r.rec?.weight) > 0).map((r) => ({ date: r.date, kg: Number(r.rec.weight) }))
  const baseW = avg(weights.filter((w) => w.date < rows[DAYS - 14].date).map((w) => w.kg))
  const lastW = weights.at(-1)
  const weightPct = baseW && lastW && lastW.date >= rows[DAYS - 14].date ? round1(((lastW.kg - baseW) / baseW) * 100) : null

  // 觀察項目次數：本週 vs 前幾週的每週平均
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r.rec?.obs || {})))]
  const obs = keys
    .map((k) => ({
      name: k,
      recent: sum(recent, (r) => countOf(r.rec, k)),
      recentDays: recent.filter((r) => countOf(r.rec, k) > 0).length,
      baseWeek: round1(sum(base, (r) => countOf(r.rec, k)) / baseWeeks),
    }))
    .filter((o) => o.recent > 0 || o.baseWeek > 0)

  const snackRecent = round1(avg(recent.map((r) => Number(r.rec.snack) || 0)) ?? 0)
  const snackBase = round1(avg(base.map((r) => Number(r.rec.snack) || 0)) ?? 0)
  const mealsPct = recent.length ? Math.round((sum(recent, (r) => (r.rec.meals || []).filter(Boolean).length) / (recent.length * pet.meals)) * 100) : null
  const moodRecent = avg(recent.map((r) => r.rec.mood).filter(Boolean))
  const moodBase = avg(base.map((r) => r.rec.mood).filter(Boolean))
  const oralMissed = recent.filter((r) => !Number(r.rec.oral)).length
  // 外用藥：本週有在點的話，算中間漏掉的天數
  const topicalDays = recent.map((r) => Number(r.rec.topical) || 0)
  const firstTopical = topicalDays.findIndex((n) => n > 0)
  const topicalGaps = firstTopical < 0 ? 0 : topicalDays.slice(firstTopical).filter((n) => n === 0).length

  // 健康分數（規則計算，AI 不會改動）
  let score = 100
  const flags = []
  const hit = (points, msg) => {
    score -= points
    flags.push(msg)
  }
  if (weightPct != null) {
    if (weightPct <= -5) hit(20, `體重下降 ${Math.abs(weightPct)}%`)
    else if (weightPct <= -3) hit(10, `體重下降 ${Math.abs(weightPct)}%`)
    else if (weightPct >= 5) hit(10, `體重上升 ${weightPct}%`)
    else if (weightPct >= 3) hit(5, `體重上升 ${weightPct}%`)
  }
  for (const o of obs) {
    if (o.recent >= 3 && o.recent >= o.baseWeek * 2 + 1) hit(15, `${o.name}變多`)
    else if (o.recent >= 2) hit(5, `${o.name} ${o.recent} 次`)
  }
  if (mealsPct != null && mealsPct < 90) hit(10, `食慾下降（吃完 ${mealsPct}%）`)
  if (snackRecent >= 3 && snackRecent >= snackBase * 1.4) hit(5, '零食變多')
  if (topicalGaps >= 2) hit(10, `外用藥漏了 ${topicalGaps} 天`)
  if (oralMissed >= 2) hit(5, `內服藥漏了 ${oralMissed} 天`)
  if (moodRecent && moodBase && moodBase - moodRecent >= 0.8) hit(5, '精神變差')
  score = Math.max(0, score)
  const level = score >= 85 ? 'green' : score >= 70 ? 'yellow' : score >= 50 ? 'orange' : 'red'
  const label = { green: '狀況良好', yellow: '需要留意', orange: '建議就醫檢查', red: '請盡快就醫' }[level]

  return {
    pet: pet.name,
    range: `${md(rows[0].date)}–${md(rows.at(-1).date)}`,
    score,
    level,
    label,
    flags,
    weights: weights.map((w) => ({ d: md(w.date), kg: w.kg })),
    weightPct,
    baseW: baseW ? Math.round(baseW * 100) / 100 : null,
    obs,
    snackRecent,
    snackBase,
    mealsPct,
    moodRecent: moodRecent ? round1(moodRecent) : null,
    moodBase: moodBase ? round1(moodBase) : null,
    oralMissed,
    topicalDays,
    demoDays: rows.filter((r) => r.demo).length,
    recordedDays: rows.filter((r) => r.rec).length,
  }
}

// 給 AI 看的數據摘要
export function healthStatsText(s) {
  const lines = [
    `【App 計算的健康數據】${s.pet}，期間 ${s.range}（近 4 週，最近 7 天為「本週」）`,
    `健康分數：${s.score} 分（${s.label}）；扣分原因：${s.flags.join('、') || '無'}`,
    `體重紀錄：${s.weights.map((w) => `${w.d} ${w.kg}kg`).join('、') || '無'}`,
    s.weightPct != null && `體重變化：最近 ${s.weights.at(-1).kg} kg，比前幾週平均 ${s.baseW} kg 變化 ${s.weightPct > 0 ? '+' : ''}${s.weightPct}%`,
    ...s.obs.map((o) => `${o.name}：本週 ${o.recent} 次（${o.recentDays} 天出現），之前平均每週 ${o.baseWeek} 次`),
    `零食：本週平均每天 ${s.snackRecent} 次，之前平均每天 ${s.snackBase} 次`,
    s.mealsPct != null && `正餐吃完比例（本週）：${s.mealsPct}%`,
    s.moodRecent && `心情星星：本週平均 ${s.moodRecent}，之前 ${s.moodBase}`,
    `內服藥本週沒有紀錄的天數：${s.oralMissed} 天`,
    s.topicalDays.some(Boolean) && `外用藥本週每天次數：${s.topicalDays.join('、')}`,
  ]
  return lines.filter(Boolean).join('\n')
}

// 日常頁近 7 天平均每天吃幾次零食（份量計算用）
export const recentSnackAvg = (pet) => healthStats(pet).snackRecent
