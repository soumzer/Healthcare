import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center text-xs ${isActive ? 'text-white' : 'text-zinc-500'}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-3 pb-[env(safe-area-inset-bottom)]">
      <NavLink to="/" className={linkClass}>
        <span className="text-lg">{'\u25B6'}</span>
        <span>Séance</span>
      </NavLink>
      <NavLink to="/dashboard" className={linkClass}>
        <span className="text-lg">{'\u25C6'}</span>
        <span>Stats</span>
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <span className="text-lg">{'\u25CF'}</span>
        <span>Profil</span>
      </NavLink>
    </nav>
  )
}
