import Icon from '@/components/ui/icon'
import MarkdownRenderer from '@/components/ui/typography/MarkdownRenderer'
import { usePlaygroundStore } from '@/store'
import type { PlaygroundChatMessage } from '@/types/playground'
import Videos from './Multimedia/Videos'
import Images from './Multimedia/Images'
import Audios from './Multimedia/Audios'
import { memo, useState, useEffect } from 'react'
import AgentThinkingLoader from './AgentThinkingLoader'
import { Volume2, VolumeX } from 'lucide-react'

interface MessageProps {
  message: PlaygroundChatMessage
}

const cleanMarkdownForSpeech = (text: string) => {
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')   // remove inline code
    .replace(/[#*_\-\[\]()]/g, ' ') // remove formatting marks
    .replace(/\s+/g, ' ')          // collapse spaces
    .trim()
}

const AgentMessage = ({ message }: MessageProps) => {
  const { streamingErrorMessage } = usePlaygroundStore()
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Ensure voices are loaded in background
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.getVoices()
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const toggleSpeech = () => {
    if (typeof window === 'undefined') return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const cleanText = cleanMarkdownForSpeech(message.content || '')
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)

    // Detect Devanagari script (Hindi characters)
    const hasHindi = /[\u0900-\u097F]/.test(cleanText)
    const voices = window.speechSynthesis.getVoices()
    let voice = null

    if (hasHindi) {
      voice = voices.find((v) => v.lang.startsWith('hi-'))
      utterance.lang = 'hi-IN'
    } else {
      voice = voices.find((v) => v.lang.startsWith('en-'))
      utterance.lang = 'en-US'
    }

    if (voice) {
      utterance.voice = voice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.cancel() // Stop any ongoing speech
    window.speechSynthesis.speak(utterance)
  }

  let messageContent
  if (message.streamingError) {
    messageContent = (
      <p className="text-destructive">
        Oops! Something went wrong while streaming.{' '}
        {streamingErrorMessage ? (
          <>{streamingErrorMessage}</>
        ) : (
          'Please try refreshing the page or try again later.'
        )}
      </p>
    )
  } else if (message.content) {
    messageContent = (
      <div className="flex w-full flex-col gap-4">
        <MarkdownRenderer>{message.content}</MarkdownRenderer>
        {message.videos && message.videos.length > 0 && (
          <Videos videos={message.videos} />
        )}
        {message.images && message.images.length > 0 && (
          <Images images={message.images} />
        )}
        {message.audio && message.audio.length > 0 && (
          <Audios audio={message.audio} />
        )}
      </div>
    )
  } else if (message.response_audio) {
    if (!message.response_audio.transcript) {
      messageContent = (
        <div className="mt-2 flex items-start">
          <AgentThinkingLoader />
        </div>
      )
    } else {
      messageContent = (
        <div className="flex w-full flex-col gap-4">
          <MarkdownRenderer>
            {message.response_audio.transcript}
          </MarkdownRenderer>
          {message.response_audio.content && message.response_audio && (
            <Audios audio={[message.response_audio]} />
          )}
        </div>
      )
    }
  } else {
    messageContent = (
      <div className="mt-2">
        <AgentThinkingLoader />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-start gap-4 font-geist relative group">
      <div className="flex flex-col items-center gap-y-2 flex-shrink-0">
        <Icon type="agent" size="sm" />
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {messageContent}
        {message.content && !message.streamingError && (
          <div className="flex items-center gap-2 mt-1 select-none">
            <button
              onClick={toggleSpeech}
              className={`p-1.5 rounded-lg border transition-all hover:bg-accent flex items-center gap-1.5 cursor-pointer ${
                isSpeaking
                  ? 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse font-semibold'
                  : 'bg-[#27272a]/10 hover:bg-[#27272a]/30 text-muted-foreground hover:text-white border-primary/10'
              }`}
              style={{ fontSize: '10px' }}
              title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="font-mono tracking-wider">STOP LISTENING</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="font-mono tracking-wider">LISTEN ANSWER</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const UserMessage = memo(({ message }: MessageProps) => {
  return (
    <div className="flex items-start pt-4 text-start max-md:break-words">
      <div className="flex flex-row gap-x-3">
        <p className="flex items-center gap-x-2 text-sm font-medium text-muted">
          <Icon type="user" size="sm" />
        </p>
        <div className="text-md rounded-lg py-1 font-geist text-secondary">
          {message.content}
        </div>
      </div>
    </div>
  )
})

AgentMessage.displayName = 'AgentMessage'
UserMessage.displayName = 'UserMessage'
export { AgentMessage, UserMessage }
