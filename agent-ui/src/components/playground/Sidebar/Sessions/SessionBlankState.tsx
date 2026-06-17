import React from 'react'
import { usePlaygroundStore } from '@/store'
import { useQueryState } from 'nuqs'

const HistoryBlankStateIcon = () => (
  <svg
    width="90"
    height="89"
    viewBox="0 0 90 89"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M60.0192 18.2484L75.7339 21.2565C80.9549 22.2558 84.3771 27.2984 83.3777 32.5194L80.3697 48.2341C79.3703 53.455 74.3277 56.8773 69.1067 55.8779L53.3921 52.8698C48.1711 51.8704 44.7489 46.8278 45.7482 41.6069L48.7563 25.8922C49.7557 20.6712 54.7983 17.249 60.0192 18.2484Z"
      stroke="white"
      strokeOpacity="0.15"
      strokeWidth="0.75"
    />
    <path
      d="M52.6787 34.7885C53.9351 28.225 60.2744 23.9228 66.8378 25.1792V25.1792C73.4013 26.4355 77.7036 32.7748 76.4472 39.3383V39.3383C75.1908 45.9017 68.8516 50.204 62.2881 48.9476V48.9476C55.7246 47.6913 51.4224 41.352 52.6787 34.7885V34.7885Z"
      fill="#3B82F6"
    />
    <path
      d="M4.32008 49.0567C3.54981 43.797 7.18916 38.9088 12.4488 38.1386L28.2799 35.8201C33.5396 35.0498 38.4278 38.6892 39.198 43.9488L41.5165 59.7799C42.2868 65.0396 38.6474 69.9278 33.3878 70.698L17.5567 73.0165C12.297 73.7868 7.40882 70.1474 6.63855 64.8878L4.32008 49.0567Z"
      stroke="white"
      strokeOpacity="0.15"
      strokeWidth="0.75"
    />
    <path
      d="M11.0451 56.1568C10.085 49.5994 14.6225 43.5051 21.18 42.545C27.7375 41.5848 33.8318 46.1224 34.7919 52.6799C35.7521 59.2374 31.2145 65.3316 24.657 66.2918C18.0995 67.2519 12.0053 62.7143 11.0451 56.1568Z"
      fill="white"
    />
  </svg>
)

const SessionBlankState = () => {
  const { selectedEndpoint, isEndpointActive } = usePlaygroundStore()
  const [agentId] = useQueryState('agent')

  const errorMessage = (() => {
    switch (true) {
      case !isEndpointActive:
        return 'Backend is not connected. Start the playground server on port 7777.'
      case !selectedEndpoint:
        return 'Configure the backend endpoint to load chat history.'
      case !agentId:
        return 'Select an agent to view saved sessions.'
      default:
        return 'No sessions yet. Start a conversation to create one.'
    }
  })()

  return (
    <div className="mt-1 flex items-center justify-center rounded-lg bg-background-secondary/50 pb-6 pt-4">
      <div className="flex flex-col items-center gap-1">
        <HistoryBlankStateIcon />
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-sm font-medium text-primary">No sessions</h3>
          <p className="max-w-[210px] text-center text-sm text-muted">
            {errorMessage}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SessionBlankState
