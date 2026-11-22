import { useEffect, useRef, useState } from 'react'
import { PETS, useCurrentPet } from '../petStore.js'
import './Records.css'

const todayKey = () => new Date().toISOString().slice(0, 10)

// 跑馬燈訊息，每 5 秒往左換下一則
const ANNOUNCEMENTS = [
  '今天散步了沒？',
  '又到了換毛的季節......',
  '填飽肚子世界最重要!!',
  '來量量我的體重~',
  '開心吃！快樂玩！舒服睡！',
]

const initial = {
  mood: 0,
  meals: [],
  snack: 0,
  oral: 0,
  topical: 0,
  weight: '',
  obs: { 嘔吐: false, 頻尿: false, 咳嗽: false },
  obsCount: {}, // 觀察項目的次數（選填）
}

// 假資料：之後可接天氣 API
const weather = { rain: 30, low: 20, high: 25, walk: '14:00 ~ 17:00', note: '趕快帶我去散步！晚上要下雨了 ><' }

const MEAL_NAMES = ['第一餐', '第二餐', '第三餐']

const storageKeyOf = (pet) => `${pet.storage}-${todayKey()}`

function loadState(pet) {
  const fresh = { ...initial, meals: Array(pet.meals).fill(false) }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeyOf(pet)))
    if (!saved) return fresh
    // obs 另外合併，舊資料也能補上新的預設觀察項目
    const obs = { ...initial.obs, ...saved.obs }
    // 已移除的預設項目：沒用過就從舊資料拿掉
    if (obs.掉毛 === false && !saved.obsCount?.掉毛) delete obs.掉毛
    // 餐數以寵物設定為準
    const meals = Array.from({ length: pet.meals }, (_, i) => Boolean(saved.meals?.[i]))
    return { ...fresh, ...saved, obs, meals }
  } catch {
    return fresh
  }
}

function stageOf(birthday, species) {
  const years = (Date.now() - new Date(birthday)) / (365.25 * 864e5)
  const animal = species === 'dog' ? '犬' : '貓'
  if (years < 1) return `幼${animal}`
  if (years < 7) return `成${animal}`
  return `老${animal}`
}

// 狗腳印：橢圓腳趾分得較開
function DogPaw({ className = 'paw' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse cx="6" cy="9" rx="2.2" ry="2.8" />
      <ellipse cx="10" cy="5.5" rx="2.2" ry="2.8" />
      <ellipse cx="14.5" cy="5.5" rx="2.2" ry="2.8" />
      <ellipse cx="18.5" cy="9" rx="2.2" ry="2.8" />
      <path d="M12.2 11c3 0 6 3.6 6 6.4 0 2-1.6 2.8-3.2 2.8-1.2 0-1.9-.6-2.8-.6s-1.6.6-2.8.6c-1.6 0-3.2-.8-3.2-2.8 0-2.8 3-6.4 6-6.4z" />
    </svg>
  )
}

// 貓掌：圓圓的腳趾靠攏，肉球下緣三瓣
function CatPaw({ className = 'paw' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="5.6" cy="10.6" r="2.4" />
      <circle cx="9.6" cy="6.6" r="2.5" />
      <circle cx="14.4" cy="6.6" r="2.5" />
      <circle cx="18.4" cy="10.6" r="2.4" />
      <path d="M12 11.6c2.6 0 5.6 2.6 5.6 5.4 0 1.9-1.3 3-2.8 3-.8 0-1.3-.4-1.6-.4-.3 0-.6.6-1.2.6s-.9-.6-1.2-.6c-.3 0-.8.4-1.6.4-1.5 0-2.8-1.1-2.8-3 0-2.8 3-5.4 5.6-5.4z" />
    </svg>
  )
}

function Counter({ value, onChange }) {
  return (
    <span className="counter">
      <span className="counter-num">{value}</span>
      <span className="counter-spin">
        <button type="button" onClick={() => onChange(value + 1)} aria-label="增加">
          <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 5l4-4 4 4" /></svg>
        </button>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="減少">
          <svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg>
        </button>
      </span>
    </span>
  )
}

// 不可復原的操作前再確認一次
function ConfirmDialog({ message, species, onOk, onCancel }) {
  const Paw = species === 'dog' ? DogPaw : CatPaw
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Paw className="confirm-paw" />
        <p className="confirm-msg">{message}</p>
        <button type="button" className="confirm-ok" onClick={onOk} autoFocus>確認</button>
      </div>
    </div>
  )
}

