// 每日簽到積分：完成當天第一次餵食確認就算簽到
// 之後設定頁可以用 getCheckin() 讀目前積分
const KEY = 'meow-checkin'
const START_POINTS = 50
export const DAILY_POINTS = 10
export const STREAK_DAYS = 7
export const STREAK_BONUS = 30

// 用本地時間的日期（台灣半夜 12 點換日）
const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const yesterdayKey = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}

export function getCheckin() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && typeof s.points === 'number') return s
  } catch {
    /* 讀不到就用初始值 */
  }
  return { points: START_POINTS, streak: 0, lastDate: '', promptedDate: '' }
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 儲存失敗時忽略 */
  }
}

export const checkedInToday = () => getCheckin().lastDate === dayKey()

// 今天第一次打開、還沒簽到時才提醒（提醒過就不再跳）
export function needsReminder() {
  const s = getCheckin()
  const today = dayKey()
  return s.lastDate !== today && s.promptedDate !== today
}
export function markReminded() {
  save({ ...getCheckin(), promptedDate: dayKey() })
}

// 簽到；今天已簽過回傳 null
export function checkIn() {
  const s = getCheckin()
  const today = dayKey()
  if (s.lastDate === today) return null
  const streak = s.lastDate === yesterdayKey() ? s.streak + 1 : 1
  const bonus = streak % STREAK_DAYS === 0 ? STREAK_BONUS : 0
  const points = s.points + DAILY_POINTS + bonus
  save({ ...s, points, streak, lastDate: today })
  return { gained: DAILY_POINTS, bonus, points, streak }
}
