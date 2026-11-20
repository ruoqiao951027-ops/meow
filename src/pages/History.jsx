import { useEffect, useState } from 'react'
import './History.css'

const STORAGE_KEY = 'meow-history'
const PET_NAME = 'Stacey' // 假資料：正式版由設定分頁帶入
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const ICONS = ['💉', '🩺', '💊', '✨', '🩹', '🛁', '✂️', '📌']

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

// 假資料：以「本月」為準產生幾筆預定事項與日記
function seedData() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const k = (d) => keyOf(y, m, d)
  return {
    [k(2)]: {
      events: [{ time: '14:30', icon: '💉', title: '要打狂犬病疫苗。' }],
      diary: '今天超乖，不知道吃錯什麼藥。\n結果一回家就一直暗示要肉泥......',
    },
    [k(6)]: { events: [{ time: '10:00', icon: '🩺', title: '年度健康檢查' }] },
    [k(7)]: { diary: '下午一直趴在窗邊曬太陽，叫她都不理我。' },
    [k(9)]: { diary: '早上吐了一次毛球，之後精神都還不錯。' },
    [k(13)]: { events: [{ time: '20:00', icon: '💊', title: '餵體內外驅蟲藥' }] },
    [k(14)]: {
      events: [{ time: '', icon: '✨', title: `${PET_NAME} 生日！` }],
      diary: '六歲生日快樂！吃了一整份貓咪蛋糕，還想再要。',
    },
    [k(15)]: { diary: '新的逗貓棒大成功，玩到氣喘吁吁。' },
    [k(17)]: { events: [{ time: '19:00', icon: '🩹', title: '傷口換藥' }], diary: '換藥時有點抗拒，用零食收買成功。' },
    [k(18)]: { diary: '今天食慾很好，三餐都吃光光。' },
    [k(20)]: { events: [{ time: '15:00', icon: '🛁', title: '美容洗澡' }] },
    [k(25)]: { events: [{ time: '11:00', icon: '✂️', title: '剪指甲' }] },
  }
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ?? seedData()
  } catch {
    return seedData()
  }
}

// ---------- 摺疊頁內容（尚未完成，先放預留欄位） ----------
function Field({ label, children }) {
  return (
    <p className="h-field">
      <span className="h-field-label">{label}：</span>
      <span className="h-ph">{children}</span>
    </p>
  )
}
const YesNo = () => <span className="h-ph">Yes / No</span>
const Box = ({ children }) => <div className="h-box">{children}</div>

const SECTIONS = [
  {
    title: '疾病史 & 用藥',
    tone: 'pink',
    body: (
      <>
        <Field label="短期治療藥">（藥名 / 服用期間 / 頻率）</Field>
        <Field label="固定用藥" />
        <hr className="h-dash" />
        <div className="h-row-between">
          <span className="h-ph">[病名]</span>
          <span className="h-field"><span className="h-field-label">療程已結束：</span><YesNo /></span>
        </div>
        <Box>（描述）</Box>
        <Box>日後影響＋需留心處</Box>
      </>
    ),
  },
  {
    title: '傷病史 & 手術史',
    tone: 'yellow',
    body: (
      <>
        <p className="h-field"><span className="h-field-label">1.</span><span className="h-ph">{'[傷 / 手術名]　2026 / 3 / 13'}</span></p>
        <Box>（描述）</Box>
        <Box>日後影響＋需留心處</Box>
      </>
    ),
  },
  { title: '定期體檢 & 疫苗接種紀錄', tone: 'pink', body: <p className="h-todo">內容規劃中…</p> },
  { title: '看診記錄', tone: 'yellow', body: <p className="h-todo">內容規劃中…</p> },
  {
    title: '生育、結紮與其他',
    tone: 'pink',
    body: (
      <>
        <p className="h-field"><span className="h-field-label">生育：</span><YesNo /></p>
        <Box>1. Date<br />（描述）</Box>
        <p className="h-field"><span className="h-field-label">結紮：</span><YesNo /><span className="h-ph">{'　於 Date'}</span></p>
        <Field label="其他" />
      </>
    ),
  },
]

