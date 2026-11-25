// 語音輸入的「關鍵字比對」：把一句話拆成各個欄位
// 展示用，只認得事先寫好的說法；每個 parser 回傳 { fields: [{ label, value }], patch }

// ---------- 數字 ----------
const DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
const NUM = '[\\d零〇一二兩三四五六七八九十百]+(?:[點.][\\d零〇一二三四五六七八九]+)?'

export function cnToNum(s) {
  if (!s) return NaN
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)
  const [int, dec] = s.split(/[點.]/)
  let n = 0
  let cur = 0
  for (const ch of int) {
    if (ch in DIGIT) cur = DIGIT[ch]
    else if (/\d/.test(ch)) cur = cur * 10 + Number(ch)
    else if (ch === '十') { n += (cur || 1) * 10; cur = 0 }
    else if (ch === '百') { n += (cur || 1) * 100; cur = 0 }
  }
  n += cur
  if (dec) n = Number(`${n}.${[...dec].map((c) => (c in DIGIT ? DIGIT[c] : c)).join('')}`)
  return n
}

// 年份逐字念：二零二四 → 2024
const yearNum = (s) => (/^\d+$/.test(s) ? Number(s) : Number([...s].map((c) => DIGIT[c] ?? '').join('')))

// ---------- 前處理：語音辨識常常沒有標點，在常見的轉折詞前補逗號 ----------
function normalize(text) {
  return text
    .trim()
    .replace(/\s+/g, '，')
    .replace(/(然後|還有|而且|醫生說|(?:之後|以後)(?:要注意)?|要注意|提醒我)/g, '，$1')
    .replace(/^，+/, '')
}

const splitClauses = (text) =>
  text
    .split(/[，,。;；！!？?\n]+/)
    .map((c) => c.replace(/^(然後|還有|而且|就|在|去|到|有|了|的)+/, '').trim())
    .filter((c) => c.length >= 2)

// 逐步「吃掉」已經辨識的片段，剩下的當作描述
function makeCtx(raw) {
  let rest = normalize(raw)
  return {
    all: rest,
    take(re) {
      const m = rest.match(re)
      if (m) rest = rest.replace(m[0], '，')
      return m
    },
    rest: () => rest,
    leftover: () => splitClauses(rest),
  }
}

// ---------- 共用欄位 ----------
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dot = (s) => s.replaceAll('-', '.')

function takeDate(ctx) {
  const now = new Date()
  const rel = ctx.take(/大前天|前天|昨天|今天/)
  if (rel) {
    const back = { 今天: 0, 昨天: 1, 前天: 2, 大前天: 3 }[rel[0]]
    return iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back))
  }
  const m = ctx.take(new RegExp(`(?:(去年|前年|(\\d{4}|[零〇一二三四五六七八九]{4})年))?(上個月|(${NUM})月)(${NUM})[號日]`))
  if (!m) return ''
  let y = now.getFullYear()
  if (m[1] === '去年') y -= 1
  else if (m[1] === '前年') y -= 2
  else if (m[2]) y = yearNum(m[2])
  // 月份換成 1–12；「上個月」= 本月 getMonth()（0-based）剛好就是上個月的 1-based
  const mo = m[3] === '上個月' ? now.getMonth() : cnToNum(m[4])
  const d = new Date(y, mo - 1, cnToNum(m[5]))
  // 沒講年份又落在未來 → 視為去年
  if (!m[1] && d > now) d.setFullYear(d.getFullYear() - 1)
  return Number.isNaN(d.getTime()) ? '' : iso(d)
}

function takeHospital(ctx) {
  const m = ctx.take(/([^，]{0,12}?)(動物醫院|醫院|診所)/)
  if (!m) return ''
  const name = m[1].replace(/^.*(在|去|到|於|看|帶|是|地點)/, '')
  return name ? name + m[2] : ''
}

// 「之後要注意…」類的句子分到 impact，其他當描述
function splitNotes(clauses) {
  const isImpact = (c) => /注意|記得|以後|之後|不要|避免|要多|小心/.test(c)
  return {
    desc: clauses.filter((c) => !isImpact(c)).join('，'),
    impact: clauses.filter(isImpact).join('，'),
  }
}

