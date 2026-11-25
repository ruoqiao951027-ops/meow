import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PETS, useCurrentPet } from '../petStore.js'
import { buildPetContext, latestWeight } from '../petContext.js'
import { VoiceButton } from '../VoiceInput.jsx'
import { candidatesText, matchFoods } from '../foodMatch.js'
import { FLAG_LABEL, PRODUCTS, TYPE_LABEL, feedingText, findProduct, nutritionText, productUrl, rxLabel, speciesLabel } from '../data/royalCanin.js'
import './Consult.css'

// AI 回答最後一行「推薦商品：AN24、DR25」→ 拆出來顯示成商品卡片
function splitProducts(text) {
  const lines = text.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].replace(/\*/g, '').trim().match(/^推薦商品[:：]\s*(.*)$/)
    if (!m) continue
    const codes = m[1].split(/[、,，\s]+/).filter((c) => c && findProduct(c))
    return { body: [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n'), codes: [...new Set(codes)] }
  }
  return { body: text, codes: [] }
}

const TYPE_ICON = { d: '🥣', w: '🍲', c: '🥫', l: '🍼' }

function ProductImage({ p }) {
  const [broken, setBroken] = useState(false)
  const src = p.variants.find((v) => v.image)?.image
  if (!src || broken) return <span className="c-prod-icon" aria-hidden="true">{TYPE_ICON[p.type]}</span>
  return <img className="c-prod-img" src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
}

function ProductCard({ code }) {
  const p = findProduct(code)
  if (!p) return null
  return (
    <div className="c-prod">
      <div className="c-prod-head">
        <ProductImage p={p} />
        <div className="c-prod-title">
          <p className="c-prod-name">{p.name}</p>
          <p className="c-prod-meta">
            {p.code}・{speciesLabel(p.species)}・{TYPE_LABEL[p.type]}
            {p.kcal ? `・${p.kcal} kcal/kg` : ''}
          </p>
        </div>
        <span className={`c-prod-rx rx-${p.rx}`}>{rxLabel(p.rx)}</span>
      </div>
      {p.tags.length > 0 && (
        <div className="c-prod-tags">
          {p.tags.map((t) => <span key={t}>{t}</span>)}
        </div>
      )}
      <div className="c-prod-buy">
        {p.variants.map((v) =>
          v.soldOut ? (
            <span key={v.id} className="c-prod-size is-out">{v.pack} 已售完</span>
          ) : (
            <a key={v.id} className="c-prod-size" href={v.url || productUrl(v.id)} target="_blank" rel="noopener noreferrer">
              {v.pack}・NT${v.price.toLocaleString()} ↗
            </a>
          ),
        )}
      </div>
      {p.rx !== 0 && <p className="c-prod-note">處方相關商品，請先經獸醫師評估；此通路為合作動物醫院限定。</p>}
    </div>
  )
}

// 份量計算：選了皇家商品就自動帶入熱量與營養資料
function productSummary(p) {
  const flags = [...p.flags].filter((f) => FLAG_LABEL[f]).map((f) => FLAG_LABEL[f]).join('、')
  return [
    `營養分析：${nutritionText(p)}`,
    `成分含：${flags}`,
    `功能：${p.tags.join('、') || '一般營養'}；${rxLabel(p.rx)}；適用：${p.stageText}`,
    p.ingredients && `成分表：${p.ingredients}`,
  ]
    .filter(Boolean)
    .join('\n')
}

const storeKey = (pet) => `meow-consult-${pet.id}`
let nextId = Date.now()
const uid = () => String(nextId++)

function loadChat(pet) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(pet))) ?? []
  } catch {
    return []
  }
}

// 照片縮小成 JPEG 再送出，避免太大
function fileToJpeg(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('讀不到這張照片'))
    }
    img.src = url
  })
}
const toApiImage = (dataUrl) => ({ media_type: 'image/jpeg', data: dataUrl.split(',')[1] })

// ---------- 簡易 Markdown：### 標題、條列、**粗體**、緊急程度標籤 ----------
const URGENCY = { '🔴': 'red', '🟠': 'orange', '🟡': 'yellow', '🟢': 'green' }

function inline(s) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.length > 4 && p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  )
}