function Accordion({ title, tone, children }) {
  const [open, setOpen] = useState(false)
  return (
    <section className={`h-acc tone-${tone} ${open ? 'open' : ''}`}>
      <button type="button" className="h-acc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <svg className="h-acc-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M7.5 10l4.5 5 4.5-5z" />
        </svg>
      </button>
      <div className="h-acc-panel">
        <div className="h-acc-inner">
          <div className="h-acc-body">{children}</div>
        </div>
      </div>
    </section>
  )
}

// ---------- 日期描述框 ----------
function DayDetail({ dateKey, month, day, weekday, entry, onAddEvent, onSaveDiary }) {
  const [addingEvent, setAddingEvent] = useState(false)
  const [ev, setEv] = useState({ time: '', icon: ICONS[0], title: '' })
  const [editingDiary, setEditingDiary] = useState(false)
  const [diary, setDiary] = useState(entry?.diary ?? '')

  const events = entry?.events ?? []
  const hasDiary = Boolean(entry?.diary)

  const submitEvent = (e) => {
    e.preventDefault()
    if (!ev.title.trim()) return
    onAddEvent(dateKey, { ...ev, title: ev.title.trim() })
    setEv({ time: '', icon: ICONS[0], title: '' })
    setAddingEvent(false)
  }

  const submitDiary = (e) => {
    e.preventDefault()
    onSaveDiary(dateKey, diary.trim())
    setEditingDiary(false)
  }

  return (
    <article className="h-detail" aria-live="polite">
      <h2 className="h-detail-date">
        {month}月{day}日<small>（{WEEKDAYS[weekday]}）</small>
      </h2>

      {/* 預定事項 */}
      <div className="h-detail-part">
        {events.map((e, i) => (
          <p key={i} className="h-event">
            <span className="h-event-icon" aria-hidden="true">{e.icon}</span>
            <span className="h-event-name">{PET_NAME}</span>
            {e.time && <span className="h-event-time">{e.time}</span>}
            <span className="h-event-title">{e.title}</span>
          </p>
        ))}
        {addingEvent ? (
          <form className="h-form" onSubmit={submitEvent}>
            <div className="h-icon-pick" role="radiogroup" aria-label="圖示">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  role="radio"
                  aria-checked={ev.icon === ic}
                  className={ev.icon === ic ? 'on' : ''}
                  onClick={() => setEv({ ...ev, icon: ic })}
                >
                  {ic}
                </button>
              ))}
            </div>
            <div className="h-form-row">
              <input type="time" value={ev.time} onChange={(e) => setEv({ ...ev, time: e.target.value })} aria-label="時間" />
              <input
                value={ev.title}
                onChange={(e) => setEv({ ...ev, title: e.target.value })}
                placeholder="要做什麼呢？"
                aria-label="事項"
                autoFocus
              />
            </div>
            <div className="h-form-actions">
              <button type="button" className="h-btn-ghost" onClick={() => setAddingEvent(false)}>取消</button>
              <button type="submit" className="h-btn">儲存</button>
            </div>
          </form>
        ) : (
          <button type="button" className={`h-add ${events.length ? 'small' : ''}`} onClick={() => setAddingEvent(true)}>
            ＋ 新增預定事項
          </button>
        )}
      </div>

      <hr className="h-detail-sep" />

      {/* 心情日記 */}
      <div className="h-detail-part">
        {editingDiary ? (
          <form className="h-form" onSubmit={submitDiary}>
            <textarea
              rows={3}
              value={diary}
              onChange={(e) => setDiary(e.target.value)}
              placeholder={`今天的 ${PET_NAME} ……`}
              aria-label="心情日記"
              autoFocus
            />
            <div className="h-form-actions">
              <button type="button" className="h-btn-ghost" onClick={() => { setDiary(entry?.diary ?? ''); setEditingDiary(false) }}>取消</button>
              <button type="submit" className="h-btn">儲存</button>
            </div>
          </form>
        ) : hasDiary ? (
          <button type="button" className="h-diary" onClick={() => setEditingDiary(true)} aria-label="編輯日記">
            {entry.diary}
          </button>
        ) : (
          <button type="button" className="h-add" onClick={() => setEditingDiary(true)}>
            ＋ 新增日記
          </button>
        )}
      </div>
    </article>
  )
}

