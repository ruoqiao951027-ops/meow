// 把「皇家全站商品資料.xlsx」轉成 App 用的商品資料
// 用法：npm run data:royal            （預設讀專案根目錄的 皇家全站商品資料.xlsx）
//       npm run data:royal -- 其他檔名.xlsx
// 產生：src/data/royalCaninData.js（商品）、src/data/royalCaninFeeding.js（官方餵食表）
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ExcelJS from 'exceljs'

const src = resolve(process.argv[2] || '皇家全站商品資料.xlsx')
const outData = resolve('src/data/royalCaninData.js')
const outFeeding = resolve('src/data/royalCaninFeeding.js')

// 用串流讀取（這個檔案有批註，一般讀法會當掉）
const cellText = (v) => {
  if (v == null) return null
  if (typeof v !== 'object') return v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (v.richText) return v.richText.map((r) => r.text).join('')
  if ('result' in v) return v.result ?? null // 公式欄取計算結果
  if (v.formula) return null
  return v.text ?? v.hyperlink ?? null
}
const sheets = {}
const reader = new ExcelJS.stream.xlsx.WorkbookReader(src, { sharedStrings: 'cache', hyperlinks: 'cache', worksheets: 'emit', styles: 'ignore' })
for await (const ws of reader) {
  const rows = []
  for await (const row of ws) rows.push(row.values.slice(1).map(cellText))
  sheets[ws.name] = rows
}

// 依標題文字找欄位，Excel 欄位順序變了也能讀
function table(rows, headerRow) {
  const head = rows[headerRow].map((h) => (h == null ? '' : String(h).trim()))
  const col = (name) => {
    const i = head.findIndex((h) => h === name || h.startsWith(name))
    if (i < 0) throw new Error(`找不到欄位「${name}」`)
    return i
  }
  return { head, col, body: rows.slice(headerRow + 1).filter((r) => r.some((v) => v != null && v !== '')) }
}
const str = (v) => (v == null ? '' : String(v).replace(/�+/g, '）').trim())
const num = (v) => (typeof v === 'number' ? v : v != null && str(v) !== '' && !Number.isNaN(Number(v)) ? Number(v) : null)
const has = (v) => str(v).startsWith('含')
const maybe = (v) => str(v).startsWith('可能')

// ---------- Sheet1：每列一個商品（規格） ----------
const s1 = table(sheets.Sheet1, 1)
const C = Object.fromEntries(
  Object.entries({
    id: '商品編號', code: '產品代號', title: '商品名稱', image: '商品圖片', url: '商品頁連結', pack: '包裝規格', price: '售價',
    species: '貓或狗', stage: '適用年齡', size: '體型或體重範圍', neutered: '是否適合已結紮', type: '食物型態', tags: '功能標籤',
    features: '官方商品特色', rx: '是否處方', ingredients: '完整成分表', protein_src: '主要蛋白質來源',
    poultry: '雞肉', beef: '牛肉', fish: '魚', pork: '豬肉', grain: '穀物', wheat: '小麥', dairy: '乳製品', soy: '大豆',
    protein: '粗蛋白', fat: '粗脂肪', fiber: '粗纖維', moisture: '水分', ash: '灰分', kcal: '代謝能', feeding: '餵食建議摘要',
    status: '上架狀態', sales: '銷售備註', note: '資料備註', date: '資料擷取日',
  }).map(([k, name]) => [k, s1.col(name)]),
)

