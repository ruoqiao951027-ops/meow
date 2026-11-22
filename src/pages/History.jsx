import { createContext, useContext, useEffect, useState } from 'react'
import { PETS, useCurrentPet } from '../petStore.js'
import { DOG } from './historyDogData.js'
import './History.css'

const PetContext = createContext(PETS[0])
const usePet = () => useContext(PetContext)
const isMain = (pet) => pet.id === PETS[0].id
// 第一隻沿用原本的 key，舊資料不會遺失；其他寵物各自加後綴（v2：改用狗狗假資料）
const sk = (pet, base) => (isMain(pet) ? base : `${base}-${pet.id}-v2`)
// 貓用本檔的假資料，狗用 historyDogData.js
const seedFor = (pet, catSeed, dogKey) => (pet.species === 'dog' ? DOG[dogKey] : catSeed)
const VACCINE_TYPES = {
  cat: ['狂犬病', '三合一', '五合一', '其他'],
  dog: ['狂犬病', '八合一', '十合一', '犬舍咳', '其他'],
}
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const ICONS = ['💉', '🩺', '💊', '✨', '🩹', '🛁', '✂️', '📌']

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

// 假資料：以「本月」為準產生幾筆預定事項與日記
function seedData(pet) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const k = (d) => keyOf(y, m, d)
  if (pet.species === 'dog') return DOG.calendar(k)
  return {
    [k(2)]: {
      events: [{ time: '14:30', icon: '💉', title: '要打狂犬病疫苗。' }],
      diary: '今天超乖，不知道吃錯什麼藥。\n結果一回家就一直暗示要吃肉泥......',
    },
    [k(6)]: { events: [{ time: '10:00', icon: '🩺', title: '年度健康檢查' }] },
    [k(7)]: { diary: '下午一直趴在窗邊曬太陽，叫她都不理我。' },
    [k(9)]: { diary: '早上吐了一次毛球，之後精神都還不錯。' },
    [k(13)]: { events: [{ time: '20:00', icon: '💊', title: '餵體內外驅蟲藥' }] },
    [k(14)]: {
      events: [{ time: '', icon: '✨', title: `${pet.name} 生日！` }],
      diary: '六歲生日快樂！吃了一整份貓咪蛋糕，還想要。',
    },
    [k(15)]: { diary: '新的逗貓棒大成功，玩到氣喘吁吁。' },
    [k(17)]: { events: [{ time: '19:00', icon: '🩹', title: '傷口換藥' }], diary: '換藥時有點抗拒，用零食收買成功。' },
    [k(18)]: { diary: '今天食慾很好，三餐都吃光光。' },
    [k(20)]: { events: [{ time: '15:00', icon: '🛁', title: '美容洗澡' }] },
    [k(25)]: { events: [{ time: '11:00', icon: '✂️', title: '剪指甲' }] },
  }
}

function loadData(pet) {
  try {
    const saved = JSON.parse(localStorage.getItem(sk(pet, 'meow-history')))
    return saved ?? seedData(pet)
  } catch {
    return seedData(pet)
  }
}


// ---------- 定期體檢 & 疫苗（假資料） ----------
const CHECKUPS = [
  {
    date: '2025.11.08',
    hospital: '毛孩森林動物醫院',
    ai: [
      '體重 4.6 kg，體態評分 5/9，屬理想範圍，維持目前飲食即可。',
      '腎指數（BUN / CREA）落在正常上限附近，建議多補充水分，半年後回診追蹤。',
      '有輕度牙結石，建議每週刷牙 2–3 次。',
    ],
  },
  {
    date: '2024.11.16',
    hospital: '小貓掌動物醫院',
    ai: [
      '血液與尿液檢查各項數值皆在正常範圍。',
      '體重比去年增加 0.3 kg，留意零食份量。',
      '耳道有少量分泌物，建議每 2 週清潔一次。',
    ],
  },
  {
    date: '2023.11.11',
    hospital: '小貓掌動物醫院',
    ai: [
      '整體健康狀況良好。',
      '貓咪 3 歲後建議每年追蹤腎臟指數，可列入下次體檢項目。',
    ],
  },
]

const VACCINES = [
  { date: '2026.11.02', name: '狂犬病', place: '毛孩森林動物醫院', note: '打完那天整天都在睡，懶洋洋的，隔天就恢復活力了' },
  { date: '2025.11.08', name: '三合一', place: '毛孩森林動物醫院', note: '跟健檢同一天一起打，省得多跑一趟' },
  { date: '2025.10.18', name: '狂犬病', place: '毛孩森林動物醫院' },
  { date: '2024.11.16', name: '三合一', place: '小貓掌動物醫院' },
  { date: '2024.10.12', name: '狂犬病', place: '小貓掌動物醫院' },
  { date: '2023.11.11', name: '五合一', place: '小貓掌動物醫院', note: '醫生說那年可以改打五合一，就聽醫生的～' },
  { date: '2023.10.14', name: '狂犬病', place: '小貓掌動物醫院' },
]