const result = (pairs, patch) => ({
  fields: pairs.filter(([, v]) => v !== '' && v != null).map(([label, value]) => ({ label, value: String(value) })),
  patch: Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== '' && v != null)),
})

// 某個關鍵字附近的「N 次」；沒講次數回傳 1；前面有「沒」視為否定回傳 0
function countNear(clause, kw) {
  const at = clause.search(kw)
  if (at < 0) return null
  if (/(沒有|沒|不|無)$/.test(clause.slice(Math.max(0, at - 3), at))) return 0
  const after = clause.slice(at)
  const m = after.match(new RegExp(`(${NUM})\\s*[次下回]`)) || clause.match(new RegExp(`(${NUM})\\s*[次下回]`))
  return m ? cnToNum(m[1]) : 1
}

// ---------- 日常頁：今天的 name ----------
const DAILY_EXTRA = ['拉肚子', '軟便', '打噴嚏', '流眼淚', '抓癢', '沒食慾', '便秘']

export function parseDaily(text, obsKeys) {
  const clauses = splitClauses(normalize(text))
  const patch = {}
  const fields = []
  const obs = {}

  for (const c of clauses) {
    const oral = /內服藥|吃藥|餵藥|口服/.test(c) ? countNear(c, /內服藥|吃藥|餵藥|口服/) : null
    if (oral != null) patch.oral = oral
    const top = /外用藥|擦藥|點藥|上藥|藥膏|眼藥|耳朵藥/.test(c) ? countNear(c, /外用藥|擦藥|點藥|上藥|藥膏|眼藥|耳朵藥/) : null
    if (top != null) patch.topical = top

    const w = c.match(new RegExp(`(?:體重|重)\\D{0,3}?(${NUM})\\s*(?:公斤|kg|KG|Kg)?`)) || c.match(new RegExp(`(${NUM})\\s*(?:公斤|kg|KG)`))
    if (w) patch.weight = String(cnToNum(w[1]))

    // 心情：幾顆星，或開心 / 普通 / 不好
    const star = c.match(new RegExp(`(${NUM})\\s*顆?星`))
    if (/心情|星/.test(c)) {
      if (star) patch.mood = Math.min(5, cnToNum(star[1]))
      else if (/不好|很差|不開心|低落/.test(c)) patch.mood = 1
      else if (/普通|還好|一般/.test(c)) patch.mood = 3
      else if (/很好|超好|開心|不錯/.test(c)) patch.mood = 5
    }

    const keys = [...new Set([...obsKeys, ...DAILY_EXTRA])]
    for (const k of keys) {
      const alias = { 嘔吐: /嘔吐|吐/, 頻尿: /頻尿|一直尿|尿很多/, 咳嗽: /咳嗽|咳/ }[k] || new RegExp(k)
      if (!alias.test(c)) continue
      obs[k] = countNear(c, alias)
    }
  }

  if (patch.mood != null) fields.push({ label: '心情', value: '★'.repeat(patch.mood) })
  if (patch.oral != null) fields.push({ label: '內服藥', value: `${patch.oral} 次` })
  if (patch.topical != null) fields.push({ label: '外用藥', value: `${patch.topical} 次` })
  if (patch.weight) fields.push({ label: '體重', value: `${patch.weight} kg` })
  for (const [k, n] of Object.entries(obs)) fields.push({ label: k, value: n === 0 ? '沒有' : `${n} 次` })
  if (Object.keys(obs).length) patch.obs = obs
  return { fields, patch }
}

// ---------- 紀錄頁 ----------
const DISEASE_WORDS = [
  '上呼吸道感染', '皮膚過敏', '食物過敏', '雞肉過敏', '急性腸胃炎', '腸胃炎', '外耳炎', '中耳炎', '結膜炎', '膀胱炎', '尿道結石',
  '膀胱結石', '口炎', '牙齦炎', '黴菌感染', '皮膚病', '心絲蟲', '腎臟病', '糖尿病', '胰臟炎', '便秘', '感冒', '過敏', '拉肚子', '耳朵發炎',
]

