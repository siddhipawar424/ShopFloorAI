'use client'
import Sidebar from '@/components/playground/Sidebar/Sidebar'
import { ChatArea } from '@/components/playground/ChatArea'
import { Suspense } from 'react'
import AuthGuard from '@/components/AuthGuard'

export default function Home() {
  return (
    <AuthGuard allowedRoles={['user', 'admin']}>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="flex h-screen bg-background/80">
          <Sidebar />
          <ChatArea />
        </div>
      </Suspense>
    </AuthGuard>
  )
}
