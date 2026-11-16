import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/records', label: '日常', icon: '📝' },
  { to: '/history', label: '紀錄', icon: '📋' },
  { to: '/consult', label: '諮詢', icon: '💬' },
  { to: '/community', label: '社群', icon: '🐾' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className="tab">
          <span className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}