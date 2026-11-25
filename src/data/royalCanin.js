// 皇家寵物食品：商品資料的共用工具
// 商品資料在 royalCaninData.js、餵食表在 royalCaninFeeding.js，都由 npm run data:royal 從 Excel 產生
//
// 商品欄位：species cat/dog/both；stage a 成年、s 熟齡、y 幼年成長、b 離乳＋懷孕哺乳
// type d 乾糧、w 主食濕糧、c 罐頭、l 液態營養
// rx 0 一般營養、1 處方、2 官網未標示、3 重症／恢復期照護（不列入一般推薦）
// flags P 禽肉、B 牛肉、F 魚、K 豬肉、W 小麥/麩質、D 乳製品、S 大豆、G 穀物、M 未註明肉種、H 水解蛋白、? 官網未提供成分
import { DATA_DATE, PRODUCTS } from './royalCaninData.js'

export { DATA_DATE, PRODUCTS }

export const productUrl = (id) => `https://royalcanin.homedelivery.com.tw/SalePage/Index/${id}`

export const TYPE_LABEL = { d: '乾糧', w: '主食濕糧', c: '罐頭', l: '液態營養' }
export const FLAG_LABEL = {
  P: '禽肉', B: '牛肉', F: '魚', K: '豬肉', W: '小麥/麩質', D: '乳製品', S: '大豆', G: '穀物', M: '未註明肉種', H: '水解蛋白', '?': '官網未提供成分',
}

export const findProduct = (code) => PRODUCTS.find((p) => p.code.toUpperCase() === code.toUpperCase())

export const speciesLabel = (s) => ({ cat: '貓', dog: '犬', both: '貓／犬' })[s]
export const rxLabel = (rx) => ({ 0: '一般營養', 1: '處方食品', 2: '處方未標示', 3: '重症照護' })[rx]

// 營養分析文字（給 AI 看）
export function nutritionText(p) {
  if (p.protein == null) return '營養分析官網未提供'
  const parts = [`粗蛋白 ${p.protein}%`, `粗脂肪 ${p.fat}%`]
  if (p.fiber != null) parts.push(`粗纖維 ${p.fiber}%`)
  if (p.moisture != null) parts.push(`水分 ${p.moisture}%`)
  if (p.ash != null) parts.push(`灰分 ${p.ash}%`)
  for (const [k, v] of Object.entries(p.nutrients || {})) if (!['灰分', '水分'].includes(k)) parts.push(`${k} ${v}%`)
  return parts.join('、')
}

// 官方餵食表（檔案較大，用到時才載入）
let feedingPromise
const loadFeeding = () => (feedingPromise ||= import('./royalCaninFeeding.js').then((m) => m.FEEDING))

// 取出最接近寵物體重的幾列官方建議量
export async function feedingText(code, weightKg) {
  const rows = (await loadFeeding())[code.toUpperCase()]
  if (!rows?.length) return ''
  const kgOf = (w) => {
    const m = String(w).match(/([\d.]+)\s*kg/)
    return m ? Number(m[1]) : null
  }
  let picked = rows
  const weights = [...new Set(rows.map((r) => kgOf(r[2])).filter((n) => n != null))].sort((a, b) => a - b)
  if (weightKg && weights.length) {
    const below = weights.filter((w) => w <= weightKg).at(-1)
    const above = weights.find((w) => w >= weightKg)
    const keep = new Set([below ?? weights[0], above ?? weights.at(-1)])
    picked = rows.filter((r) => keep.has(kgOf(r[2])))
  }
  return picked
    .slice(0, 40)
    .map(([mode, cond, w, amt, unit]) => `- ${mode}｜${cond}｜${w}｜${amt} ${unit}`)
    .join('\n')
}