// ---------- 看診記錄（假資料：有問題才去，可能連續回診） ----------
const VISITS = [
  {
    date: '2026.11.17',
    hospital: '毛孩森林動物醫院',
    reason: '右前腳傷口複診',
    followUp: 2,
    reminders: [
      { icon: '🧴', text: '外用藥膏每日 2 次，再擦 5 天' },
      { icon: '🚫', text: '頭套再戴 3 天，避免舔傷口' },
    ],
    ai: ['傷口癒合進度符合預期，持續上藥即可。', '若出現紅腫、滲液或跛行，請提前回診。'],
  },
  {
    date: '2026.11.10',
    hospital: '毛孩森林動物醫院',
    reason: '右前腳擦傷',
    followUp: 1,
    reminders: [
      { icon: '💊', text: '口服抗生素每日 2 次，共 7 天，需吃完' },
      { icon: '🧴', text: '外用藥膏每日 2 次' },
      { icon: '🚫', text: '一週內避免跳高，戴頭套防舔' },
    ],
    ai: ['抗生素請按時吃完，不要因好轉自行停藥。', '換藥前後洗手，保持傷口乾燥。', '7 天後回診確認癒合狀況。'],
  },
  {
    date: '2026.06.03',
    hospital: '小貓掌動物醫院',
    reason: '嘔吐、食慾下降',
    reminders: [
      { icon: '💊', text: '止吐藥每日 1 次，共 3 天' },
      { icon: '🍽️', text: '處方腸胃罐，少量多餐一週' },
    ],
    ai: ['記錄每日嘔吐次數與食量，持續超過 2 天請回診。', '留意是否有毛球問題，可搭配化毛膏。'],
  },
  {
    date: '2025.03.21',
    hospital: '小貓掌動物醫院',
    reason: '打噴嚏、流鼻水',
    reminders: [
      { icon: '💊', text: '抗病毒藥每日 2 次，共 5 天' },
      { icon: '🌡️', text: '保持室內溫暖，可開加濕器' },
    ],
    ai: ['疑似上呼吸道感染，注意食慾與精神。', '鼻塞會影響嗅覺，可將食物稍微加溫提高食慾。'],
  },
]

const AI_PENDING = ['AI 正在判讀上傳的資料，完成後會顯示建議。']

// 存在 localStorage 的清單，第一次使用假資料
function useStoredList(key, seed) {
  const [list, setList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? seed
    } catch {
      return seed
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(list))
    } catch {
      /* 照片太大存不下時忽略 */
    }
  }, [key, list])
  return [list, setList]
}

const toDot = (iso) => iso.replaceAll('-', '.')
const byDateDesc = (a, b) => b.date.localeCompare(a.date)

// 照片欄：有照片顯示照片，沒有就是灰色框
function Photo({ src, label }) {
  return src ? (
    <img className="h-report-photo" src={src} alt={label} />
  ) : (
    <div className="h-report-photo" role="img" aria-label={`${label}（尚未上傳）`}>{label}</div>
  )
}

function PhotoPicker({ value, onChange, label }) {
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = () => onChange(r.result)
    r.readAsDataURL(file)
  }
  return (
    <label className="h-photo-pick">
      {value ? <img src={value} alt="" /> : <span>＋<br />{label}</span>}
      <input type="file" accept="image/*" onChange={onFile} hidden />
    </label>
  )
}

function AddToggle({ label, open, onOpen }) {
  if (open) return null
  return (
    <button type="button" className="h-add small h-add-block" onClick={onOpen}>
      ＋ {label}
    </button>
  )
}

function FormActions({ onCancel }) {
  return (
    <div className="h-form-actions">
      <button type="button" className="h-btn-ghost" onClick={onCancel}>取消</button>
      <button type="submit" className="h-btn">儲存</button>
    </div>
  )
}

function AiBox({ items, title = '✦ AI 判讀建議' }) {
  return (
    <div className="h-ai">
      <p className="h-ai-tag">{title}</p>
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  )
}