// ---------- 當月匯表（假資料） ----------
function buildMonthlyFake(pet) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isDog = pet.species === 'dog'
  // 每 2~3 天量一次體重，緩慢波動
  const catBase = [4.62, 4.6, 4.65, 4.58, 4.55, 4.6, 4.57, 4.52, 4.56, 4.5, 4.53, 4.48]
  const dogBase = [8.1, 8.15, 8.12, 8.2, 8.25, 8.22, 8.3, 8.28, 8.35, 8.32, 8.4, 8.38]
  const base = isDog ? dogBase : catBase
  const weights = []
  for (let d = 1, i = 0; d <= today; d += i % 2 ? 3 : 2, i++) {
    weights.push({ day: d, kg: base[i % base.length] })
  }
  const per = today / 30 // 依目前天數縮放次數
  return {
    month: month + 1,
    today,
    daysInMonth,
    snack: Math.round((isDog ? 52 : 38) * per),
    oral: Math.round((isDog ? 4 : 14) * per),
    topical: Math.round((isDog ? 2 : 8) * per),
    obs: isDog
      ? { 嘔吐: Math.round(1 * per), 頻尿: 0, 咳嗽: Math.round(2 * per) }
      : { 嘔吐: Math.round(3 * per), 頻尿: Math.round(2 * per), 咳嗽: Math.round(5 * per) },
    weights,
  }
}

function WeightChart({ data, daysInMonth, month }) {
  const [hover, setHover] = useState(null)
  const W = 300
  const H = 150
  const pad = { l: 34, r: 14, t: 26, b: 22 }
  const kgs = data.map((d) => d.kg)
  const lo = Math.floor((Math.min(...kgs) - 0.05) * 10) / 10
  const hi = Math.ceil((Math.max(...kgs) + 0.05) * 10) / 10
  const ticks = [lo, (lo + hi) / 2, hi]
  const x = (day) => pad.l + ((day - 1) / (daysInMonth - 1)) * (W - pad.l - pad.r)
  const y = (kg) => pad.t + ((hi - kg) / (hi - lo)) * (H - pad.t - pad.b)
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.day)},${y(d.kg)}`).join('')
  const xTicks = [1, 10, 20, daysInMonth]

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    data.forEach((d, i) => {
      if (Math.abs(x(d.day) - vx) < Math.abs(x(data[best].day) - vx)) best = i
    })
    setHover(best)
  }

  const h = hover != null ? data[hover] : null
  const tipX = h ? Math.min(Math.max(x(h.day), pad.l + 30), W - pad.r - 30) : 0

  return (
    <>
      <svg
        className="wchart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${month}月體重變化折線圖`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="wchart-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="wchart-axis" x={pad.l - 6} y={y(t) + 3.5} textAnchor="end">{t.toFixed(1)}</text>
          </g>
        ))}
        {xTicks.map((d) => (
          <text key={d} className="wchart-axis" x={x(d)} y={H - 6} textAnchor="middle">{month}/{d}</text>
        ))}
        {h && <line className="wchart-cross" x1={x(h.day)} x2={x(h.day)} y1={pad.t} y2={H - pad.b} />}
        <path className="wchart-line" d={path} />
        {data.map((d, i) => (
          <circle key={d.day} className={`wchart-dot ${i === hover ? 'on' : ''}`} cx={x(d.day)} cy={y(d.kg)} r={i === hover ? 5 : 4} />
        ))}
        {h && (
          <g className="wchart-tip" transform={`translate(${tipX},${y(h.kg) - 12})`}>
            <rect x="-30" y="-17" width="60" height="18" rx="6" />
            <text y="-4.5" textAnchor="middle">{month}/{h.day} · {h.kg.toFixed(2)}</text>
          </g>
        )}
      </svg>
      <div className="sr-only">
        <table>
          <caption>{month}月體重（kg）</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}><th>{month}/{d.day}</th><td>{d.kg}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MonthlyReport({ pet, obsKeys, onClose }) {
  const [r] = useState(() => buildMonthlyFake(pet))
  const first = r.weights[0].kg
  const last = r.weights[r.weights.length - 1].kg
  const diff = last - first

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="report" role="dialog" aria-modal="true" aria-label="當月匯表" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="report-close" onClick={onClose} aria-label="關閉">✕</button>
        <h2 className="report-title">{pet.name}・{r.month}月匯表</h2>
        <p className="report-range">
          {r.month}/1 – {r.month}/{r.today}
          {r.today < r.daysInMonth && '・統計至今日'}
        </p>

        <h3 className="report-h3">餵食與用藥</h3>
        <div className="report-tiles">
          <div className="report-tile t-yellow"><small>零食</small><b>{r.snack}</b><span>次</span></div>
          <div className="report-tile t-coral"><small>內服藥</small><b>{r.oral}</b><span>次</span></div>
          <div className="report-tile t-coral"><small>外用藥</small><b>{r.topical}</b><span>次</span></div>
        </div>

        <h3 className="report-h3">特殊狀況</h3>
        <ul className="report-obs">
          {obsKeys.map((k) => (
            <li key={k}><span>{k}</span><b>{r.obs[k] ?? 0}</b> 次</li>
          ))}
        </ul>

        <h3 className="report-h3">
          體重變化
          <span className="report-delta">
            {last.toFixed(2)} kg（{diff > 0 ? '+' : ''}{diff.toFixed(2)}）
          </span>
        </h3>
        <WeightChart data={r.weights} daysInMonth={r.daysInMonth} month={r.month} />
      </div>
    </div>
  )
}

