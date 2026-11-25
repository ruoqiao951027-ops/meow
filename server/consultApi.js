// 諮詢頁的後端：在 Vite 開發伺服器（npm run dev / npm run preview）上提供 POST /api/consult
// API 金鑰只在這裡（伺服器端）使用，不會送到瀏覽器
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from './consultPrompt.js'

const MODEL = 'claude-opus-5-5'
const MAX_BODY = 15 * 1024 * 1024 // 含照片
const MAX_MESSAGES = 30
const MAX_TEXT = 6000
const MAX_IMAGES = 4
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// 前端送來 [{ role, text, images: [{ media_type, data }] }]，轉成 Messages API 格式
function toApiMessages(list) {
  if (!Array.isArray(list) || list.length === 0) throw new Error('沒有訊息')
  const msgs = list.slice(-MAX_MESSAGES).map((m) => {
    if (m.role !== 'user' && m.role !== 'assistant') throw new Error('訊息格式錯誤')
    const text = String(m.text ?? '').slice(0, MAX_TEXT)
    const images = m.role === 'user' && Array.isArray(m.images) ? m.images.slice(0, MAX_IMAGES) : []
    const content = []
    for (const img of images) {
      if (!IMAGE_TYPES.has(img?.media_type) || typeof img.data !== 'string') throw new Error('照片格式錯誤')
      content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })
    }
    if (text.trim()) content.push({ type: 'text', text })
    return { role: m.role, content }
  })
  // 第一則必須是使用者；空內容的訊息拿掉
  while (msgs.length && msgs[0].role !== 'user') msgs.shift()
  const clean = msgs.filter((m) => m.content.length > 0)
  if (!clean.length || clean.at(-1).role !== 'user') throw new Error('最後一則必須是使用者的訊息')
  return clean
}

function errorText(err) {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return 'AI 服務的 API 金鑰無效，請檢查 .env.local 裡的 ANTHROPIC_API_KEY。'
  if (err instanceof Anthropic.RateLimitError) return '現在詢問的人太多了，請稍等一下再試。'
  if (err instanceof Anthropic.BadRequestError) return '這則訊息沒辦法處理（可能是照片太大或格式不支援），請換個方式再試。'
  if (err instanceof Anthropic.APIConnectionError) return '連不上 AI 服務，請檢查網路連線。'
  if (err instanceof Anthropic.APIError) return `AI 服務暫時有問題（${err.status ?? '未知'}），請稍後再試。`
  if (/api.?key|auth/i.test(String(err?.message))) return '還沒有設定 AI 服務的 API 金鑰：請在專案根目錄的 .env.local 加上 ANTHROPIC_API_KEY=你的金鑰，再重新啟動 npm run dev。'
  return 'AI 服務發生錯誤，請稍後再試。'
}

export function consultApi(env = {}) {
  const handler = async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/consult') return next()
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end()
    }

    const send = (obj) => res.write(JSON.stringify(obj) + '\n')
    let messages
    let petContext
    try {
      const body = JSON.parse(await readBody(req))
      messages = toApiMessages(body.messages)
      petContext = String(body.petContext ?? '').slice(0, 8000)
    } catch (err) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      return res.end(JSON.stringify({ error: err?.message === 'too large' ? '照片太大了' : err?.message || '請求格式錯誤' }))
    }

    // 逐行送出 JSON：{ t: 'text', v } / { t: 'error', v } / { t: 'done' }
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    })

    let stream
    res.on('close', () => {
      if (!res.writableEnded) stream?.abort()
    })

    try {
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
      const client = new Anthropic(apiKey ? { apiKey } : {})
      const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
      stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        output_config: { effort: 'medium' },
        // 被安全機制擋下時，自動改用備援模型回答
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `今天是 ${today}。\n\n目前諮詢的寵物資料：\n${petContext || '（沒有資料）'}` },
        ],
        messages,
      })
      stream.on('text', (t) => send({ t: 'text', v: t }))
      const final = await stream.finalMessage()
      if (final.stop_reason === 'refusal') send({ t: 'error', v: '這個問題沒辦法回答，換個方式描述看看？' })
      else if (final.stop_reason === 'max_tokens') send({ t: 'error', v: '回答太長被截斷了，可以請我精簡一點。' })
      send({ t: 'done' })
    } catch (err) {
      if (err instanceof Anthropic.APIUserAbortError) return
      console.error('[consult]', err?.status ?? '', err?.message)
      send({ t: 'error', v: errorText(err) })
    }
    res.end()
  }

  return {
    name: 'consult-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