function CheckupVaccine() {
  const pet = usePet()
  const [checkups, setCheckups] = useStoredList(sk(pet, 'meow-checkups'), seedFor(pet, CHECKUPS, 'checkups'))
  const [vaccines, setVaccines] = useStoredList(sk(pet, 'meow-vaccines-v2'), seedFor(pet, VACCINES, 'vaccines'))
  const vaccineTypes = VACCINE_TYPES[pet.species]
  const [ckForm, setCkForm] = useState(null)
  const [vxForm, setVxForm] = useState(null)

  const saveCheckup = (e) => {
    e.preventDefault()
    if (!ckForm.date || !ckForm.hospital.trim()) return
    setCheckups((l) => [{ ...ckForm, date: toDot(ckForm.date), ai: AI_PENDING }, ...l].sort(byDateDesc))
    setCkForm(null)
  }
  const saveVaccine = (e) => {
    e.preventDefault()
    if (!vxForm.date || !vxForm.place.trim()) return
    const name = vxForm.name === '其他' ? vxForm.custom.trim() || '其他' : vxForm.name
    const entry = { date: toDot(vxForm.date), name, place: vxForm.place.trim(), note: vxForm.note.trim() }
    setVaccines((l) => [entry, ...l].sort(byDateDesc))
    setVxForm(null)
  }

  return (
    <>
      <h3 className="h-sub">年度體檢</h3>
      <AddToggle label="新增體檢紀錄" open={ckForm} onOpen={() => setCkForm({ date: '', hospital: '', photo: null })} />
      {ckForm && (
        <form className="h-form h-card-form" onSubmit={saveCheckup}>
          <div className="h-form-row">
            <input type="date" value={ckForm.date} onChange={(e) => setCkForm({ ...ckForm, date: e.target.value })} aria-label="體檢日期" required />
            <input value={ckForm.hospital} onChange={(e) => setCkForm({ ...ckForm, hospital: e.target.value })} placeholder="寵物醫院" aria-label="寵物醫院" required />
          </div>
          <div className="h-form-row">
            <PhotoPicker value={ckForm.photo} onChange={(p) => setCkForm({ ...ckForm, photo: p })} label="上傳報告" />
            <p className="h-form-hint">上傳體檢報告照片後，AI 會自動判讀並給出建議。</p>
          </div>
          <FormActions onCancel={() => setCkForm(null)} />
        </form>
      )}
      {checkups.map((c) => (
        <div key={c.date + c.hospital} className="h-checkup">
          <div className="h-checkup-head">
            <span className="h-checkup-date">{c.date}</span>
            <span className="h-checkup-place">{c.hospital}</span>
          </div>
          <div className="h-checkup-body">
            <Photo src={c.photo} label="報告照片" />
            <AiBox items={c.ai} />
          </div>
        </div>
      ))}
      <p className="h-ai-note">AI 判讀僅供參考，請以獸醫師診斷為準。</p>

      <hr className="h-dash" />

      <h3 className="h-sub">疫苗接種</h3>
      <AddToggle label="新增接種紀錄" open={vxForm} onOpen={() => setVxForm({ date: '', name: '狂犬病', custom: '', place: '', note: '' })} />
      {vxForm && (
        <form className="h-form h-card-form" onSubmit={saveVaccine}>
          <div className="h-form-row">
            <input type="date" value={vxForm.date} onChange={(e) => setVxForm({ ...vxForm, date: e.target.value })} aria-label="接種日期" required />
            <select value={vxForm.name} onChange={(e) => setVxForm({ ...vxForm, name: e.target.value })} aria-label="疫苗種類">
              {vaccineTypes.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          {vxForm.name === '其他' && (
            <input
              value={vxForm.custom}
              onChange={(e) => setVxForm({ ...vxForm, custom: e.target.value })}
              placeholder="輸入疫苗名稱，例如：貓白血病疫苗"
              aria-label="疫苗名稱"
              required
              autoFocus
            />
          )}
          <input value={vxForm.place} onChange={(e) => setVxForm({ ...vxForm, place: e.target.value })} placeholder="接種地點" aria-label="接種地點" required />
          <input value={vxForm.note} onChange={(e) => setVxForm({ ...vxForm, note: e.target.value })} placeholder="備註（選填）" aria-label="備註" />
          <FormActions onCancel={() => setVxForm(null)} />
        </form>
      )}
      <ul className="h-vax">
        {vaccines.map((v, i) => (
          <li key={v.date + v.name + i}>
            <span className="h-vax-date">{v.date}</span>
            <span className={`h-vax-name ${v.name === '狂犬病' ? 'rabies' : 'combo'}`}>{v.name}</span>
            <span className="h-vax-place">{v.place}</span>
            {v.note && <span className="h-vax-note">※ {v.note}</span>}
          </li>
        ))}
      </ul>
    </>
  )
}

function Visits() {
  const pet = usePet()
  const [visits, setVisits] = useStoredList(sk(pet, 'meow-visits'), seedFor(pet, VISITS, 'visits'))
  const [form, setForm] = useState(null)

  const save = (e) => {
    e.preventDefault()
    if (!form.date || !form.hospital.trim() || !form.reason.trim()) return
    const reminders = form.reminders
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ icon: '📌', text }))
    setVisits((l) =>
      [{ date: toDot(form.date), hospital: form.hospital.trim(), reason: form.reason.trim(), photo: form.photo, reminders, ai: AI_PENDING }, ...l].sort(byDateDesc),
    )
    setForm(null)
  }

  return (
    <>
      <AddToggle label="新增看診紀錄" open={form} onOpen={() => setForm({ date: '', hospital: '', reason: '', photo: null, reminders: '' })} />
      {form && (
        <form className="h-form h-card-form" onSubmit={save}>
          <div className="h-form-row">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="看診日期" required />
            <input value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} placeholder="寵物醫院" aria-label="寵物醫院" required />
          </div>
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="看診原因，例如：嘔吐、回診" aria-label="看診原因" required />
          <div className="h-form-row">
            <PhotoPicker value={form.photo} onChange={(p) => setForm({ ...form, photo: p })} label="看診單" />
            <textarea
              rows={3}
              value={form.reminders}
              onChange={(e) => setForm({ ...form, reminders: e.target.value })}
              placeholder={'服藥、上藥或活動提醒\n一行一項'}
              aria-label="提醒事項"
            />
          </div>
          <FormActions onCancel={() => setForm(null)} />
        </form>
      )}
      {visits.map((v) => (
        <div key={v.date + v.reason} className="h-checkup">
          <div className="h-checkup-head">
            <span className="h-checkup-date">{v.date}</span>
            <span className="h-checkup-place">{v.hospital}</span>
          </div>
          <p className="h-visit-reason">
            {v.reason}
            {v.followUp && <span className="h-visit-tag">{v.followUp === 1 ? '初診' : `第 ${v.followUp} 次回診`}</span>}
          </p>
          <div className="h-checkup-body">
            <Photo src={v.photo} label="看診單" />
            <div className="h-visit-side">
              {v.reminders.length > 0 && (
                <ul className="h-reminders">
                  {v.reminders.map((r) => (
                    <li key={r.text}><span aria-hidden="true">{r.icon}</span>{r.text}</li>
                  ))}
                </ul>
              )}
              <AiBox items={v.ai} title="✦ AI 綜合建議" />
            </div>
          </div>
        </div>
      ))}
      <p className="h-ai-note">AI 建議僅供參考，請以獸醫師診斷為準。</p>
    </>
  )
}