export function parseDisease(text) {
  const ctx = makeCtx(text)
  const date = takeDate(ctx)
  const place = takeHospital(ctx)
  let name = DISEASE_WORDS.find((w) => ctx.all.includes(w)) || ''
  if (!name) {
    const m = ctx.all.match(/(?:得了|生了|診斷是|是)([一-鿿]{2,6}?)(?:，|。|的|$)/)
    if (m) name = m[1]
  }
  const { desc, impact } = splitNotes(ctx.leftover())
  return result(
    [['病名', name], ['日期', date && dot(date)], ['地點', place], ['怎麼處理', desc], ['之後要注意', impact]],
    { name, date, place, desc, impact },
  )
}

const MED_WORDS = [
  '心絲蟲預防藥', '體外驅蟲口服錠', '體內驅蟲藥', '體外驅蟲藥', '驅蟲藥', '除蚤滴劑', '關節保健品', '腎臟保健品', '益生菌', '魚油',
  '化毛膏', '止癢藥', '止瀉藥', '止吐藥', '抗生素', '消炎藥', '眼藥水', '耳朵藥水', '藥膏', '類固醇',
]

export function parseMed(text) {
  const ctx = makeCtx(text)
  const all = ctx.all
  let name = MED_WORDS.find((w) => all.includes(w)) || ''
  if (!name) {
    const m = all.match(/([一-鿿]{1,6}?(?:藥水|藥膏|藥|錠|膏|保健品|滴劑))/)
    if (m) name = m[1].replace(/^(要|吃|點|擦|餵|開了|開)+/, '')
  }
  const every = /每週|每個禮拜|一週|一個禮拜|每星期/.test(all) ? '每週' : /每個?月|一個月/.test(all) ? '每月' : /每天|一天|每日/.test(all) ? '每天' : ''
  const tm = all.match(new RegExp(`(?:一天|每天|每日|每週|一週|每個禮拜|一個禮拜|每個?月|一個月)[^，\\d]{0,2}?(${NUM})\\s*次`)) || all.match(new RegExp(`(${NUM})\\s*次`))
  const times = tm ? cnToNum(tm[1]) : ''
  const dm = all.match(new RegExp(`(?:共|吃|用|點|擦|連續|療程)\\s*(${NUM})\\s*(天|個禮拜|週)`))
  const days = dm ? cnToNum(dm[1]) * (dm[2] === '天' ? 1 : 7) : ''
  const kind = days || /短期|療程|生病|這幾天/.test(all) ? 'short' : /固定|長期|保健|每個?月/.test(all) ? 'fixed' : ''

  let time = ''
  const t = all.match(new RegExp(`(早上|上午|中午|下午|晚上)?\\s*(${NUM})\\s*點\\s*(半|(${NUM})\\s*分?)?`))
  if (t) {
    let h = cnToNum(t[2])
    if (/下午|晚上/.test(t[1] || '') && h < 12) h += 12
    const min = t[3] === '半' ? 30 : t[4] ? cnToNum(t[4]) : 0
    if (h >= 0 && h < 24 && min < 60) time = `${pad(h)}:${pad(min)}`
  }
  const remind = /不用提醒|不要提醒/.test(all) ? false : /提醒/.test(all) ? true : ''

  const note = (all.match(/(?:備註|要記得|記得)([^，]+)/) || [])[1] || ''
  return result(
    [
      ['類型', kind && (kind === 'fixed' ? '固定用藥' : '短期治療')],
      ['藥名', name],
      ['頻率', every && times ? `${every} ${times} 次` : every || (times && `${times} 次`)],
      ['天數', days && `${days} 天`],
      ['時間', time],
      ['提醒', remind === '' ? '' : remind ? 'Yes' : 'No'],
      ['備註', note],
    ],
    { kind, name, every, times, days, time, remind, note },
  )
}

const INJURY_WORDS = ['擦傷', '割傷', '咬傷', '抓傷', '骨折', '扭傷', '燙傷', '脫臼', '跛腳', '撞傷', '流血']
const SURGERY_WORDS = ['結紮', '洗牙', '拔牙', '眼皮矯正', '腫瘤切除', '膝蓋手術', '異物取出', '縫合']

