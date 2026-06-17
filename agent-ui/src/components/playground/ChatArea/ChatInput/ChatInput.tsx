'use client'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { usePlaygroundStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import { Mic, MicOff, Languages } from 'lucide-react'

const ChatInput = () => {
  const { chatInputRef } = usePlaygroundStore()

  const { handleStreamResponse } = useAIChatStreamHandler()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [inputMessage, setInputMessage] = useState('')
  const isStreaming = usePlaygroundStore((state) => state.isStreaming)
  const selectedEndpoint = usePlaygroundStore((state) => state.selectedEndpoint)
  
  // Multilingual Q&A Language Selection
  const selectedLanguage = usePlaygroundStore((state) => state.selectedLanguage)
  const setSelectedLanguage = usePlaygroundStore((state) => state.setSelectedLanguage)

  const cycleLanguage = () => {
    if (selectedLanguage === 'auto') {
      setSelectedLanguage('english')
      toast.info('Response Language: English')
    } else if (selectedLanguage === 'english') {
      setSelectedLanguage('hindi')
      toast.info('Response Language: Hindi (हिंदी)')
    } else {
      setSelectedLanguage('auto')
      toast.info('Response Language: Auto-Detect')
    }
  }

  // Voice recording states (Robust client-side capture + Gemini STT)
  const [isListening, setIsListening] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size === 0) return

        const formData = new FormData()
        formData.append('file', audioBlob, 'speech.webm')
        formData.append('language', selectedLanguage)

        const toastId = toast.loading('Transcribing your voice...')
        try {
          const response = await fetch(`${selectedEndpoint}/v1/playground/transcribe`, {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Failed to transcribe: ${response.statusText}`)
          }

          const data = await response.json()
          if (data.text) {
            setInputMessage((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + data.text)
            toast.success('Speech recognized!', { id: toastId })
          } else if (data.error) {
            toast.error(`Transcription failed: ${data.error}`, { id: toastId })
          } else {
            toast.dismiss(toastId)
            toast.error('Could not detect speech in audio.', { id: toastId })
          }
        } catch (error) {
          console.error(error)
          toast.error('Could not transcribe audio. Check server connection.', { id: toastId })
        }
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
      toast.error('Could not access microphone. Please check permissions.')
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    setIsListening(false)
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')
    if (isListening) stopListening()

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  const getPlaceholderText = () => {
    if (selectedLanguage === 'english') {
      return 'Ask questions in English...'
    } else if (selectedLanguage === 'hindi') {
      return 'सवाल हिंदी में पूछें...'
    }
    return 'Ask questions in Hindi or English...'
  }

  return (
    <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
      {/* Target Response Language Switcher Button */}
      <Button
        onClick={cycleLanguage}
        disabled={!(selectedAgent || teamId) || isStreaming}
        variant="outline"
        size="sm"
        className="rounded-xl flex items-center gap-x-1.5 px-3 py-5 text-xs font-semibold hover:bg-accent hover:text-accent-foreground border border-accent"
        title="Cycle Target Response Language"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>
          {selectedLanguage === 'auto' && '🌐 Auto'}
          {selectedLanguage === 'english' && '🇬🇧 EN'}
          {selectedLanguage === 'hindi' && '🇮🇳 HI'}
        </span>
      </Button>

      {/* Voice Dictation Microphone Button */}
      <Button
        onClick={toggleListening}
        disabled={!(selectedAgent || teamId) || isStreaming}
        size="icon"
        className={`rounded-xl p-5 border border-accent ${isListening ? 'bg-destructive text-destructive-foreground animate-pulse hover:bg-destructive/95' : 'bg-primaryAccent hover:bg-accent border border-accent text-primary'}`}
        title={isListening ? 'Stop Listening' : 'Voice Input'}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 text-destructive-foreground" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      <TextArea
        placeholder={getPlaceholderText()}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            !e.nativeEvent.isComposing &&
            !e.shiftKey &&
            !isStreaming
          ) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="w-full border border-accent bg-primaryAccent px-4 text-sm text-primary focus:border-accent"
        disabled={!(selectedAgent || teamId)}
        ref={chatInputRef}
      />
      
      <Button
        onClick={handleSubmit}
        disabled={
          !(selectedAgent || teamId) || !inputMessage.trim() || isStreaming
        }
        size="icon"
        className="rounded-xl bg-primary p-5 text-primaryAccent"
      >
        <Icon type="send" color="primaryAccent" />
      </Button>
    </div>
  )
}

export default ChatInput
