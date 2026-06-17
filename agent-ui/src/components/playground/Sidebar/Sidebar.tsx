'use client'
import { Button } from '@/components/ui/button'
import { ModeSelector } from '@/components/playground/Sidebar/ModeSelector'
import { EntitySelector } from '@/components/playground/Sidebar/EntitySelector'
import useChatActions from '@/hooks/useChatActions'
import { usePlaygroundStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import Icon from '@/components/ui/icon'
import { getProviderIcon } from '@/lib/modelProvider'
import Sessions from './Sessions'
import { isValidUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryState } from 'nuqs'
import { truncateText } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Sun, Moon, Shield, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/authStore'

const ENDPOINT_PLACEHOLDER = 'NO ENDPOINT ADDED'
const SidebarHeader = () => (
  <div className="flex items-center gap-2">
    <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400">
      <Icon type="agno" size="xxs" className="text-blue-500 dark:text-blue-400" />
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase text-primary">
        Factory Agent OS
      </span>
      <span className="text-[10px] uppercase text-muted">Industrial AI Hub</span>
    </div>
  </div>
)

const NewChatButton = ({
  disabled,
  onClick
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    className="h-9 w-full rounded-xl bg-primary text-xs font-medium text-background hover:bg-primary/80"
  >
    <Icon type="plus-icon" size="xs" className="text-background" />
    <span className="uppercase">New Chat</span>
  </Button>
)

const ModelDisplay = ({ model }: { model: string }) => (
  <div className="flex h-9 w-full items-center gap-3 rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium uppercase text-muted">
    {(() => {
      const icon = getProviderIcon(model)
      return icon ? <Icon type={icon} className="shrink-0" size="xs" /> : null
    })()}
    {model}
  </div>
)

const Endpoint = () => {
  const {
    selectedEndpoint,
    isEndpointActive,
    setSelectedEndpoint,
    setAgents,
    setSessionsData,
    setMessages
  } = usePlaygroundStore()
  const { initializePlayground } = useChatActions()
  const [isEditing, setIsEditing] = useState(false)
  const [endpointValue, setEndpointValue] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [, setAgentId] = useQueryState('agent')
  const [, setSessionId] = useQueryState('session')

  useEffect(() => {
    setEndpointValue(selectedEndpoint)
    setIsMounted(true)
  }, [selectedEndpoint])

  const getStatusColor = (isActive: boolean) =>
    isActive ? 'bg-positive' : 'bg-destructive'

  const handleSave = async () => {
    if (!isValidUrl(endpointValue)) {
      toast.error('Please enter a valid URL')
      return
    }
    const cleanEndpoint = endpointValue.replace(/\/$/, '').trim()
    setSelectedEndpoint(cleanEndpoint)
    setAgentId(null)
    setSessionId(null)
    setIsEditing(false)
    setIsHovering(false)
    setAgents([])
    setSessionsData([])
    setMessages([])
  }

  const handleCancel = () => {
    setEndpointValue(selectedEndpoint)
    setIsEditing(false)
    setIsHovering(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleRefresh = async () => {
    setIsRotating(true)
    await initializePlayground()
    setTimeout(() => setIsRotating(false), 500)
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="text-xs font-medium uppercase text-primary">Backend</div>
      {isEditing ? (
        <div className="flex w-full items-center gap-1">
          <input
            type="text"
            value={endpointValue}
            onChange={(e) => setEndpointValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex h-9 w-full items-center text-ellipsis rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium text-muted"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <Icon type="save" size="xs" />
          </Button>
        </div>
      ) : (
        <div className="flex w-full items-center gap-1">
          <motion.div
            className="relative flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border border-primary/15 bg-accent p-3 uppercase"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => setIsEditing(true)}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <AnimatePresence mode="wait">
              {isHovering ? (
                <motion.div
                  key="endpoint-display-hover"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-primary">
                    <Icon type="edit" size="xxs" /> EDIT ENDPOINT
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="endpoint-display"
                  className="absolute inset-0 flex items-center justify-between px-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs font-medium text-muted">
                    {isMounted
                      ? truncateText(selectedEndpoint, 21) ||
                        ENDPOINT_PLACEHOLDER
                      : 'http://localhost:7777'}
                  </p>
                  <div
                    className={`size-2 shrink-0 rounded-full ${getStatusColor(isEndpointActive)}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <motion.div
              key={isRotating ? 'rotating' : 'idle'}
              animate={{ rotate: isRotating ? 360 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <Icon type="refresh" size="xs" />
            </motion.div>
          </Button>
        </div>
      )}
    </div>
  )
}

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { clearChat, focusChatInput, initializePlayground } = useChatActions()
  const {
    messages,
    selectedEndpoint,
    isEndpointActive,
    selectedModel,
    hydrated,
    isEndpointLoading,
    teams
  } = usePlaygroundStore()
  const [isMounted, setIsMounted] = useState(false)
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')

  const router = useRouter()
  const { user, token, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (err) {
      console.error('Logout error:', err)
    }
    // Reset Playground Store memory states to prevent data leakage between users
    usePlaygroundStore.setState({
      messages: [],
      sessionsData: null,
      selectedTeamId: null,
      streamingErrorMessage: '',
      isStreaming: false,
      isSessionsLoading: false,
      agents: [],
      teams: [],
      selectedModel: ''
    })
    clearAuth()
    toast.success('Logged out successfully')
    router.replace('/login')
  }

  useEffect(() => {
    setIsMounted(true)
    if (hydrated) initializePlayground()

    const savedTheme = localStorage.getItem('theme') || 'dark'
    setThemeMode(savedTheme as 'dark' | 'light')
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [selectedEndpoint, initializePlayground, hydrated])

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

  const handleNewChat = () => {
    clearChat()
    focusChatInput()
  }

  return (
    <motion.aside
      className="relative flex h-screen shrink-0 grow-0 flex-col overflow-hidden px-2 py-3 font-dmmono border-r border-primary/10 bg-background/50 backdrop-blur-sm"
      initial={{ width: '16rem' }}
      animate={{ width: isCollapsed ? '2.5rem' : '16rem' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-2 top-2 z-10 p-1 text-muted hover:text-primary transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
        whileTap={{ scale: 0.95 }}
      >
        <Icon
          type="sheet"
          size="xs"
          className={`transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
        />
      </motion.button>
      
      <div className="flex flex-col h-full justify-between">
        <motion.div
          className="w-60 flex-1 space-y-5 overflow-y-auto pr-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -20 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            pointerEvents: isCollapsed ? 'none' : 'auto'
          }}
        >
          <SidebarHeader />
          <NewChatButton
            disabled={messages.length === 0}
            onClick={handleNewChat}
          />
          {isMounted && (
            <>
              <Endpoint />
              {isEndpointActive && (
                <>
                  <motion.div
                    className="flex w-full flex-col items-start gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    <div className="text-xs font-medium uppercase text-primary">
                      Agent
                    </div>
                    {isEndpointLoading ? (
                      <div className="flex w-full flex-col gap-2">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <Skeleton
                            key={index}
                            className="h-9 w-full rounded-xl"
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        {teams.length > 0 && <ModeSelector />}
                        <EntitySelector />
                        {selectedModel && (agentId || teamId) && (
                          <ModelDisplay model={selectedModel} />
                        )}
                      </>
                    )}
                  </motion.div>
                  <Sessions />
                </>
              )}
            </>
          )}
        </motion.div>

        {/* Footer User Profile & Theme Toggler */}
        {!isCollapsed && user && (
          <motion.div 
            className="w-60 pt-4 border-t border-primary/10 mt-auto space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* User Details */}
            <div className="flex items-center justify-between bg-accent/25 border border-primary/10 p-2.5 rounded-xl">
              <div className="flex flex-col overflow-hidden max-w-[130px]">
                <span className="text-xs font-bold text-white truncate uppercase">{user.name}</span>
                <span className="text-[9px] text-muted-foreground truncate uppercase">{user.role} Operator</span>
              </div>
              {user.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center justify-center p-1.5 rounded-lg border border-blue-500/20 hover:border-blue-500/45 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 hover:text-blue-300 transition-all"
                  title="Open Control Tower Dashboard"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between gap-2">
              {/* Theme Toggle */}
              <button
                onClick={handleToggleTheme}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-primary/15 hover:border-primary/25 bg-[#27272a]/20 hover:bg-[#27272a]/45 text-[10px] text-muted-foreground hover:text-white transition-all duration-200"
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

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-destructive/20 hover:border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-[10px] text-destructive hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>LOGOUT</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  )
}

export default Sidebar
