// 競賽規定的提示文字（第 35 條）：所有個別化健康、營養、照護建議的畫面都要清楚顯示
export const DISCLAIMER =
  '本作品提供之資訊僅供輔助參考，不能取代獸醫師之診斷、治療或專業建議。貓犬之健康與營養需求可能因個體狀況而異，如有健康疑慮或需要調整飲食與照護方式，請諮詢合格獸醫師。'

export default function Disclaimer({ className = '' }) {
  return (
    <p className={`disclaimer ${className}`} role="note">
      <span className="disclaimer-icon" aria-hidden="true">⚠️</span>
      <span>{DISCLAIMER}</span>
    </p>
  )
}