// ---------- 疾病史 & 用藥（假資料，飼主口吻） ----------
const DISEASES = [
  {
    name: '雞肉過敏',
    date: '',
    place: '',
    desc: '吃了含雞肉的零食之後一直抓下巴，抓到都破皮了😢 帶去看醫生拿了止癢藥膏，換掉零食之後就慢慢好了。',
    impact: '買零食、飼料前一定要先看成分表！朋友送的零食也要先檢查。',
  },
  {
    name: '腸胃炎（一直吐、不吃飯）',
    date: '2026.06.03',
    place: '小貓掌動物醫院',
    desc: '那天早上連吐了三次，連最愛的肉泥都不吃，嚇死我了。醫生開了止吐藥，又換吃三天處方罐頭，一週後就恢復正常。',
    impact: '換飼料要慢慢換，不要一次全換掉。吐超過兩次就要注意。',
  },
  {
    name: '感冒（打噴嚏、流鼻水）',
    date: '2025.03.21',
    place: '小貓掌動物醫院',
    desc: '一直打噴嚏、鼻子濕濕的，聞不到味道所以食慾也變差。吃了五天藥，我還把罐頭微波一下讓她比較想吃。',
    impact: '換季時特別容易感冒，冷氣不要對著她吹。',
  },
]

const EVERY = ['每天', '每週', '每月']
// kind：fixed 固定用藥 / short 短期治療用藥；remind 是否已加入行事曆提醒
const MEDS = [
  { id: 'm1', kind: 'fixed', name: '體內外驅蟲滴劑', every: '每月', times: 1, days: '', time: '20:00', note: '滴在後頸，滴完那天不要摸那裡', remind: false },
  { id: 'm2', kind: 'fixed', name: '腎臟保健粉', every: '每天', times: 1, days: '', time: '08:00', note: '拌在早餐的濕食裡，她都沒發現😆', remind: false },
  { id: 'm3', kind: 'short', name: '傷口藥膏', every: '每天', times: 2, days: 5, time: '09:00', note: '擦完要盯著她，不然馬上就被舔掉', remind: false },
  { id: 'm4', kind: 'short', name: '口服抗生素', every: '每天', times: 2, days: 7, time: '09:00', note: '一定要吃完！包在肉泥裡她才肯吞', remind: false, ended: true },
]

const freqText = (m) => `${m.every} ${m.times} 次${m.days ? `，共 ${m.days} 天` : ''}`

// 從今天開始產生行事曆提醒；固定用藥沒有療程天數，先排一段時間
function reminderEvents(med) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const at = (d) => ({
    key: keyOf(d.getFullYear(), d.getMonth(), d.getDate()),
    ev: { time: med.time, icon: '💊', title: `${med.name}（${med.every} ${med.times} 次）` },
  })
  const out = []
  const days = Number(med.days) || 0
  if (med.every === '每天') {
    for (let i = 0; i < (days || 30); i++) out.push(at(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)))
  } else if (med.every === '每週') {
    const n = days ? Math.ceil(days / 7) : 8
    for (let i = 0; i < n; i++) out.push(at(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7)))
  } else {
    const n = days ? Math.max(1, Math.ceil(days / 30)) : 6
    for (let i = 0; i < n; i++) out.push(at(new Date(start.getFullYear(), start.getMonth() + i, start.getDate())))
  }
  return out
}

function ReminderToggle({ on, onChange, disabled }) {
  return (
    <span className="h-remind">
      <span className="h-remind-label">提醒</span>
      <span className="h-yn" role="radiogroup" aria-label="設置提醒">
        <button type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => onChange(true)} disabled={disabled}>Yes</button>
        <button type="button" role="radio" aria-checked={!on} className={on ? '' : 'on'} onClick={() => onChange(false)} disabled={disabled}>No</button>
      </span>
    </span>
  )
}

