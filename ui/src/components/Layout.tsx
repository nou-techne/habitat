/**
 * Main layout component with navigation and responsive design
 * 
 * Design rules:
 * - Lucide icons only (no emoji)
 * - Three-color system (green primary, blue infrastructure, burnt orange action)
 * - Mobile-first responsive design
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign, 
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { getCurrentUser, clearAuthToken } from '@/lib/auth'
import clsx from 'clsx'

interface LayoutProps {
  children: React.ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Contributions', href: '/contributions', icon: FileText },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Patronage', href: '/patronage', icon: DollarSign },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const user = getCurrentUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const handleLogout = () => {
    clearAuthToken()
    router.push('/login')
  }
  
  if (!user) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined' && router.pathname !== '/login') {
      router.push('/login')
    }
    return null
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and primary nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link 
                  href="/dashboard"
                  className="text-xl font-semibold text-primary-600"
                >
                  Habitat
                </Link>
              </div>
              
              {/* Desktop navigation */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = router.pathname.startsWith(item.href)
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                        isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
            
            {/* User menu */}
            <div className="flex items-center">
              <div className="hidden sm:flex sm:items-center sm:space-x-4">
                <span className="text-sm text-gray-700">
                  {user.ensName || user.id}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-action-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              
              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100"
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = router.pathname.startsWith(item.href)
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 text-base font-medium rounded-md',
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
              
              <div className="border-t border-gray-200 pt-3">
                <div className="px-3 py-2 text-sm text-gray-700">
                  {user.ensName || user.id}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-action-600 hover:bg-gray-50 rounded-md"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