function MdText({ text }) {
  const out = []
  let list = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    out.push(<Tag key={`l${out.length}`}>{list.items}</Tag>)
    list = null
  }
  text.split('\n').forEach((raw, i) => {
    // AI 偶爾會輸出 <small> 之類的 HTML，一律拿掉只留文字
    const line = raw.replace(/<\/?[a-z][^>]*>/gi, '').trimEnd()
    if (/^※/.test(line.trim()) || (/不能取代獸醫/.test(line) && line.length < 60)) {
      flush()
      out.push(<p key={i} className="c-note">{line.trim().replace(/^※\s*/, '※ ')}</p>)
      return
    }
    const urg = line.match(/^\**緊急程度[:：]\s*(🔴|🟠|🟡|🟢)\s*(.+?)\**$/)
    if (urg) {
      flush()
      out.push(
        <p key={i} className={`c-urgency u-${URGENCY[urg[1]]}`}>
          <span aria-hidden="true">{urg[1]}</span>
          {urg[2]}
        </p>,
      )
      return
    }
    const h = line.match(/^#{1,4}\s+(.*)/)
    if (h) {
      flush()
      out.push(<p key={i} className="c-h">{inline(h[1])}</p>)
      return
    }
    const li = line.match(/^\s*(?:[-*•]|(\d+)[.)、])\s+(.*)/)
    if (li) {
      const ordered = Boolean(li[1])
      if (!list || list.ordered !== ordered) {
        flush()
        list = { ordered, items: [] }
      }
      list.items.push(<li key={i}>{inline(li[2])}</li>)
      return
    }
    flush()
    if (line.trim()) out.push(<p key={i}>{inline(line)}</p>)
  })
  flush()
  return out
}

function AssistantBody({ text }) {
  const { body, codes } = splitProducts(text)
  return (
    <>
      <MdText text={body} />
      {codes.length > 0 && (
        <div className="c-prods">
          {codes.map((c) => <ProductCard key={c} code={c} />)}
        </div>
      )}
    </>
  )
}

// ---------- 對 /api/consult 送出並逐字接收 ----------
async function streamConsult({ messages, petContext, signal, onText }) {
  const res = await fetch('/api/consult', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, petContext }),
    signal,
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    if (res.status === 404) throw new Error('找不到 AI 服務，請用 npm run dev 啟動 App。')
    throw new Error(j.error || `連線失敗（${res.status}）`)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let error = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i)
      buf = buf.slice(i + 1)
      if (!line.trim()) continue
      const ev = JSON.parse(line)
      if (ev.t === 'text') onText(ev.v)
      else if (ev.t === 'error') error = ev.v
    }
  }
  if (error) throw new Error(error)
}

// ---------- 下方三個功能格 ----------
function FeatureTiles({ onFood, onPortion, disabled }) {
  return (
    <nav className="c-tiles" aria-label="主要功能">
      <button type="button" className="c-tile t-coral" onClick={onFood} disabled={disabled}>
        <span className="c-tile-icon" aria-hidden="true">🥣</span>
        <span className="c-tile-title">飼料推薦</span>
        <span className="c-tile-sub">依紀錄推薦皇家飼料</span>
      </button>
      <button type="button" className="c-tile t-yellow" onClick={onPortion} disabled={disabled}>
        <span className="c-tile-icon" aria-hidden="true">⚖️</span>
        <span className="c-tile-title">份量計算</span>
        <span className="c-tile-sub">分析成分算每餐份量</span>
      </button>
      <button type="button" className="c-tile t-blue is-soon" disabled aria-disabled="true">
        <span className="c-tile-icon" aria-hidden="true">✨</span>
        <span className="c-tile-title">敬請期待</span>
        <span className="c-tile-sub">新功能規劃中</span>
      </button>
    </nav>
  )
}

