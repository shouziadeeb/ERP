/**
 * Authenticated layout: collapsible sidebar, global search, nav badges, logout confirm modal.
 */
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { LogoutConfirmModal } from '../components/ui/LogoutConfirmModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getNavStats } from '../services/navService'
import { globalSearch, type SearchHit } from '../services/searchService'
import { getSettings, SETTINGS_UPDATED_EVENT, type AppSettings } from '../services/settingsService'

const SIDEBAR_EXPANDED = '16rem'
const SIDEBAR_COLLAPSED = '3.25rem'
const STORAGE_KEY = 'apex-sidebar-collapsed'

interface AppShellProps {
  children: ReactNode
  onLogout: () => void
}

export function AppShell({ children, onLogout }: AppShellProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingLeaves, setPendingLeaves] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [searchHits, setSearchHits] = useState<SearchHit[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const navItems = [
    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/products', icon: 'inventory_2', label: 'Products' },
    { to: '/inventory', icon: 'warehouse', label: 'Inventory' },
    { to: '/orders', icon: 'local_shipping', label: 'Orders', badge: pendingOrders > 0 ? String(pendingOrders) : undefined },
    { to: '/customers', icon: 'storefront', label: 'Customers' },
    { to: '/invoices', icon: 'receipt_long', label: 'Invoices' },
    { to: '/purchase-orders', icon: 'shopping_cart', label: 'Purchase Orders' },
    { to: '/suppliers', icon: 'handshake', label: 'Suppliers' },
    { to: '/employees', icon: 'group', label: 'Employees' },
    { to: '/reports', icon: 'monitoring', label: 'Reports' },
    { to: '/settings', icon: 'tune', label: 'Settings' },
  ]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    function loadShellSettings() {
      void getSettings().then(setSettings)
    }
    loadShellSettings()
    void getNavStats().then((s) => {
      setPendingOrders(s.pendingOrders)
      setPendingLeaves(s.pendingLeaves)
    })
    window.addEventListener(SETTINGS_UPDATED_EVENT, loadShellSettings)
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, loadShellSettings)
  }, [])

  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSearchHits([])
      return
    }
    void globalSearch(debouncedSearch.trim()).then((result) => {
      setSearchHits([
        ...result.products,
        ...result.customers,
        ...result.orders,
        ...result.employees,
      ])
    })
  }, [debouncedSearch])

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
  const companyName = settings?.companyName ?? 'Global Supply Ltd'
  const siteName = settings?.siteName ?? 'HQ Operations'
  const userName = settings?.sessionUserName ?? 'Alex Mercer'
  const userRole = settings?.sessionUserRole ?? 'Lead Controller'

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <aside
        style={{ width: sidebarWidth }}
        className="fixed left-0 top-0 h-screen bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none transition-[width] duration-300 ease-in-out overflow-hidden"
      >
        <div className="flex flex-col min-w-0">
          <div className={`h-14 flex items-center bg-surface-container-low ${collapsed ? 'justify-center px-1' : 'px-3'}`}>
            <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-2 flex-1'}`}>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shrink-0">
                <Icon name="corporate_fare" className="text-[18px]" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-on-surface leading-tight truncate">ApexERP</span>
                  <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold truncate">Enterprise Suite</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container-lowest shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <Icon name="chevron_left" className="text-[20px]" />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="px-1 pb-1">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-full h-9 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container-low"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <Icon name="chevron_right" className="text-[20px]" />
              </button>
            </div>
          )}

          <div className={`py-2 ${collapsed ? 'px-1' : 'px-3'}`}>
            <button
              type="button"
              title="Global Supply Ltd — HQ Operations"
              className={`flex items-center rounded-lg bg-surface-container-low text-on-surface-variant ${
                collapsed ? 'w-full h-9 justify-center' : 'w-full justify-between px-2 py-1'
              }`}
            >
              <div className={`flex items-center ${collapsed ? '' : 'gap-2 overflow-hidden'}`}>
                <Icon name="business_center" className="text-secondary text-[16px] shrink-0" />
                {!collapsed && (
                  <div className="text-left truncate">
                  <span className="block text-xs font-medium text-on-surface truncate">{companyName}</span>
                  <span className="block text-[11px] text-secondary">{siteName}</span>
                  </div>
                )}
              </div>
              {!collapsed && <Icon name="unfold_more" className="text-secondary text-[16px] shrink-0" />}
            </button>
          </div>

          {!collapsed && (
            <div className="px-3 py-1">
              <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold px-2">Core Modules</span>
            </div>
          )}

          <nav className={`flex flex-col gap-0.5 ${collapsed ? 'px-1' : 'px-2'}`}>
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </nav>
        </div>

        <div className={`flex flex-col gap-1 ${collapsed ? 'p-1' : 'p-2'}`}>
          <div
            className={`flex items-center bg-surface-container-low rounded-lg ${
              collapsed ? 'justify-center py-2' : 'justify-between px-2 py-2'
            }`}
            title={collapsed ? 'Online · Sync 2m ago' : undefined}
          >
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse shrink-0" />
              {!collapsed && <span className="text-[11px] font-semibold text-on-surface">Online</span>}
            </div>
            {!collapsed && <span className="text-[11px] text-secondary">Sync: 2m ago</span>}
          </div>

          <div className={`flex items-center ${collapsed ? 'flex-col gap-2 py-1' : 'justify-between pt-1 px-0.5'}`}>
            <div className={`flex items-center ${collapsed ? '' : 'gap-2 overflow-hidden'}`} title={`${userName} · ${userRole}`}>
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Icon name="person" className="text-on-primary text-[16px]" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <span className="block text-xs font-semibold truncate">{userName}</span>
                  <span className="block text-[11px] text-secondary truncate">{userRole}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className={`font-semibold text-primary hover:underline ${collapsed ? 'w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center hover:no-underline' : 'text-[11px] px-1'}`}
              title="Sign out"
            >
              {collapsed ? <Icon name="logout" className="text-[18px]" /> : 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      <div className="transition-[padding] duration-300 ease-in-out" style={{ paddingLeft: sidebarWidth }}>
        <header
          style={{ left: sidebarWidth }}
          className="fixed top-0 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 transition-[left] duration-300 ease-in-out"
        >
          <div className="h-14 w-full px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-secondary overflow-hidden text-sm">
              <Icon name="home" className="text-[16px]" />
              <span>Enterprise</span>
              <Icon name="chevron_right" className="text-[14px]" />
              <span className="text-on-surface font-semibold">Operations</span>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Icon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
                <input
                  className="w-full h-8 pl-9 pr-3 rounded-lg bg-surface-container-low text-sm placeholder:text-secondary focus:outline-none focus:bg-surface-container"
                  placeholder="Search products, customers, orders..."
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                />
                {searchOpen && searchHits.length > 0 && (
                  <ul className="absolute top-9 left-0 right-0 rounded-lg bg-surface-container-lowest shadow-lg border border-surface-container-low z-50 max-h-64 overflow-y-auto text-sm">
                    {searchHits.map((hit) => (
                      <li key={`${hit.type}-${hit.id}`}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-surface-container-low"
                          onMouseDown={() => { navigate(hit.href); setSearch(''); setSearchOpen(false) }}
                        >
                          <div className="font-medium">{hit.label}</div>
                          <div className="text-xs text-secondary">{hit.type} · {hit.sub}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="h-8 px-2 rounded-lg flex items-center gap-1 text-secondary hover:bg-surface-container-low text-xs font-semibold" onClick={() => navigate('/orders')}>
                <Icon name="add" className="text-[18px]" /> New Order
              </button>
              <button type="button" className="relative w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container-low" aria-label="Pending approvals" onClick={() => navigate('/dashboard')}>
                <Icon name="notifications" className="text-[18px]" />
                {pendingLeaves > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center ring-2 ring-surface-container-lowest">
                    {pendingLeaves > 9 ? '9+' : pendingLeaves}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {settings?.maintenanceMode && (
          <div className="mx-6 mt-3 rounded-lg border border-error/25 bg-error-container/30 px-4 py-2 text-sm text-error font-medium flex items-center gap-2">
            <Icon name="construction" className="text-[18px]" />
            Maintenance mode is enabled in Settings.
          </div>
        )}

        <main className="w-full pt-14 bg-background min-h-screen">{children}</main>
      </div>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false)
          onLogout()
        }}
      />
    </div>
  )
}

function NavItem({
  to,
  icon,
  label,
  badge,
  collapsed,
}: {
  to: string
  icon: string
  label: string
  badge?: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-lg text-sm transition-colors relative ${
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-2 py-2'
        } ${
          isActive
            ? 'bg-secondary-container text-primary font-semibold after:absolute after:left-0 after:top-1.5 after:bottom-1.5 after:w-1 after:bg-primary after:rounded-r'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
        }`
      }
    >
      <span className="relative shrink-0">
        <Icon name={icon} className="text-[18px]" />
        {collapsed && badge && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center leading-none">
            {badge.length > 2 ? '…' : badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-surface-container-highest font-semibold shrink-0">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}
