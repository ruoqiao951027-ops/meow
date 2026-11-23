import { useSyncExternalStore } from 'react'

// 假資料：正式版由「設定」分頁事先輸入後帶入
// storage：日常頁的存檔前綴；第一隻沿用原本的 key，舊資料不會遺失
export const PETS = [
  { id: 'stacey', name: 'Stacey', species: 'cat', birthday: '2020-11-14', photo: '/stacey.webp', meals: 3, storage: 'meow-records' },
  { id: 'mochi', name: '年糕', species: 'dog', birthday: '2022-09-15', photo: null, meals: 2, storage: 'meow-records-mochi' },
]

// 紀錄頁各清單的存檔 key：第一隻沿用原本的 key，舊資料不會遺失；其他寵物加後綴（v2：改用狗狗假資料）
export const historyKey = (pet, base) => (pet.id === PETS[0].id ? base : `${base}-${pet.id}-v2`)

// 目前選中的寵物：日常頁、紀錄頁共用，切換其中一邊另一邊也會跟著變
const KEY = 'meow-current-pet'
const listeners = new Set()

function read() {
  try {
    const i = Number(localStorage.getItem(KEY))
    return Number.isInteger(i) && i >= 0 && i < PETS.length ? i : 0
  } catch {
    return 0
  }
}

let current = read()

export function setCurrentPet(i) {
  const next = Math.max(0, Math.min(PETS.length - 1, i))
  if (next === current) return
  current = next
  try {
    localStorage.setItem(KEY, String(next))
  } catch {
    /* 忽略 */
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useCurrentPet() {
  const idx = useSyncExternalStore(subscribe, () => current)
  return [idx, setCurrentPet]
}
