import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VoiceInput.css'

// 瀏覽器內建語音辨識（Chrome / Edge / Safari）；Firefox 不支援時改成打字模擬
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

const ERRORS = {
  'not-allowed': '沒有麥克風權限，可以改用打字或點下面的範例',
  'service-not-allowed': '沒有麥克風權限，可以改用打字或點下面的範例',
  'no-speech': '沒聽到聲音，再按一次麥克風試試',
  'audio-capture': '找不到麥克風',
  network: '語音辨識需要網路連線',
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  )
}

function useSpeech(onText) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef(null)

  const start = () => {
    if (!SR) return
    recRef.current?.abort()
    const rec = new SR()
    rec.lang = 'zh-TW'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      onText(finalText + interim)
    }
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] || '辨識失敗，再試一次')
    }
    // 只處理目前這一個（避免舊的辨識結束時把狀態改掉）
    rec.onend = () => {
      if (recRef.current === rec) setListening(false)
    }
    recRef.current = rec
    setError('')
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }
  const stop = () => recRef.current?.stop()

  useEffect(() => () => recRef.current?.abort(), [])
  return { listening, error, start, stop }
}

function VoicePanel({ title, examples, parse, onApply, onClose }) {
  const [text, setText] = useState('')
  const { listening, error, start, stop } = useSpeech(setText)
  const parsed = useMemo(() => (text.trim() ? parse(text) : { fields: [], patch: {} }), [text, parse])

  // 打開就開始聽
  useEffect(() => {
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // 開著的時候背後的頁面不捲動
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const status = !SR
    ? '這個瀏覽器不支援語音，可以打字模擬或點範例'
    : error || (listening ? '聆聽中…說完停一下就好' : '按一下麥克風開始說話')

  return createPortal(
    <div className="vi-backdrop" onClick={onClose}>
      <div className="vi-panel" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <p className="vi-title">{title}</p>

        <button
          type="button"
          className={`vi-big-mic ${listening ? 'on' : ''}`}
          onClick={listening ? stop : start}
          disabled={!SR}
          aria-label={listening ? '停止' : '開始說話'}
        >
          <MicIcon />
        </button>
        <p className="vi-status" role="status">{status}</p>

        <textarea
          className="vi-text"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="說的話會出現在這裡，也可以直接打字修改"
          aria-label="辨識到的文字"
        />

        {examples?.length > 0 && (
          <div className="vi-examples">
            <span>試試看：</span>
            {examples.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="vi-result">
          <p className="vi-result-tag">聽懂了</p>
          {parsed.fields.length === 0 ? (
            <p className="vi-empty">還沒有可以填入的內容</p>
          ) : (
            <dl>
              {parsed.fields.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="vi-actions">
          <button type="button" className="vi-ghost" onClick={onClose}>取消</button>
          <button
            type="button"
            className="vi-ok"
            disabled={parsed.fields.length === 0}
            onClick={() => {
              onApply(parsed.patch)
              onClose()
            }}
          >
            填入
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// 小小的麥克風按鈕；按下開啟語音面板，確認後把解析結果交給 onApply
export function VoiceButton({ title = '用說的記錄', examples, parse, onApply, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={`vi-mic ${className}`} onClick={() => setOpen(true)} aria-label={title} title={title}>
        <MicIcon />
      </button>
      {open && <VoicePanel title={title} examples={examples} parse={parse} onApply={onApply} onClose={() => setOpen(false)} />}
    </>
  )
}
