// 依寵物紀錄從皇家商品裡挑出候選飼料（規則篩選），再交給 AI 選擇與說明
import { FLAG_LABEL, PRODUCTS, TYPE_LABEL, nutritionText, rxLabel, speciesLabel } from './data/royalCanin.js'

// 紀錄裡出現這些字 → 需要這些功能標籤（權重越高越優先）
const NEEDS = [
  [/糖尿/, ['血糖控制'], 5],
  [/心臟/, ['心臟'], 5],
  [/胰臟/, ['低脂/胰臟'], 4],
  [/泌尿|膀胱|結石|頻尿|尿不出/, ['泌尿道'], 4],
  [/過敏|一直抓|一直舔|紅紅|搔癢/, ['過敏', '皮膚'], 3],
  [/腸胃|嘔吐|吐了|拉肚子|腹瀉|軟便/, ['腸胃'], 2],
  [/腎/, ['腎臟'], 2],
  [/關節|膝蓋|跛/, ['關節'], 3],
  [/偏胖|過重|肥胖|減重|體態評分 [6-9]\/9/, ['體重管理'], 3],
  [/牙結石|牙齦|洗牙/, ['口腔'], 1],
  [/肝臟|肝指數/, ['肝臟'], 3],
  [/膽小|緊張|壓力/, ['舒緩緊張'], 1],
]

// 「對 X 過敏」→ 要避開的成分旗標
const ALLERGENS = [
  [/(雞肉|雞|禽).{0,4}過敏|對雞/, 'P'],
  [/魚.{0,4}過敏/, 'F'],
  [/牛肉?.{0,4}過敏/, 'B'],
  [/豬.{0,4}過敏/, 'K'],
  [/(小麥|麩質).{0,4}過敏/, 'W'],
  [/大豆.{0,4}過敏/, 'S'],
  [/(牛奶|乳).{0,4}過敏/, 'D'],
]

function ageMonths(birthday) {
  const b = new Date(birthday)
  const n = new Date()
  return (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth()
}

export function matchFoods(pet, contextText, weightKg, limit = 10) {
  const months = ageMonths(pet.birthday)
  const young = pet.species === 'cat' ? months < 12 : months < 10
  const senior = pet.species === 'cat' ? months >= 84 : months >= 96
  const neutered = /結紮：已結紮/.test(contextText)
  const avoid = ALLERGENS.filter(([re]) => re.test(contextText)).map(([, f]) => f)
  const needs = NEEDS.filter(([re]) => re.test(contextText))
  if (neutered) needs.push([null, ['絕育/體重'], 2])
  if (senior) needs.push([null, ['熟齡'], 2])

  const results = []
  for (const p of PRODUCTS) {
    if (p.species !== pet.species && p.species !== 'both') continue
    if (p.rx === 3 || p.type === 'l') continue
    if (p.variants.every((v) => v.soldOut)) continue
    // 年齡階段
    if (young ? !['y', 'b'].includes(p.stage) : ['y', 'b'].includes(p.stage)) continue
    if (p.stage === 's' && !senior) continue
    if (p.neutered && !neutered) continue
    if (p.small && weightKg && weightKg > 10) continue
    // 過敏：含過敏原（水解蛋白除外），或成分不明的都排除
    if (avoid.length) {
      if (p.flags.includes('?') || p.flags.includes('M')) continue
      if (!p.flags.includes('H') && avoid.some((f) => p.flags.includes(f))) continue
    }

    let score = 0
    const why = []
    for (const [, tags, w] of needs) {
      const hit = tags.find((t) => p.tags.includes(t))
      if (hit) {
        score += w
        why.push(hit)
      }
    }
    if (avoid.length && p.flags.includes('H')) score += 1
    if (p.rx === 0) score += 0.5 // 同分時一般營養優先
    if (score <= 0.5 && p.tags.length > 0 && !p.tags.every((t) => ['熟齡', '成長發育', '絕育/體重', '補水'].includes(t))) continue
    results.push({ p, score, why: [...new Set(why)] })
  }
  results.sort((a, b) => b.score - a.score)
  return { list: results.slice(0, limit), avoid }
}

// 給 AI 看的候選清單文字
export function candidatesText(pet, matched) {
  const { list, avoid } = matched
  if (!list.length) return '【候選商品】（依紀錄篩選後沒有合適的商品）'
  const lines = list.map(({ p, why }) => {
    const flags = [...p.flags].filter((f) => FLAG_LABEL[f]).map((f) => FLAG_LABEL[f]).join('、')
    const sizes = p.variants.filter((v) => !v.soldOut).map((v) => `${v.pack} NT$${v.price.toLocaleString()}`).join('／')
    // 官方特色原文照抄（不截斷、不改寫），AI 只能引用這些文字描述商品
    const features = p.features.length ? p.features.map((t) => `「${t}」`).join(' ') : '（官網未提供）'
    const rx = p.rx === 1 ? '官網標示：處方食品，須遵照獸醫師指示餵食' : rxLabel(p.rx)
    return `- ${p.code}｜${speciesLabel(p.species)} ${p.name}｜${TYPE_LABEL[p.type]}｜適用：${p.stageText}｜分類：${p.tags.join('、') || '一般營養'}｜${rx}｜官方特色原文：${features}｜代謝能：${p.kcal ? `${p.kcal} kcal/kg` : '未提供'}｜${nutritionText(p)}｜成分含：${flags}${p.proteinSource ? `｜主要蛋白質：${p.proteinSource}` : ''}｜規格：${sizes}${why.length ? `｜和紀錄相關的分類：${why.join('、')}` : ''}`
  })
  return [
    `【候選商品】皇家寵物食品（資料取自 Royal Canin 台灣官網商品頁；台灣宅配通路，合作動物醫院限定），App 已依${pet.name}的物種、年齡、體型${avoid.length ? `與過敏（避開：${avoid.map((f) => FLAG_LABEL[f]).join('、')}）` : ''}篩選：`,
    ...lines,
  ].join('\n')
}