export default function History() {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState(keyOf(now.getFullYear(), now.getMonth(), now.getDate()))
  const [data, setData] = useState(loadData)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* 忽略 */
    }
  }, [data])

  const { y, m } = view
  const firstWeekday = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const todayKey = keyOf(now.getFullYear(), now.getMonth(), now.getDate())
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7) cells.push(null)

  const shiftMonth = (delta) => {
    const d = new Date(y, m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
    setSelected(null)
  }

  const addEvent = (k, ev) =>
    setData((p) => ({ ...p, [k]: { ...p[k], events: [...(p[k]?.events ?? []), ev] } }))
  const saveDiary = (k, text) =>
    setData((p) => ({ ...p, [k]: { ...p[k], diary: text } }))

  const selDay = selected && selected.startsWith(`${y}-${pad(m + 1)}`) ? Number(selected.slice(8)) : null

  return (
    <div className="history">
      <div className="h-blobs" aria-hidden="true">
        <svg className="h-blob coral" viewBox="0 0 200 160"><path d="M0 0h200c-6 40-40 52-78 58-44 7-58 44-82 86C28 162 10 160 0 156z" /></svg>
        <svg className="h-blob yellow" viewBox="0 0 200 140"><path d="M0 0h200v128c-30 18-62 0-80-24C98 76 60 70 30 44 12 28 2 14 0 0z" /></svg>
      </div>

      <header className="h-top">
        <h1 className="h-title">紀錄</h1>
        <div className="h-month">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="上個月">‹</button>
          <span className="h-month-label">
            <b>{m + 1}月</b>, {y}
          </span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="下個月">›</button>
        </div>
      </header>

      {/* 月曆 */}
      <div className="h-cal" role="grid" aria-label={`${y}年${m + 1}月`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="h-wd" role="columnheader">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="h-cell empty" />
          const k = keyOf(y, m, d)
          const entry = data[k]
          const icons = entry?.events?.map((e) => e.icon) ?? []
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              className={[
                'h-cell',
                entry?.diary ? 'has-diary' : '',
                k === selected ? 'selected' : '',
                k === todayKey ? 'today' : '',
              ].join(' ')}
              onClick={() => setSelected(k === selected ? null : k)}
              aria-pressed={k === selected}
              aria-label={`${m + 1}月${d}日${icons.length ? '，有預定事項' : ''}${entry?.diary ? '，有日記' : ''}`}
            >
              <span className="h-num">{d}</span>
              {icons.length > 0 && (
                <span className="h-icons" aria-hidden="true">
                  {icons.slice(0, 2).join('')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="h-legend">
        <span><i className="sw diary" />有日記</span>
        <span><i className="sw icon">💉</i>有預定事項</span>
      </p>

      {selDay && (
        <DayDetail
          key={selected}
          dateKey={selected}
          month={m + 1}
          day={selDay}
          weekday={new Date(y, m, selDay).getDay()}
          entry={data[selected]}
          onAddEvent={addEvent}
          onSaveDiary={saveDiary}
        />
      )}

      {/* 五個摺疊頁 */}
      <div className="h-accs">
        {SECTIONS.map((s) => (
          <Accordion key={s.title} title={s.title} tone={s.tone}>
            {s.body}
          </Accordion>
        ))}
      </div>
    </div>
  )
}
