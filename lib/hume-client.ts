// lib/hume-client.ts
"use client"

import { useVoice, VoiceReadyState } from '@humeai/voice-react'
import { useEffect, useCallback } from 'react'

export interface HumeVoiceConfig {
  apiKey: string
  configId?: string
}

export function useHumeTeacher(studentContext?: string) {
  const { connect, disconnect, sendUserInput, messages, readyState } = useVoice()

  const startSession = useCallback(async (apiKey: string, configId?: string) => {
    try {
      await connect({
        apiKey,
        configId,
        context: studentContext ? {
          text: `Student context: ${studentContext}`
        } : undefined
      })
    } catch (error) {
      console.error('Failed to start Hume session:', error)
    }
  }, [connect, studentContext])

  const stopSession = useCallback(() => {
    disconnect()
  }, [disconnect])

  const speakToTeacher = useCallback((text: string) => {
    if (readyState === VoiceReadyState.OPEN) {
      sendUserInput(text)
    }
  }, [sendUserInput, readyState])

  return {
    startSession,
    stopSession,
    speakToTeacher,
    messages,
    isConnected: readyState === VoiceReadyState.OPEN,
    isConnecting: readyState === VoiceReadyState.CONNECTING
  }
}

// Hume API configuration
export const HUME_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_HUME_API_KEY || '',
  // Default teacher voice configuration ID from Hume platform
  teacherConfigId: process.env.NEXT_PUBLIC_HUME_TEACHER_CONFIG_ID || '',
}
