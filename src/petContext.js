// 把一隻寵物在日常頁、紀錄頁的資料整理成一段文字，當作 AI 諮詢的背景
import { historyKey } from './petStore.js'
import { DOG } from './pages/historyDogData.js'
import * as CAT from './pages/historyCatData.js'

const CAT_SEED = {
  checkups: CAT.CHECKUPS, vaccines: CAT.VACCINES, visits: CAT.VISITS, diseases: CAT.DISEASES,
  meds: CAT.MEDS, injuries: CAT.INJURIES, others: CAT.OTHERS, births: CAT.BIRTHS, spay: CAT.SPAY,
}

// 與紀錄頁相同的存檔 key；還沒存過就用假資料
const STORE_KEYS = {
  checkups: 'meow-checkups', vaccines: 'meow-vaccines-v2', visits: 'meow-visits', diseases: 'meow-diseases',
  meds: 'meow-meds', injuries: 'meow-injuries', others: 'meow-others',
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function listOf(pet, name) {
  const seed = (pet.species === 'dog' ? DOG : CAT_SEED)[name]
  return readJSON(historyKey(pet, STORE_KEYS[name])) ?? seed ?? []
}

export function ageText(birthday) {
  const b = new Date(birthday)
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth()
  if (now.getDate() < b.getDate()) months -= 1
  const y = Math.floor(months / 12)
  return y > 0 ? `${y} 歲 ${months % 12} 個月` : `${months} 個月`
}

// 日常頁每天一筆，找出有填體重的日子
export function weightHistory(pet) {
  const re = new RegExp(`^${pet.storage}-(\\d{4}-\\d{2}-\\d{2})$`)
  const out = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = localStorage.key(i).match(re)
      if (!m) continue
      const w = Number(readJSON(m[0])?.weight)
      if (w > 0) out.push({ date: m[1], kg: w })
    }
  } catch {
    /* 讀不到就當作沒有 */
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// 最近一次的體重：日常頁 → 體檢 AI 建議裡的「體重 x kg」
export function latestWeight(pet) {
  const w = weightHistory(pet).at(-1)
  if (w) return w.kg
  for (const c of listOf(pet, 'checkups')) {
    const m = c.ai?.join('').match(/體重\s*([\d.]+)\s*kg/)
    if (m) return Number(m[1])
  }
  return ''
}

function todayRecord(pet) {
  const d = new Date()
  const key = `${pet.storage}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return readJSON(key)
}

const bullet = (arr) => arr.map((x) => `- ${x}`).join('\n') || '- （無）'

export function buildPetContext(pet) {
  const species = pet.species === 'dog' ? '狗' : '貓'
  const spay = pet.species === 'dog' ? DOG.spay : CAT_SEED.spay
  const births = pet.species === 'dog' ? DOG.births : CAT_SEED.births
  const weights = weightHistory(pet).slice(-6)
  const today = todayRecord(pet)
  const meds = listOf(pet, 'meds')
  const lastCheckup = listOf(pet, 'checkups')[0]

  const todayLines = []
  if (today) {
    const obs = Object.entries(today.obs || {})
      .filter(([, on]) => on)
      .map(([k]) => `${k}${today.obsCount?.[k] ? ` ${today.obsCount[k]} 次` : ''}`)
    todayLines.push(`吃了 ${today.meals?.filter(Boolean).length ?? 0}/${pet.meals} 餐、零食 ${today.snack ?? 0} 次`)
    if (today.oral || today.topical) todayLines.push(`內服藥 ${today.oral} 次、外用藥 ${today.topical} 次`)
    if (obs.length) todayLines.push(`特殊狀況：${obs.join('、')}`)
    if (today.mood) todayLines.push(`心情 ${today.mood}/5 顆星`)
  }

  return `名字：${pet.name}
物種：${species}
生日：${pet.birthday.replaceAll('-', '.')}（${ageText(pet.birthday)}）
一天吃 ${pet.meals} 餐
結紮：${spay ? `已結紮（${spay.date}）` : '未結紮'}${births.length ? `；生產過 ${births.length} 胎` : ''}
體重：${weights.length ? weights.map((w) => `${w.date} ${w.kg} kg`).join('、') : latestWeight(pet) ? `約 ${latestWeight(pet)} kg（最近一次體檢）` : '未記錄'}

今天的日常紀錄：
${bullet(todayLines)}

疾病史：
${bullet(listOf(pet, 'diseases').map((d) => `${d.name}${d.date ? `（${d.date}）` : ''}：${d.desc || ''}${d.impact ? ` 注意：${d.impact}` : ''}`))}

目前用藥：
${bullet(meds.filter((m) => !m.ended).map((m) => `${m.name}（${m.kind === 'fixed' ? '固定' : '短期'}，${m.every} ${m.times} 次${m.days ? `，共 ${m.days} 天` : ''}）`))}

傷病 / 手術：
${bullet(listOf(pet, 'injuries').map((x) => `${x.type}－${x.title}${x.date ? `（${x.date}）` : x.congenital ? '（先天）' : ''}：${x.impact || x.desc || ''}`))}

最近疫苗：
${bullet(listOf(pet, 'vaccines').slice(0, 4).map((v) => `${v.date} ${v.name}`))}

最近看診：
${bullet(listOf(pet, 'visits').slice(0, 3).map((v) => `${v.date} ${v.reason}（${v.hospital}）`))}

最近一次體檢（${lastCheckup?.date ?? '無'}）：
${bullet(lastCheckup?.ai ?? [])}

其他：
${bullet(listOf(pet, 'others').map((o) => `${o.label}：${o.text}`))}`
}