const SPECIES = { 狗: 'dog', 貓: 'cat', '貓／狗': 'both', '貓/狗': 'both' }
const TYPE = { 乾糧: 'd', 主食濕糧: 'w', 罐頭: 'c', 液態營養補給: 'l' }
const stageOf = (s) => (/熟齡/.test(s) ? 's' : /離乳|懷孕|哺乳/.test(s) ? 'b' : /^幼/.test(s) ? 'y' : 'a')
function rxOf(v, tags) {
  const s = str(v)
  if (/重症/.test(s) || tags.some((t) => /重症|恢復期/.test(t))) return 3
  if (s.startsWith('是')) return 1
  if (s.startsWith('否')) return 0
  return 2
}
function flagsOf(r, tags) {
  // 品名寫明口味（例如「-雞肉」）時，即使沒有成分表也標上
  const title = str(r[C.title])
  const named = (/雞/.test(title) ? 'P' : '') + (/-魚|魚肉/.test(title) ? 'F' : '')
  if (/官網未提供成分/.test(str(r[C.poultry]))) return named + '?'
  const ing = str(r[C.ingredients])
  let f = ''
  if ((has(r[C.poultry]) && !/^含（羽毛水解物）$/.test(str(r[C.poultry]))) || named.includes('P')) f += 'P'
  if (has(r[C.beef])) f += 'B'
  if (has(r[C.fish]) || named.includes('F')) f += 'F'
  if (has(r[C.pork])) f += 'K'
  if (has(r[C.grain])) f += 'G'
  if (has(r[C.wheat])) f += 'W'
  if (has(r[C.dairy])) f += 'D'
  if (has(r[C.soy])) f += 'S'
  if ([C.poultry, C.beef, C.pork].some((c) => maybe(r[c]))) f += 'M'
  // 低敏配方的主要蛋白質經水解（一般配方裡的「水解動物蛋白」只是調味，不算）
  if (tags.includes('過敏') && /羽毛水解|水解(分離)?大豆|水解大豆/.test(ing)) f += 'H'
  return f
}
const cleanName = (title, code, pack) =>
  str(title)
    .replace(new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '')
    .replace(/^(犬|貓)\s+/, '')
    .replace(/^(幼犬|幼貓)\s+/, '$1')
    .replace(new RegExp(`\\s*${pack.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '')
    .replace(/\s+/g, ' ')
    .trim()
const bullets = (v) =>
  str(v)
    .split('\n')
    .map((l) => l.replace(/^[•・\-\s]+/, '').trim())
    .filter(Boolean)

// ---------- Sheet2：每個配方的詳細營養分析 ----------
const nutrients = new Map()
const fixes = new Map()
if (sheets.Sheet2) {
  const s2 = table(sheets.Sheet2, 0)
  const codeCol = s2.col('產品代號')
  const skip = /^(產品代號|代表商品|代謝能|蛋白質|脂肪|粗纖維|成分表|備註)/
  for (const r of s2.body) {
    const code = str(r[codeCol])
    const extra = {}
    s2.head.forEach((h, i) => {
      if (!h || skip.test(h) || /疑為|官網標示/.test(h)) return
      const n = num(r[i])
      if (n != null) extra[h.replace(/\s*\(%\)$/, '')] = n
    })
    nutrients.set(code, extra)
    const fiberFix = s2.head.findIndex((h) => /疑為粗纖維/.test(h))
    if (fiberFix >= 0 && num(r[fiberFix]) != null) fixes.set(code, { fiber: num(r[fiberFix]) })
  }
}

const map = new Map()
let dataDate = ''
for (const r of s1.body) {
  const id = num(r[C.id])
  const code = str(r[C.code]).toUpperCase()
  if (!id || !code) continue
  const pack = str(r[C.pack])
  const variant = { id, pack, price: num(r[C.price]), soldOut: /售完/.test(str(r[C.status])), image: str(r[C.image]) || null, url: str(r[C.url]) || null }
  dataDate ||= str(r[C.date])
  if (map.has(code)) {
    map.get(code).variants.push(variant)
    continue
  }
  const tags = str(r[C.tags]).split(/[、,]/).map((t) => t.replace(/／/g, '/').trim()).filter(Boolean)
  const note = str(r[C.note])
  const fix = fixes.get(code) || {}
  map.set(code, {
    code,
    name: cleanName(r[C.title], code, pack),
    species: SPECIES[str(r[C.species])] || 'both',
    stage: stageOf(str(r[C.stage])),
    stageText: str(r[C.stage]),
    small: /小型/.test(str(r[C.size])),
    neutered: str(r[C.neutered]).startsWith('是'),
    type: TYPE[str(r[C.type])] || 'd',
    tags,
    rx: rxOf(r[C.rx], tags),
    // 資料備註寫「疑為誤植」的代謝能不採用
    kcal: /代謝能|大卡/.test(note) && /誤植/.test(note) ? null : num(r[C.kcal]),
    flags: flagsOf(r, tags),
    protein: num(r[C.protein]),
    fat: num(r[C.fat]),
    fiber: fix.fiber ?? num(r[C.fiber]),
    moisture: fix.fiber != null ? null : num(r[C.moisture]),
    ash: num(r[C.ash]),
    nutrients: nutrients.get(code) || {},
    proteinSource: str(r[C.protein_src]),
    ingredients: str(r[C.ingredients]),
    features: bullets(r[C.features]),
    feeding: str(r[C.feeding]),
    sales: str(r[C.sales]),
    note,
    variants: [variant],
  })
}
const products = [...map.values()]

// ---------- Sheet3：官方餵食表 ----------
const feeding = {}
if (sheets.Sheet3) {
  const s3 = table(sheets.Sheet3, 0)
  const [cc, cm, ck, cv, cw, ca, cu] = ['產品代號', '餵食方式', '條件', '條件值', '體重', '建議量', '單位'].map(s3.col)
  for (const r of s3.body) {
    const code = str(r[cc]).toUpperCase()
    if (!code) continue
    ;(feeding[code] ||= []).push([str(r[cm]), `${str(r[ck])} ${str(r[cv])}`.trim(), str(r[cw]), str(r[ca]), str(r[cu])])
  }
}

const header = (what) =>
  `// ${what}\n// 此檔由 scripts/convert-royal-canin.mjs 從「皇家全站商品資料.xlsx」自動產生，請勿手動修改；Excel 更新後執行 npm run data:royal\n`
writeFileSync(
  outData,
  `${header('皇家寵物食品商品資料')}\nexport const DATA_DATE = ${JSON.stringify(dataDate)}\n\nexport const PRODUCTS = [\n${products.map((p) => `  ${JSON.stringify(p)},`).join('\n')}\n]\n`,
)
writeFileSync(
  outFeeding,
  `${header('皇家官方餵食表：[餵食方式, 條件, 體重, 建議量, 單位]')}\nexport const FEEDING = {\n${Object.entries(feeding)
    .map(([k, rows]) => `  ${JSON.stringify(k)}: ${JSON.stringify(rows)},`)
    .join('\n')}\n}\n`,
)

const sizes = products.reduce((n, p) => n + p.variants.length, 0)
const noFeeding = products.filter((p) => !feeding[p.code]).map((p) => p.code)
console.log(`✔ ${sizes} 項商品 → ${products.length} 種配方，餵食表 ${Object.keys(feeding).length} 種（資料日期 ${dataDate}）`)
console.log(`  寫入 ${outData}`)
console.log(`  寫入 ${outFeeding}`)
if (noFeeding.length) console.log(`  沒有餵食表：${noFeeding.join('、')}`)