function MedicalHistory({ onAddReminders, onRemoveReminders }) {
  const pet = usePet()
  const [diseases, setDiseases] = useStoredList(sk(pet, 'meow-diseases'), seedFor(pet, DISEASES, 'diseases'))
  const [meds, setMeds] = useStoredList(sk(pet, 'meow-meds'), seedFor(pet, MEDS, 'meds'))
  const [dForm, setDForm] = useState(null)
  const [mForm, setMForm] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const setRemind = (med, on) => {
    if (on === med.remind) return
    if (on) {
      const evs = reminderEvents(med)
      onAddReminders(med.id, evs)
      setToast(`已在行事曆加入 ${evs.length} 筆「${med.name}」提醒`)
    } else {
      onRemoveReminders(med.id)
      setToast(`已移除「${med.name}」的提醒`)
    }
    setMeds((l) => l.map((x) => (x.id === med.id ? { ...x, remind: on } : x)))
  }

  const saveDisease = (e) => {
    e.preventDefault()
    if (!dForm.name.trim()) return
    const entry = { ...dForm, name: dForm.name.trim(), date: dForm.date ? toDot(dForm.date) : '', place: dForm.place.trim(), desc: dForm.desc.trim(), impact: dForm.impact.trim() }
    setDiseases((l) => [...l, entry])
    setDForm(null)
  }

  const saveMed = (e) => {
    e.preventDefault()
    if (!mForm.name.trim()) return
    const med = { ...mForm, id: `m${Date.now()}`, name: mForm.name.trim(), note: mForm.note.trim(), times: Number(mForm.times) || 1, remind: false }
    setMeds((l) => [...l, med])
    if (mForm.remind) setRemind(med, true)
    setMForm(null)
  }

  const sortedDiseases = [...diseases].sort((a, b) => (b.date || '9').localeCompare(a.date || '9'))

  const medGroup = (kind, label) => {
    const items = meds.filter((m) => m.kind === kind)
    return (
      <div className="h-group">
        <h4 className="h-sub-sm">{label}</h4>
        {items.length === 0 && <p className="h-ph h-small">暫無</p>}
        {items.map((m) => (
          <div key={m.id} className={`h-med ${m.ended ? 'ended' : ''}`}>
            <div className="h-med-head">
              <span className="h-med-name">
                {m.name}
                {m.ended && <span className="h-med-ended">已用完</span>}
              </span>
              <ReminderToggle on={m.remind} onChange={(on) => setRemind(m, on)} disabled={m.ended} />
            </div>
            <p className="h-med-freq">{freqText(m)}{m.time && ` · ${m.time}`}</p>
            {m.note && <p className="h-med-note">{m.note}</p>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <h3 className="h-sub">疾病史</h3>
      <AddToggle label="新增疾病紀錄" open={dForm} onOpen={() => setDForm({ name: '', date: '', place: '', desc: '', impact: '' })} />
      {dForm && (
        <form className="h-form h-card-form" onSubmit={saveDisease}>
          <input value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} placeholder="生什麼病？例如：感冒、過敏" aria-label="病名" required />
          <div className="h-form-row">
            <input type="date" value={dForm.date} onChange={(e) => setDForm({ ...dForm, date: e.target.value })} aria-label="日期（選填）" />
            <input value={dForm.place} onChange={(e) => setDForm({ ...dForm, place: e.target.value })} placeholder="地點（選填）" aria-label="地點" />
          </div>
          <textarea rows={2} value={dForm.desc} onChange={(e) => setDForm({ ...dForm, desc: e.target.value })} placeholder="怎麼處理的？" aria-label="處理經過" />
          <textarea rows={2} value={dForm.impact} onChange={(e) => setDForm({ ...dForm, impact: e.target.value })} placeholder="之後要注意的地方" aria-label="之後要注意" />
          <FormActions onCancel={() => setDForm(null)} />
        </form>
      )}
      {sortedDiseases.map((d) => (
        <div key={d.name + d.date} className="h-checkup">
          <div className="h-checkup-head">
            <span className="h-injury-title">{d.name}</span>
          </div>
          {(d.date || d.place) && (
            <p className="h-injury-meta">
              <span className="h-checkup-date">{d.date}</span>
              <span className="h-checkup-place">{d.place}</span>
            </p>
          )}
          <dl className="h-injury-dl">
            {d.desc && (<><dt>處理方式</dt><dd>{d.desc}</dd></>)}
            {d.impact && (<><dt>之後要注意</dt><dd>{d.impact}</dd></>)}
          </dl>
        </div>
      ))}

      <hr className="h-dash" />

      <h3 className="h-sub">用藥</h3>
      <AddToggle
        label="新增用藥"
        open={mForm}
        onOpen={() => setMForm({ kind: 'fixed', name: '', every: '每天', times: 1, days: '', time: '09:00', note: '', remind: false })}
      />
      {mForm && (
        <form className="h-form h-card-form" onSubmit={saveMed}>
          <div className="h-form-row">
            <select value={mForm.kind} onChange={(e) => setMForm({ ...mForm, kind: e.target.value })} aria-label="用藥類型">
              <option value="fixed">固定用藥</option>
              <option value="short">短期治療</option>
            </select>
            <input value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} placeholder="什麼藥？" aria-label="藥名" required />
          </div>
          <div className="h-form-row h-freq-row">
            <select value={mForm.every} onChange={(e) => setMForm({ ...mForm, every: e.target.value })} aria-label="頻率">
              {EVERY.map((x) => <option key={x}>{x}</option>)}
            </select>
            <input type="number" min="1" value={mForm.times} onChange={(e) => setMForm({ ...mForm, times: e.target.value })} aria-label="次數" />
            <span>次</span>
            <input type="number" min="1" value={mForm.days} onChange={(e) => setMForm({ ...mForm, days: e.target.value })} placeholder="共幾天" aria-label="用藥天數（選填）" />
            <span>天</span>
          </div>
          <div className="h-form-row">
            <input type="time" value={mForm.time} onChange={(e) => setMForm({ ...mForm, time: e.target.value })} aria-label="提醒時間" />
            <input value={mForm.note} onChange={(e) => setMForm({ ...mForm, note: e.target.value })} placeholder="備註（選填）" aria-label="備註" />
          </div>
          <div className="h-form-row h-center">
            <ReminderToggle on={mForm.remind} onChange={(on) => setMForm({ ...mForm, remind: on })} />
            <span className="h-form-hint">選擇 Yes 則自動加入行事曆</span>
          </div>
          <FormActions onCancel={() => setMForm(null)} />
        </form>
      )}
      {medGroup('fixed', '固定用藥')}
      {medGroup('short', '短期治療用藥')}

      {toast && <p className="h-toast" role="status">{toast}</p>}
    </>
  )
}

const SECTIONS = [
  {
    title: '疾病史 & 用藥',
    tone: 'pink',
    body: (ctx) => <MedicalHistory {...ctx} />,
  },
  {
    title: '傷病史 & 手術史',
    tone: 'yellow',
    body: <InjurySurgery />,
  },
  { title: '定期體檢 & 疫苗接種紀錄', tone: 'pink', body: <CheckupVaccine /> },
  { title: '看診記錄', tone: 'yellow', body: <Visits /> },
  {
    title: '生育、結紮與其他',
    tone: 'pink',
    body: <Reproduction />,
  },
]

// ---------- 生育、結紮（假資料） ----------
const BIRTHS = [
  {
    date: '2022.04.18',
    hospital: '小貓掌動物醫院',
    kittens: 3,
    note: '大概兩個小時就生完了，我在外面等得好緊張😭 三隻都很健康，兩隻橘白一隻三花，三個月大之後都被朋友們領養走了！',
  },
  {
    date: '2023.05.06',
    hospital: '小貓掌動物醫院',
    kittens: 4,
    note: '第四隻卡住出不來，還好醫生幫忙把牠拉出來。生完她都不太吃東西，補了一個禮拜的營養品才終於有食慾。',
  },
]
const SPAY = {
  date: '2023.08.20',
  hospital: '小貓掌動物醫院',
  note: '結紮完戴了 10 天頭套，一臉生無可戀😂 傷口長得很好，也拆線了～醫生說結紮後比較容易胖，零食要控制一下。',
}

function YesNoPick({ yes }) {
  return (
    <span className="h-yn">
      <span className={yes ? 'on' : ''}>Yes</span>
      <span className={yes ? '' : 'on'}>No</span>
    </span>
  )
}

function Reproduction() {
  const pet = usePet()
  const births = pet.species === 'dog' ? DOG.births : BIRTHS
  const spay = pet.species === 'dog' ? DOG.spay : SPAY
  return (
    <>
      <p className="h-field"><span className="h-field-label">生育：</span><YesNoPick yes={births.length > 0} /></p>
      {births.map((b, i) => (
        <div key={b.date} className="h-checkup">
          <div className="h-checkup-head">
            <span className="h-checkup-date">第{['一', '二', '三'][i]}胎{'　'}{b.date}</span>
            <span className="h-checkup-place">{b.hospital}</span>
          </div>
          <p className="h-kittens">
            <span aria-hidden="true">{'🐾'.repeat(b.kittens)}</span>
            共 <b>{b.kittens}</b> 隻
          </p>
          <p className="h-note">{b.note}</p>
        </div>
      ))}

      <p className="h-field h-gap"><span className="h-field-label">結紮：</span><YesNoPick yes={Boolean(spay)} /></p>
      {spay && (
        <div className="h-checkup">
          <div className="h-checkup-head">
            <span className="h-checkup-date">{spay.date}</span>
            <span className="h-checkup-place">{spay.hospital}</span>
          </div>
          <p className="h-note">{spay.note}</p>
        </div>
      )}

      <p className="h-field h-gap"><span className="h-field-label">其他：</span></p>
      <Others />
    </>
  )
}

// 不屬於體檢、疫苗、看診、生育結紮的其他狀況（飼主口吻）
const OTHERS = [
  { label: '晶片', text: '去年幫她打了晶片，也登記好了～之後搬家要記得去改地址！' },
  { label: '個性', text: '超級膽小，打雷或吸塵器一開就躲到床底下😂 坐車會一路哭，出門要蓋條布才會比較安靜。' },
]

function Others() {
  const pet = usePet()
  const [list, setList] = useStoredList(sk(pet, 'meow-others'), seedFor(pet, OTHERS, 'others'))
  const [form, setForm] = useState(null)

  const save = (e) => {
    e.preventDefault()
    if (!form.text.trim()) return
    setList((l) => [...l, { label: form.label.trim() || '其他', text: form.text.trim() }])
    setForm(null)
  }

  return (
    <>
      <ul className="h-others">
        {list.map((o, i) => (
          <li key={o.label + i}>
            <span className="h-other-label">{o.label}</span>
            <span>{o.text}</span>
          </li>
        ))}
      </ul>
      <AddToggle label="新增其他紀錄" open={form} onOpen={() => setForm({ label: '', text: '' })} />
      {form && (
        <form className="h-form h-card-form" onSubmit={save}>
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="標籤，例如：晶片、個性、習慣" aria-label="標籤" />
          <textarea rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="想記下來的事…" aria-label="內容" required />
          <FormActions onCancel={() => setForm(null)} />
        </form>
      )}
    </>
  )
}

// ---------- 傷病史 & 手術史（假資料；先天狀況沒有日期就不記） ----------
// type：傷病（含先天）/ 手術；congenital 為先天，不另外標註
const INJURIES = [
  {
    type: '傷病',
    congenital: true,
    title: '眼睛天生不好（眼瞼內翻）',
    desc: '從小就一直流眼淚、眼屎超多，常常瞇著眼睛。醫生說是下眼皮往內捲，睫毛會刺到眼睛。',
    impact: '眼睛比別的貓敏感，有點紅或一直瞇眼就要注意，可能又不舒服了。',
    advice: [
      '每天觀察是否有紅腫、瞇眼、分泌物變多或變黃綠色，出現時盡快就醫。',
      '用生理食鹽水沾濕棉片輕擦眼周，不要使用人用眼藥水。',
      '每年體檢時請醫師一併檢查眼睛。',
    ],
  },
  {
    type: '手術',
    title: '眼皮矯正手術',
    date: '2021.06.12',
    hospital: '小貓掌動物醫院',
    desc: '兩隻眼睛的下眼皮都做了矯正。回家戴了兩個禮拜的頭套，一直撞到門框好可憐，每天點眼藥點了 10 天，後來順利拆線了！',
    impact: '眼淚和眼屎少很多了～不過右眼偶爾還是會有一點點眼屎。',
    advice: [
      '右眼分泌物若連續 3 天以上增加，回診檢查是否復發。',
      '避免讓她在灰塵多或有煙霧的環境久待。',
    ],
  },
  {
    type: '傷病',
    title: '右前腳擦傷',
    date: '2026.11.10',
    hospital: '毛孩森林動物醫院',
    desc: '從櫃子上跳下來沒踩穩，右前腳掌磨破一塊，大概 1 公分。帶去醫院清傷口、擦藥。',
    impact: '還在慢慢好，醫生說應該不會留疤。',
    advice: [
      '傷口完全癒合前持續戴頭套、避免舔咬。',
      '考慮在高處跳台下方加防滑墊，減少再次受傷。',
    ],
  },
]

function InjuryCard({ x }) {
  return (
    <div className="h-checkup">
      <div className="h-checkup-head">
        <span className="h-injury-title">
          {x.title}
          {!x.congenital && <span className={`h-injury-type t-${x.type}`}>{x.type}</span>}
        </span>
      </div>
      {(x.date || x.hospital) && (
        <p className="h-injury-meta">
          <span className="h-checkup-date">{x.date}</span>
          <span className="h-checkup-place">{x.hospital}</span>
        </p>
      )}
      <dl className="h-injury-dl">
        <dt>簡述</dt>
        <dd>{x.desc}</dd>
        {x.impact && (
          <>
            <dt>之後要注意</dt>
            <dd>{x.impact}</dd>
          </>
        )}
      </dl>
      <AiBox items={x.advice} title="✦ 綜合建議" />
    </div>
  )
}

function InjurySurgery() {
  const pet = usePet()
  const [list, setList] = useStoredList(sk(pet, 'meow-injuries'), seedFor(pet, INJURIES, 'injuries'))
  const [form, setForm] = useState(null)

  const save = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.desc.trim()) return
    const entry = {
      type: form.type,
      title: form.title.trim(),
      date: form.date ? toDot(form.date) : '',
      hospital: form.hospital.trim(),
      desc: form.desc.trim(),
      impact: form.impact.trim(),
      advice: AI_PENDING,
    }
    setList((l) => [...l, entry])
    setForm(null)
  }

  // 傷病一組、手術一組；組內有日期的依新到舊，沒日期（先天）放最前面
  const sortGroup = (arr) => [...arr].sort((a, b) => (b.date || '9').localeCompare(a.date || '9'))
  const groups = [
    { name: '傷病', items: sortGroup(list.filter((x) => x.type !== '手術')) },
    { name: '手術', items: sortGroup(list.filter((x) => x.type === '手術')) },
  ]

  return (
    <>
      <AddToggle
        label="新增傷病 / 手術紀錄"
        open={form}
        onOpen={() => setForm({ type: '傷病', title: '', date: '', hospital: '', desc: '', impact: '' })}
      />
      {form && (
        <form className="h-form h-card-form" onSubmit={save}>
          <div className="h-form-row">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="類型">
              <option>傷病</option>
              <option>手術</option>
            </select>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="名稱，例如：腳擦傷" aria-label="名稱" required />
          </div>
          <div className="h-form-row">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="日期（選填）" />
            <input value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} placeholder="醫院（選填）" aria-label="醫院" />
          </div>
          <textarea rows={2} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="發生什麼事了？" aria-label="簡述" required />
          <textarea rows={2} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} placeholder="之後要注意的地方（選填）" aria-label="之後要注意" />
          <FormActions onCancel={() => setForm(null)} />
        </form>
      )}
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.name} className="h-group">
              <h3 className="h-sub">{g.name}</h3>
              {g.items.map((x) => <InjuryCard key={x.title + x.date} x={x} />)}
            </div>
          ),
      )}
    </>
  )
}

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
  const pet = usePet()
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
            <span className="h-event-name">{pet.name}</span>
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
              placeholder={`今天的 ${pet.name} ……`}
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
  const [petIdx, setPetIdx] = useCurrentPet() // 與日常頁同步
  const pet = PETS[petIdx]
  return (
    <PetContext.Provider value={pet}>
      {/* key 換寵物時整頁重新載入該寵物的資料 */}
      <HistoryPage key={pet.id} petIdx={petIdx} onSwitchPet={setPetIdx} />
    </PetContext.Provider>
  )
}