// ---------- 份量計算：輸入飼料資料 ----------
function PortionSheet({ pet, onSubmit, onClose }) {
  const [f, setF] = useState(() => ({
    food: '',
    code: '', // 選了皇家商品時，送出會附上官方餵食表
    ingredients: '',
    kcal: '',
    weight: String(latestWeight(pet) || ''),
    goal: '維持體重',
    activity: '普通',
    photos: [],
  }))
  const [err, setErr] = useState('')
  const set = (patch) => setF((p) => ({ ...p, ...patch }))

  // Esc 關閉；開著的時候背後的頁面不捲動
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 3 - f.photos.length)
    e.target.value = ''
    try {
      const urls = await Promise.all(files.map((file) => fileToJpeg(file)))
      set({ photos: [...f.photos, ...urls] })
    } catch (er) {
      setErr(er.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!f.food.trim() && !f.ingredients.trim() && f.photos.length === 0) {
      setErr('請至少填飼料名稱、成分，或上傳包裝照片')
      return
    }
    const lines = [
      '【份量計算】',
      `飼料：${f.food.trim() || '（看照片）'}`,
      f.ingredients.trim() && `成分 / 營養標示：${f.ingredients.trim()}`,
      f.kcal.trim() && `熱量：${f.kcal.trim()}`,
      `目前體重：${f.weight ? `${f.weight} kg` : '不確定'}`,
      `目標：${f.goal}`,
      `活動量：${f.activity}`,
      `一天餵 ${pet.meals} 餐`,
      f.photos.length > 0 && `（附上 ${f.photos.length} 張包裝照片）`,
    ].filter(Boolean)
    let hidden = ''
    const p = f.code && findProduct(f.code)
    if (p) {
      try {
        const table = await feedingText(p.code, Number(f.weight) || null)
        hidden = [
          p.feeding && `【官方餵食建議摘要】${p.code}：${p.feeding}`,
          table && `【官方餵食表】${p.code}（皇家官網，體重最接近的列）：\n${table}`,
        ]
          .filter(Boolean)
          .join('\n')
      } catch {
        // 餵食表載入失敗就只用公式計算
      }
    }
    onSubmit(lines.join('\n'), f.photos, hidden)
  }

  // 放到 body 底下，浮在整個畫面（含 tabbar）上面，不受對話頁版面影響
  return createPortal(
    <div className="c-modal-backdrop" onClick={onClose}>
      <form className="c-modal" role="dialog" aria-modal="true" aria-label="份量計算" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="c-modal-close" onClick={onClose} aria-label="關閉">✕</button>
        <h2 className="c-modal-title">⚖️ 份量計算</h2>
        <p className="c-sheet-hint">輸入 {pet.name} 正在吃或想試的飼料，AI 會分析成分並算出每餐份量。</p>
        <label className="c-field">
          <span>從皇家商品選擇（選填，會自動帶入熱量與成分）</span>
          <select
            value=""
            onChange={(e) => {
              const p = findProduct(e.target.value)
              if (!p) return
              set({
                code: p.code,
                food: `${p.code} ${speciesLabel(p.species)} ${p.name}（${TYPE_LABEL[p.type]}）`,
                kcal: p.kcal ? `${p.kcal} kcal/kg` : '',
                ingredients: productSummary(p),
              })
            }}
          >
            <option value="">— 選擇商品 —</option>
            {PRODUCTS.filter((p) => (p.species === pet.species || p.species === 'both') && p.type !== 'l').map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="c-field">
          <span>飼料名稱</span>
          <input value={f.food} onChange={(e) => set({ food: e.target.value, code: '' })} placeholder="例如：室內成貓乾糧" />
        </label>
        <label className="c-field">
          <span>成分 / 營養標示（選填）</span>
          <textarea
            rows={3}
            value={f.ingredients}
            onChange={(e) => set({ ingredients: e.target.value })}
            placeholder="可以直接貼上包裝背面的成分和保證分析值，或改上傳照片"
          />
        </label>
        <div className="c-field">
          <span>包裝照片（選填，最多 3 張）</span>
          <div className="c-photos">
            {f.photos.map((p, i) => (
              <button key={i} type="button" className="c-photo" onClick={() => set({ photos: f.photos.filter((_, j) => j !== i) })} aria-label="移除照片">
                <img src={p} alt="" />
                <span aria-hidden="true">×</span>
              </button>
            ))}
            {f.photos.length < 3 && (
              <label className="c-photo c-photo-add">
                ＋
                <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
              </label>
            )}
          </div>
        </div>
        <div className="c-field-row">
          <label className="c-field">
            <span>熱量（選填）</span>
            <input value={f.kcal} onChange={(e) => set({ kcal: e.target.value })} placeholder="3800 kcal/kg" />
          </label>
          <label className="c-field">
            <span>目前體重 kg</span>
            <input inputMode="decimal" value={f.weight} onChange={(e) => set({ weight: e.target.value.replace(/[^\d.]/g, '') })} placeholder="4.5" />
          </label>
        </div>
        <div className="c-field-row">
          <label className="c-field">
            <span>目標</span>
            <select value={f.goal} onChange={(e) => set({ goal: e.target.value })}>
              <option>維持體重</option>
              <option>減重</option>
              <option>增重</option>
            </select>
          </label>
          <label className="c-field">
            <span>活動量</span>
            <select value={f.activity} onChange={(e) => set({ activity: e.target.value })}>
              <option>低</option>
              <option>普通</option>
              <option>高</option>
            </select>
          </label>
        </div>
        {err && <p className="c-sheet-err" role="alert">{err}</p>}
        <div className="c-sheet-actions">
          <button type="button" className="c-btn-ghost" onClick={onClose}>取消</button>
          <button type="submit" className="c-btn">開始計算</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

// ---------- 對話 ----------
function suggestionsFor(pet) {
  return pet.species === 'dog'
    ? [`${pet.name}的耳朵好紅還一直抓，是發生什麼問題？我該怎麼辦？`, `${pet.name}偷吃了一小塊巧克力怎麼辦？`, '怎麼把用藥加到行事曆提醒？']
    : [`${pet.name}早上吐了一次毛球，需要看醫生嗎？`, '貓咪一直舔毛舔到禿一塊怎麼辦？', '當月匯表在哪裡看？']
}

function ConsultChat({ pet, petIdx, onSwitchPet }) {
  const [messages, setMessages] = useState(() => loadChat(pet))
  const [input, setInput] = useState('')
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  const [portion, setPortion] = useState(false)
  const closePortion = useCallback(() => setPortion(false), [])
  const listRef = useRef(null)
  const abortRef = useRef(null)
  const inputRef = useRef(null)

  // 存檔：照片太大不存，只留張數
  useEffect(() => {
    try {
      const slim = messages
        .filter((m) => !m.pending)
        .map(({ images: imgs, ...m }) => (imgs?.length ? { ...m, imageCount: imgs.length } : m))
      localStorage.setItem(storeKey(pet), JSON.stringify(slim.slice(-60)))
    } catch {
      /* 存不下就算了 */
    }
  }, [pet, messages])

  // 有新內容時捲到最下面
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => () => abortRef.current?.abort(), [])

  // hidden：送給 AI 但不顯示在對話裡的補充資料（例如候選商品清單）
  const send = async (text, imgs = [], hidden = '') => {
    const t = text.trim()
    if ((!t && imgs.length === 0) || busy) return
    const userMsg = { id: uid(), role: 'user', text: t, images: imgs, ...(hidden && { hidden }) }
    const aid = uid()
    const history = [...messages, userMsg]
    setMessages([...history, { id: aid, role: 'assistant', text: '', pending: true }])
    setInput('')
    setImages([])
    setBusy(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl
    const payload = history
      .filter((m) => !m.error && (m.text || m.images?.length))
      .map((m) => ({
        role: m.role,
        text: m.hidden ? `${m.text}\n\n${m.hidden}` : m.text,
        images: (m.images || []).map(toApiImage),
      }))

    const patch = (fn) => setMessages((list) => list.map((m) => (m.id === aid ? fn(m) : m)))
    try {
      await streamConsult({
        messages: payload,
        petContext: buildPetContext(pet),
        signal: ctrl.signal,
        onText: (v) => patch((m) => ({ ...m, text: m.text + v })),
      })
      patch((m) => ({ ...m, pending: false }))
    } catch (err) {
      if (err.name === 'AbortError') patch((m) => ({ ...m, pending: false, text: m.text || '（已停止）', stopped: true }))
      else patch((m) => ({ ...m, pending: false, error: true, text: err.message || '發生錯誤，請再試一次。' }))
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const pickImages = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 4 - images.length)
    e.target.value = ''
    const urls = await Promise.all(files.map((f) => fileToJpeg(f).catch(() => null)))
    setImages((p) => [...p, ...urls.filter(Boolean)])
  }

  const clear = () => {
    abortRef.current?.abort()
    setMessages([])
  }

  const foodRecommend = () => {
    const matched = matchFoods(pet, buildPetContext(pet), Number(latestWeight(pet)) || null)
    send(
      `【飼料推薦】請根據${pet.name}目前的身體狀況和紀錄，推薦適合的飼料。`,
      [],
      candidatesText(pet, matched),
    )
  }

  return (
    <div className="consult">
      <div className="c-blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <header className="c-top">
        <div className="c-pets" role="tablist" aria-label="切換諮詢的寵物">
          {PETS.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === petIdx} className={i === petIdx ? 'on' : ''} onClick={() => onSwitchPet(i)}>
              {p.name}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button type="button" className="c-clear" onClick={clear}>
            清除對話
          </button>
        )}
      </header>

      <div className="c-list" ref={listRef} aria-live="polite">
        <div className="c-row bot">
          <span className="c-avatar" aria-hidden="true">🐾</span>
          <div className="c-bubble">
            <p>嗨！我是毛孩小幫手。我已經看過 <b>{pet.name}</b> 的紀錄了，App 怎麼用、身體哪裡怪怪的，都可以問我，我會告訴你現在該怎麼做。</p>
          </div>
        </div>
        {messages.length === 0 && (
          <div className="c-suggest">
            {suggestionsFor(pet).map((s) => (
              <button key={s} type="button" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="c-row me">
              <div className="c-bubble">
                {m.images?.length > 0 && (
                  <div className="c-imgs">
                    {m.images.map((src, i) => <img key={i} src={src} alt="附上的照片" />)}
                  </div>
                )}
                {!m.images?.length && m.imageCount > 0 && <p className="c-img-note">📷 {m.imageCount} 張照片</p>}
                {m.text && <p className="c-pre">{m.text}</p>}
              </div>
            </div>
          ) : (
            <div key={m.id} className="c-row bot">
              <span className="c-avatar" aria-hidden="true">🐾</span>
              <div className={`c-bubble ${m.error ? 'is-error' : ''}`}>
                {m.pending && !m.text ? (
                  <span className="c-typing" aria-label="思考中">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : m.error ? (
                  <p>⚠️ {m.text}</p>
                ) : (
                  <AssistantBody text={m.text} />
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <form
        className="c-composer"
        onSubmit={(e) => {
          e.preventDefault()
          send(input, images)
        }}
      >
        {images.length > 0 && (
          <div className="c-attach">
            {images.map((src, i) => (
              <button key={i} type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} aria-label="移除照片">
                <img src={src} alt="" />
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}
        <div className="c-input-row">
          <label className="c-icon-btn" aria-label="附上照片" title="附上照片">
            📷
            <input type="file" accept="image/*" multiple hidden onChange={pickImages} disabled={images.length >= 4} />
          </label>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send(input, images)
              }
            }}
            placeholder={`問問 ${pet.name} 的狀況…`}
            aria-label="輸入問題"
          />
          <VoiceButton
            title="用說的提問"
            parse={(t) => ({ fields: t.trim() ? [{ label: '問題', value: t.trim() }] : [], patch: { text: t.trim() } })}
            onApply={({ text }) => {
              setInput((p) => (p ? `${p} ${text}` : text))
              inputRef.current?.focus()
            }}
          />
          {busy ? (
            <button type="button" className="c-send is-stop" onClick={() => abortRef.current?.abort()} aria-label="停止回答">
              ■
            </button>
          ) : (
            <button type="submit" className="c-send" disabled={!input.trim() && images.length === 0} aria-label="送出">
              ➤
            </button>
          )}
        </div>
      </form>

      {!focused && <FeatureTiles onFood={foodRecommend} onPortion={() => setPortion(true)} disabled={busy} />}

      {portion && (
        <PortionSheet
          pet={pet}
          onClose={closePortion}
          onSubmit={(text, photos, hidden) => {
            setPortion(false)
            send(text, photos, hidden)
          }}
        />
      )}
    </div>
  )
}

export default function Consult() {
  const [petIdx, setPetIdx] = useCurrentPet()
  const pet = PETS[petIdx]
  // 換寵物時整個對話換成那隻的（各自保存）
  return <ConsultChat key={pet.id} pet={pet} petIdx={petIdx} onSwitchPet={setPetIdx} />
}