function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return // 分頁在背景時不前進
      setAnimate(true)
      setIndex((i) => Math.min(i + 1, ANNOUNCEMENTS.length))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // 滑到尾端那份「第一則」後，無動畫跳回開頭。
  // 用計時器而不是 transitionend：背景分頁不會觸發 transitionend，會讓 index 一路超出而變空白。
  useEffect(() => {
    if (index !== ANNOUNCEMENTS.length) return
    const t = setTimeout(() => {
      setAnimate(false)
      setIndex(0)
    }, 700)
    return () => clearTimeout(t)
  }, [index])

  // 尾端放一份第一則，滑到後無動畫跳回開頭，達成無縫循環
  const items = [...ANNOUNCEMENTS, ANNOUNCEMENTS[0]]

  return (
    <div className="announce" role="status" aria-live="polite">
      <DogPaw />
      <div className="announce-window">
        <ul
          className="announce-track"
          style={{ transform: `translateX(-${index * 100}%)`, transition: animate ? undefined : 'none' }}
        >
          {items.map((t, i) => (
            <li key={i} aria-hidden={i !== index}>{t}</li>
          ))}
        </ul>
      </div>
      <CatPaw />
    </div>
  )
}

// 一隻寵物的大框框：每隻各自保存當天的紀錄
function PetSheet({ pet, onConfirm, onReport }) {
  const [s, setS] = useState(() => loadState(pet))
  const [newObs, setNewObs] = useState('')
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyOf(pet), JSON.stringify(s))
    } catch {
      /* 儲存失敗時忽略 */
    }
  }, [pet, s])

  const nextMeal = s.meals.indexOf(false)
  const mealNames = MEAL_NAMES.slice(0, pet.meals)

  const askMeal = () => {
    if (nextMeal < 0) return
    onConfirm({
      species: pet.species,
      message: `${pet.name} 吃完${mealNames[nextMeal]}了嗎？`,
      action: () => setS((p) => ({ ...p, meals: p.meals.map((v, j) => (j === nextMeal ? true : v)) })),
    })
  }

  const askSnack = () =>
    onConfirm({
      species: pet.species,
      message: `${pet.name} 又吃了一次零食？`,
      action: () => setS((p) => ({ ...p, snack: p.snack + 1 })),
    })

  const addObs = () => {
    const t = newObs.trim()
    if (!t || t in s.obs) return
    set({ obs: { ...s.obs, [t]: true } })
    setNewObs('')
  }

  return (
      <section className="sheet">
        {/* 基本資料（由設定分頁帶入） */}
        <div className="profile">
          <div className="photo">
            {pet.photo ? <img src={pet.photo} alt={pet.name} /> : <span className="photo-empty">photo</span>}
          </div>
          <div className="profile-info">
            <div className="name-row">
              <p className="pet-name">{pet.name}</p>
              <p className="birthday">
                <span aria-hidden="true">🎂</span>
                <span className="birthday-date">{pet.birthday.replaceAll('-', '.')}</span>
                <span className="stage">{stageOf(pet.birthday, pet.species)}</span>
              </p>
            </div>
            <div className="mood">
              <span>今天的心情指數：</span>
              <span className="stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n <= s.mood ? 'on' : ''}
                    onClick={() => set({ mood: s.mood === n ? 0 : n })}
                    aria-label={`${n} 顆星`}
                  >
                    ★
                  </button>
                ))}
              </span>
            </div>
          </div>
        </div>

        <hr className="dash-pink" />

        {/* 用餐 */}
        <div className="meals">
          <div className="meal-group">
          <button
            type="button"
            className={`stamp ${nextMeal < 0 ? 'is-done' : ''}`}
            onClick={askMeal}
            disabled={nextMeal < 0}
            aria-label={nextMeal < 0 ? '今天的餐都吃完了' : `記錄${mealNames[nextMeal]}`}
          >
            {nextMeal < 0 ? (
              <>
                <span>今天</span>
                <span>吃飽了</span>
              </>
            ) : (
              <>
                <span>吃飽了</span>
                <span>點我!</span>
              </>
            )}
          </button>
          <ul className="meal-list">
            {mealNames.map((m, i) => (
              <li key={m} className={`meal-row ${s.meals[i] ? 'on' : ''}`}>
                {m}
                <span className="mark">{s.meals[i] ? '✓' : '✕'}</span>
              </li>
            ))}
          </ul>
          </div>
          <div className="snack">
            <button type="button" className="stamp stamp-sm stamp-yellow" onClick={askSnack} aria-label="記錄一次零食">
              <span>又吃</span>
              <span>零食</span>
            </button>
            <p className="snack-count">
              零食 <b>{s.snack}</b> 次
            </p>
          </div>
        </div>

        {/* 健康 */}
        <div className="health">
          <div className="health-left">
            <h2 className="health-title">
              今天的<span className="health-name">{pet.name}</span>......
            </h2>
            <div className="line-item">
              <span>內服藥</span>
              <Counter value={s.oral} onChange={(v) => set({ oral: v })} />
              <span>次</span>
            </div>
            <div className="line-item">
              <span>外用藥</span>
              <Counter value={s.topical} onChange={(v) => set({ topical: v })} />
              <span>次</span>
            </div>
            <label className="line-item weight">
              <span className="label-3">體重</span>
              <input
                inputMode="decimal"
                value={s.weight}
                onChange={(e) => set({ weight: e.target.value.replace(/[^\d.]/g, '') })}
              />
              <span>kg</span>
            </label>
            <button type="button" className="report-btn" onClick={() => onReport(pet, Object.keys(s.obs))}>
              當月匯表
            </button>
          </div>
          <div className="health-right">
            <div className="chips">
              {Object.entries(s.obs).map(([k, on]) => (
                <div key={k} className={`obs-pill ${on ? 'on' : ''}`}>
                  <button
                    type="button"
                    className="obs-name"
                    onClick={() => set({ obs: { ...s.obs, [k]: !on } })}
                    aria-pressed={on}
                  >
                    {k}
                  </button>
                  <input
                    className="obs-count"
                    inputMode="numeric"
                    value={s.obsCount[k] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '')
                      // 填了次數就自動標記為有發生
                      set({
                        obsCount: { ...s.obsCount, [k]: v },
                        obs: Number(v) > 0 ? { ...s.obs, [k]: true } : s.obs,
                      })
                    }}
                    aria-label={`${k}次數`}
                  />
                  <span>次</span>
                </div>
              ))}
            </div>
            <form
              className="obs-add"
              onSubmit={(e) => {
                e.preventDefault()
                addObs()
              }}
            >
              <input value={newObs} onChange={(e) => setNewObs(e.target.value)} placeholder="自填" />
              <button type="submit" aria-label="新增觀察">+</button>
            </form>
          </div>
        </div>

        <hr className="dot-line" />

        {/* 天氣 */}
        <div className="weather">
          <p>
            今天
            <svg className="rain" viewBox="0 0 36 36" aria-label="雨">
              <path className="drop" d="M8 20v12M13 21v14M18 20v12M23 21v14M28 20v12" />
              <path className="cloud" d="M9 19a6 6 0 0 1 1-11.9A8 8 0 0 1 25 8a5.5 5.5 0 0 1 2 11z" />
            </svg>
            機率：<b>{weather.rain}%</b>
          </p>
          <p>平均氣溫：<b>{weather.low}°C ~ {weather.high}°C</b></p>
          <p>最適合散步的時間：<b>{weather.walk}</b></p>
          <p className="weather-note">★ {weather.note}</p>
        </div>
      </section>
  )
}