export function parseInjury(text) {
  const ctx = makeCtx(text)
  const all = ctx.all
  const date = takeDate(ctx)
  const hospital = takeHospital(ctx)
  const surgery = SURGERY_WORDS.find((w) => all.includes(w))
  const type = surgery || /手術|開刀/.test(all) ? '手術' : '傷病'
  let title = ''
  if (surgery) title = surgery + (/手術/.test(surgery) ? '' : '手術')
  else {
    const hurt = INJURY_WORDS.find((w) => all.includes(w))
    if (hurt) {
      const part = all.match(new RegExp(`((?:左|右)?(?:前|後)?(?:腳掌|腳|肉球|眼睛|耳朵|尾巴|鼻子|嘴巴|肚子|背))[^，]{0,4}?${hurt}`))
      title = (part ? part[1] : '') + hurt
    }
  }
  const { desc, impact } = splitNotes(ctx.leftover())
  return result(
    [['類型', type], ['名稱', title], ['日期', date && dot(date)], ['醫院', hospital], ['簡述', desc], ['之後要注意', impact]],
    { type, title, date, hospital, desc, impact },
  )
}

const CN_COMBO = { 3: '三', 5: '五', 8: '八', 10: '十' }

export function parseVaccine(text, types) {
  const ctx = makeCtx(text.replace(/(10|[358])\s*合\s*1/g, (_, n) => `${CN_COMBO[n]}合一`))
  const date = takeDate(ctx)
  const place = takeHospital(ctx)
  let name = ''
  let custom = ''
  const known = types.find((t) => t !== '其他' && ctx.rest().includes(t.replace('病', '')))
  if (known) {
    name = known
    ctx.take(new RegExp(`${known.replace('病', '')}病?(疫苗)?`))
  } else {
    const m = ctx.take(/([^，]{2,10}?)疫苗/)
    if (m) {
      name = '其他'
      custom = m[1].replace(/^.*(打了|打|施打|接種)/, '') + '疫苗'
    }
  }
  const note = ctx
    .leftover()
    .filter((c) => !/^(打了?|打完了?|去打|接種|疫苗)$/.test(c))
    .join('，')
  return result(
    [['日期', date && dot(date)], ['疫苗', name === '其他' ? custom : name], ['地點', place], ['備註', note]],
    { date, name, custom, place, note },
  )
}

export function parseVisit(text) {
  const ctx = makeCtx(text)
  const date = takeDate(ctx)
  const hospital = takeHospital(ctx)
  const rest = ctx
    .leftover()
    .map((c) => c.replace(/^(因為|看診|去看|原因是)+/, ''))
    .filter((c) => c.length >= 2)
  const isReminder = (c) => /每天|一天|藥|不要|避免|記得|回診|天後|禁止|頭套|洗澡/.test(c)
  const reason = rest.find((c) => !isReminder(c)) || rest[0] || ''
  const reminders = rest.filter((c) => c !== reason).join('\n')
  return result(
    [['日期', date && dot(date)], ['醫院', hospital], ['看診原因', reason], ['提醒事項', reminders.replaceAll('\n', ' / ')]],
    { date, hospital, reason, reminders },
  )
}

const OTHER_LABELS = [
  ['晶片', /晶片|寵物登記/],
  ['保險', /保險/],
  ['來歷', /領養|認養|撿到|買來|帶回家/],
  ['飲食', /飼料|罐頭|挑食|愛吃|不吃/],
  ['個性', /個性|膽小|怕|黏人|愛撒嬌|兇/],
  ['習慣', /習慣|每天都|喜歡|常常/],
]

export function parseOther(text) {
  const all = normalize(text)
  const said = all.match(/標籤(?:是|寫)?([一-鿿]{1,4})/)
  const label = said ? said[1] : (OTHER_LABELS.find(([, re]) => re.test(all)) || [''])[0]
  const content = splitClauses(said ? all.replace(said[0], '') : all).join('，')
  return result([['標籤', label], ['內容', content]], { label, text: content })
}
