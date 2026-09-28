import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoutConfirmModal from './LogoutConfirmModal'
import {
  Activity, LayoutDashboard, Upload, History, BarChart2,
  User, LogOut, Menu, X, Scan
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/screening',  icon: Upload,           label: 'New Scan' },
  { to: '/history',    icon: History,          label: 'History' },
  { to: '/analytics',  icon: BarChart2,        label: 'Analytics' },
  { to: '/profile',    icon: User,             label: 'Profile' },
]

function NavLink({ item, onClick }) {
  const location = useLocation()
  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    logout()
    navigate('/login')
    setMobileOpen(false)
    setShowLogoutModal(false)
  }

  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Logout confirmation modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E2ECEB] min-h-screen fixed left-0 top-0 z-30">
        
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E2ECEB]">
          <div className="flex items-center justify-center w-9 h-9 bg-[#0F9D92] rounded-xl text-white shadow-xs">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-[#102A43] text-lg leading-none">DermaScan</span>
            <span className="block text-xs text-[#0F9D92] font-semibold mt-0.5">AI Clinical</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#E2ECEB]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F4FAF9] border border-[#E2ECEB] flex items-center justify-center">
              <span className="text-sm font-semibold text-[#0F9D92]">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#102A43] truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[#627D98] truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-link w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile header ───────────────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E2ECEB] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-[#0F9D92] rounded-xl text-white">
            <Scan className="h-4 w-4" />
          </div>
          <span className="font-bold text-[#102A43]">DermaScan AI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-[#334E68] hover:bg-[#F4FAF9] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-[#102A43]/40 backdrop-blur-sm"
            onClick={closeMobile}
          />
          
          <div className="md:hidden fixed top-14 left-0 right-0 z-50 bg-white border-b border-[#E2ECEB] shadow-xl">
            <nav className="px-3 py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.to} item={item} onClick={closeMobile} />
              ))}
            </nav>
            <div className="px-3 py-3 border-t border-[#E2ECEB]">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#F4FAF9] border border-[#E2ECEB] flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#0F9D92]">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#102A43]">{user?.name || 'User'}</p>
                  <p className="text-xs text-[#627D98]">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="nav-link w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