function PetSwitch({ petIdx, onSwitchPet }) {
  return (
    <div className="h-pet-switch" role="tablist" aria-label="切換寵物">
      {PETS.map((p, i) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={i === petIdx}
          className={i === petIdx ? 'on' : ''}
          onClick={() => onSwitchPet(i)}
        >
          {p.name}
        </button>
      ))}
    </div>
  )
}

function HistoryPage({ petIdx, onSwitchPet }) {
  const pet = usePet()
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState(null) // 一進頁面不預先展開任何日期
  const [showTop, setShowTop] = useState(false)

  // 往下滑超過一段距離才顯示「回到最上方」
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const [data, setData] = useState(() => loadData(pet))

  useEffect(() => {
    try {
      localStorage.setItem(sk(pet, 'meow-history'), JSON.stringify(data))
    } catch {
      /* 忽略 */
    }
  }, [pet, data])

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

  // 用藥提醒：每筆事件帶上 tag，取消時一次移除
  const addReminders = (tag, list) =>
    setData((p) => {
      const next = { ...p }
      list.forEach(({ key, ev }) => {
        next[key] = { ...next[key], events: [...(next[key]?.events ?? []), { ...ev, tag }] }
      })
      return next
    })
  const removeReminders = (tag) =>
    setData((p) => {
      const next = {}
      Object.entries(p).forEach(([k, v]) => {
        const events = v.events?.filter((e) => e.tag !== tag)
        const entry = { ...v, events }
        if (!events?.length) delete entry.events
        if (entry.events || entry.diary) next[k] = entry
      })
      return next
    })
  const sectionCtx = { onAddReminders: addReminders, onRemoveReminders: removeReminders }

  const selDay = selected && selected.startsWith(`${y}-${pad(m + 1)}`) ? Number(selected.slice(8)) : null

  return (
    <div className="history">
      <div className="h-blobs" aria-hidden="true">
        <svg className="h-blob coral" viewBox="0 0 200 160"><path d="M0 0h200c-6 40-40 52-78 58-44 7-58 44-82 86C28 162 10 160 0 156z" /></svg>
        <svg className="h-blob yellow" viewBox="0 0 200 140"><path d="M0 0h200v128c-30 18-62 0-80-24C98 76 60 70 30 44 12 28 2 14 0 0z" /></svg>
        <svg className="h-blob blue" viewBox="0 0 120 220"><path d="M120 0v220H40c-24-24-6-56 18-80 22-22 4-56 20-90C88 28 104 8 120 0z" /></svg>
        <svg className="h-blob green" viewBox="0 0 200 110"><path d="M0 0c30 10 52 40 86 54 34 14 80 14 114 56H0z" /></svg>
      </div>

      <header className="h-top">
        <h1 className="sr-only">{pet.name} 的紀錄</h1>
        <PetSwitch petIdx={petIdx} onSwitchPet={onSwitchPet} />
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
            {typeof s.body === 'function' ? s.body(sectionCtx) : s.body}
          </Accordion>
        ))}
      </div>

      <button
        type="button"
        className={`h-to-top ${showTop ? 'show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="回到最上方"
        tabIndex={showTop ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6" /></svg>
      </button>
    </div>
  )
}
