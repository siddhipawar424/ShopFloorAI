'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Lock, Mail, User, Eye, EyeOff, UserCheck, ShieldAlert, ArrowLeft, Sun, Moon } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setThemeMode(savedTheme as 'dark' | 'light')
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const handleToggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Registration failed')
        setIsLoading(false)
        return
      }

      toast.success('Registration successful! Please login.')
      router.push('/login')
    } catch (err) {
      console.error(err)
      toast.error('Authentication server is offline.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 font-dmmono overflow-hidden">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleToggleTheme}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/10 hover:border-primary/20 bg-background-secondary/40 text-[10px] text-muted hover:text-primary transition-all duration-200 cursor-pointer shadow-sm"
        >
          {themeMode === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-blue-400" />
              <span>LIGHT</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-500" />
              <span>DARK</span>
            </>
          )}
        </button>
      </div>

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Link
            href="/login"
            className="group flex items-center gap-1.5 self-start text-[10px] text-muted uppercase tracking-widest hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" /> Back to Access
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-widest text-primary mt-4">
            Request Registry
          </h1>
          <p className="text-xs text-muted uppercase tracking-wider">
            Create System Credentials
          </p>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-background-secondary/30 backdrop-blur-md p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Operator Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Eesha Kale"
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-primary/15 bg-background text-xs text-secondary placeholder:text-muted focus:border-blue-500/50 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Security Identifier (Email)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@factory.com"
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-primary/15 bg-background text-xs text-secondary placeholder:text-muted focus:border-blue-500/50 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Access Signature (Password)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-xl border border-primary/15 bg-background text-xs text-secondary placeholder:text-muted focus:border-blue-500/50 focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Visual Role Selection Cards */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Assigned Authority Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    role === 'user'
                      ? 'border-blue-500/40 bg-blue-500/5 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                      : 'border-primary/10 bg-background-secondary/40 text-muted hover:border-primary/20 hover:text-primary'
                  }`}
                >
                  <UserCheck className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    role === 'admin'
                      ? 'border-blue-500/40 bg-blue-500/5 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                      : 'border-primary/10 bg-background-secondary/40 text-muted hover:border-primary/20 hover:text-primary'
                  }`}
                >
                  <ShieldAlert className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Admin</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-500 focus:outline-none transition-all disabled:opacity-50 duration-200 mt-4 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)]"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="text-xs uppercase tracking-widest">
                  Create Account
                </span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted uppercase tracking-widest">
            Already registered?{' '}
            <Link
              href="/login"
              className="text-blue-500 hover:text-blue-400 hover:underline font-bold transition-all ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
