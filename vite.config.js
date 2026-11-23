import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { consultApi } from './server/consultApi.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 第三個參數 '' 會讀入所有變數（含 ANTHROPIC_API_KEY），只給伺服器端用；
  // 前端只拿得到 VITE_ 開頭的變數，所以金鑰不會被打包進網頁
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), consultApi(env)],
  }
})
