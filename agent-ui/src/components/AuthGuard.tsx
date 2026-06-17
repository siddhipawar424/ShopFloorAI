'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, isAuthenticated } = useAuthStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    if (!isAuthenticated || !token) {
      if (pathname !== '/login' && pathname !== '/register') {
        router.replace('/login')
      }
    } else if (user) {
      // If user is trying to access standard pages and they are admin,
      // let them, but standard users trying to access admin pages must be blocked.
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'admin') {
          router.replace('/admin')
        } else {
          router.replace('/')
        }
      }
    }
  }, [isMounted, isAuthenticated, token, user, pathname, router, allowedRoles])

  // While mounting (waiting for local storage hydration), show premium load screen
  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background/95">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-10 w-10 animate-ping rounded-full bg-blue-500/20" />
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground animate-pulse">
            Authenticating Session...
          </div>
        </div>
      </div>
    )
  }

  // Allow login and register public routes to pass immediately
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>
  }

  // Unauthenticated users block and loading
  if (!isAuthenticated || !token) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background/95">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            Redirecting to Portal...
          </div>
        </div>
      </div>
    )
  }

  // Denied access check
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background/95 font-dmmono">
        <div className="flex flex-col items-center gap-2 border border-destructive/20 bg-destructive/5 p-6 rounded-2xl max-w-sm text-center">
          <div className="text-destructive font-bold text-sm tracking-wider uppercase">
            403 - Unauthorized Access
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Your account ({user.email}) does not have administrative privileges required for this module.
          </div>
          <button
            onClick={() => router.replace('/')}
            className="mt-4 px-4 py-2 bg-primary text-background rounded-xl text-xs uppercase font-medium hover:bg-primary/80 transition-all"
          >
            Return to Playground
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