export default function Records() {
  const [page, setPage] = useCurrentPet() // 與紀錄頁同步
  const [drag, setDrag] = useState(0) // 手指拖曳中的位移（px）
  const [confirm, setConfirm] = useState(null) // { message, species, action }
  const [report, setReport] = useState(null) // { pet, obsKeys }
  const touch = useRef(null)

  const goTo = (i) => setPage(i)

  // 左右滑動切換寵物；先判斷方向，垂直滑動時不干擾頁面捲動
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, axis: null }
  }
  const onTouchMove = (e) => {
    const st = touch.current
    if (!st) return
    const t = e.touches[0]
    const dx = t.clientX - st.x
    const dy = t.clientY - st.y
    if (!st.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) st.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (st.axis !== 'x') return
    const atEdge = (page === 0 && dx > 0) || (page === PETS.length - 1 && dx < 0)
    setDrag(atEdge ? dx / 4 : dx) // 第一頁 / 最後一頁拉不動，給一點彈性
  }
  const onTouchEnd = () => {
    const st = touch.current
    if (st?.axis === 'x' && Math.abs(drag) > 60) goTo(page + (drag < 0 ? 1 : -1))
    setDrag(0)
    touch.current = null
  }

  return (
    <div className="records">
      {/* 背景色塊 */}
      <div className="blobs" aria-hidden="true">
        <svg className="blob blob-coral" viewBox="0 0 200 160"><path d="M0 0h200c-6 40-40 52-78 58-44 7-58 44-82 86C28 162 10 160 0 156z" /></svg>
        <svg className="blob blob-yellow" viewBox="0 0 200 140"><path d="M0 0h200v128c-30 18-62 0-80-24C98 76 60 70 30 44 12 28 2 14 0 0z" /></svg>
        <svg className="blob blob-blue" viewBox="0 0 120 220"><path d="M120 0v220H40c-24-24-6-56 18-80 22-22 4-56 20-90C88 28 104 8 120 0z" /></svg>
        <svg className="blob blob-green" viewBox="0 0 200 110"><path d="M0 0c30 10 52 40 86 54 34 14 80 14 114 56H0z" /></svg>
        <DogPaw className="paw-deco p1" />
        <CatPaw className="paw-deco p2" />
        <CatPaw className="paw-deco p3" />
      </div>

      <header className="top">
        <h1 className="page-title">
          <span className="page-date">{new Date().getMonth() + 1}/{new Date().getDate()}</span>
          <span className="page-weekday">週{'日一二三四五六'[new Date().getDay()]}</span>
        </h1>
        <AnnouncementBar />
      </header>

      <div
        className="pet-pager"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className="pet-track"
          style={{
            transform: `translateX(calc(${-page * 100}% + ${drag}px))`,
            transition: drag ? 'none' : undefined,
          }}
        >
          {PETS.map((p, i) => (
            <div key={p.id} className="pet-slide" aria-hidden={i !== page} inert={i !== page}>
              <PetSheet pet={p} onConfirm={setConfirm} onReport={(pet, obsKeys) => setReport({ pet, obsKeys })} />
            </div>
          ))}
        </div>
      </div>

      <nav className="pet-dots" aria-label="切換寵物">
        {PETS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={i === page ? 'on' : ''}
            onClick={() => goTo(i)}
            aria-label={`第 ${i + 1} 頁：${p.name}`}
            aria-current={i === page ? 'page' : undefined}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      {report && <MonthlyReport pet={report.pet} obsKeys={report.obsKeys} onClose={() => setReport(null)} />}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          species={confirm.species}
          onCancel={() => setConfirm(null)}
          onOk={() => {
            confirm.action()
            setConfirm(null)
          }}
        />
      )}
    </div>
  )
}
