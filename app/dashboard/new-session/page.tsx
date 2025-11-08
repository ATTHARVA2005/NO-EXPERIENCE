"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getSupabaseClient } from '@/lib/supabase-client'
import { Upload, FileText, X } from 'lucide-react'

export default function NewSessionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [learningGoals, setLearningGoals] = useState('')
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'manual'>('file')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 10 * 1024 * 1024
      const allowed = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      
      if (file.size > maxSize) {
        toast({ title: 'File too large', description: 'Please upload a file smaller than 10MB', variant: 'destructive' })
        return
      }

      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
        toast({ title: 'Unsupported file type', description: 'Please upload PDF, DOC, DOCX or TXT files only.', variant: 'destructive' })
        return
      }

      setSyllabusFile(file)
      toast({ title: 'File uploaded!', description: `${file.name} ready for processing.` })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileUpload(fakeEvent)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const removeFile = () => {
    setSyllabusFile(null)
    toast({ title: 'File removed' })
  }

  const handleSubmit = async () => {
    let submissionData = { topic, gradeLevel, learningGoals }

    // Validation
    if (uploadMode === 'file' && !syllabusFile) {
      toast({ title: 'File required', description: 'Please upload a syllabus file', variant: 'destructive' })
      return
    }

    if (uploadMode === 'manual' && !topic.trim()) {
      toast({ title: 'Topic required', description: 'Please enter a topic', variant: 'destructive' })
      return
    }

    setIsProcessing(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({ title: 'Authentication required', description: 'Please log in to continue', variant: 'destructive' })
        router.push('/login')
        setIsProcessing(false)
        return
      }

      let syllabusContent = ''
      let filename = ''

      if (uploadMode === 'file' && syllabusFile) {
        syllabusContent = await syllabusFile.text()
        filename = syllabusFile.name
      }

      // Store in sessionStorage for curriculum generation
      if (syllabusContent) {
        sessionStorage.setItem('syllabusContent', syllabusContent)
        sessionStorage.setItem('syllabusFilename', filename)
      }

      // Session will be created by the curriculum generation API
      // This prevents duplicate sessions
      const queryParams = {
        topic: String(topic || 'Uploaded Content'),
        gradeLevel: String(gradeLevel || 'General'),
        learningGoals: String(learningGoals || ''),
      }

      sessionStorage.setItem('formData', JSON.stringify(queryParams))

      // Navigate to curriculum builder with query params
      const url = new URL('/dashboard/curriculum-builder', window.location.origin)
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      window.location.href = url.toString()
    } catch (error) {
      console.error('[new-session] Error:', error)
      toast({ title: 'Error', description: 'Failed to process your request. Please try again.', variant: 'destructive' })
      setIsProcessing(false)
    }
  }

  return (
    <div className='min-h-screen bg-white pt-24 pb-12'>
      <div className='max-w-4xl mx-auto px-6'>
        {/* Header */}
        <div className='mb-12'>
          <h1 className='text-5xl font-black text-black mb-4'>START YOUR</h1>
          <h1 className='text-5xl font-black text-orange-500 mb-6'>LEARNING SESSION</h1>
          <div className='h-1 w-32 bg-orange-500' />
        </div>

        <div className='space-y-12'>
          {/* Mode Selector */}
          <div className='flex gap-4 border-b-4 border-black pb-8'>
            <button
              onClick={() => setUploadMode('file')}
              className={`px-6 py-3 font-black text-lg border-4 transition ${
                uploadMode === 'file'
                  ? 'bg-orange-500 text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              UPLOAD SYLLABUS
            </button>
            <button
              onClick={() => setUploadMode('manual')}
              className={`px-6 py-3 font-black text-lg border-4 transition ${
                uploadMode === 'manual'
                  ? 'bg-blue-500 text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              MANUAL ENTRY
            </button>
          </div>

          {/* File Upload Mode */}
          {uploadMode === 'file' && (
            <div className='relative'>
              <div className='absolute -right-4 -bottom-4 w-full h-full border-4 border-black' />
              <div className='relative bg-white border-4 border-black p-12'>
                <div className='text-sm font-black text-black uppercase mb-6 tracking-wide'>📄 OPTION 1: UPLOAD SYLLABUS</div>
                
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className='border-4 border-dashed border-black p-12 text-center cursor-pointer hover:bg-orange-50 transition bg-white'
                >
                  {!syllabusFile ? (
                    <div>
                      <div className='w-20 h-20 bg-orange-500 border-3 border-black flex items-center justify-center mx-auto mb-6'>
                        <Upload className='w-10 h-10 text-white' />
                      </div>
                      <input
                        id='syllabus'
                        type='file'
                        accept='.txt,.pdf,.doc,.docx'
                        onChange={handleFileUpload}
                        className='hidden'
                      />
                      <label htmlFor='syllabus' className='block text-xl font-black text-orange-500 mb-3 cursor-pointer hover:underline'>
                        CLICK TO UPLOAD
                      </label>
                      <p className='text-sm text-black/60 mb-2'>or drag and drop your file here</p>
                      <p className='text-xs font-semibold text-black/50'>PDF, DOC, DOCX, TXT (up to 10MB)</p>
                    </div>
                  ) : (
                    <div>
                      <div className='flex items-center justify-center gap-4 mb-6'>
                        <div className='w-16 h-16 bg-green-500 border-3 border-black flex items-center justify-center'>
                          <FileText className='w-8 h-8 text-white' />
                        </div>
                        <div className='text-left'>
                          <p className='text-lg font-black text-black'>{syllabusFile.name}</p>
                          <p className='text-sm text-black/60'>Ready to process</p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className='bg-red-600 text-white font-black border-2 border-black px-4 py-2 hover:bg-red-700 transition'
                      >
                        REMOVE FILE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Mode */}
          {uploadMode === 'manual' && (
            <div className='relative'>
              <div className='absolute -right-4 -bottom-4 w-full h-full border-4 border-black' />
              <div className='relative bg-white border-4 border-black p-8'>
                <div className='text-sm font-black text-black uppercase mb-8 tracking-wide'>✍️ OPTION 2: MANUAL ENTRY</div>
                
                <div className='space-y-6'>
                  <div>
                    <label htmlFor='topic' className='block text-sm font-black text-black mb-3 uppercase'>Subject *</label>
                    <input
                      id='topic'
                      type='text'
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder='e.g., Physics, Mathematics, Chemistry'
                      className='w-full border-3 border-black bg-white text-black px-4 py-3 font-bold focus:outline-none focus:ring-3 focus:ring-orange-300'
                    />
                  </div>

                  <div>
                    <label htmlFor='gradeLevel' className='block text-sm font-black text-black mb-3 uppercase'>Grade/Level</label>
                    <select
                      id='gradeLevel'
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className='w-full border-3 border-black bg-white text-black px-4 py-3 font-bold focus:outline-none focus:ring-3 focus:ring-orange-300'
                    >
                      <option value=''>Select your grade</option>
                      <option value='Grade 6'>Grade 6</option>
                      <option value='Grade 7'>Grade 7</option>
                      <option value='Grade 8'>Grade 8</option>
                      <option value='Grade 9'>Grade 9</option>
                      <option value='Grade 10'>Grade 10</option>
                      <option value='High School'>High School</option>
                      <option value='College'>College</option>
                      <option value='University'>University</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor='specific' className='block text-sm font-black text-black mb-3 uppercase'>Specific Topic (Optional)</label>
                    <input
                      id='specific'
                      type='text'
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                      placeholder="e.g., Newton's Laws, Quadratic Equations"
                      className='w-full border-3 border-black bg-white text-black px-4 py-3 font-bold focus:outline-none focus:ring-3 focus:ring-orange-300'
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className='relative'>
            <div className='absolute -right-3 -bottom-3 w-full h-full border-4 border-black' />
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className='relative w-full bg-orange-500 text-white border-4 border-black py-6 font-black text-xl uppercase hover:bg-orange-600 disabled:bg-gray-400 disabled:border-gray-600 disabled:cursor-not-allowed transition flex items-center justify-center gap-3'
            >
              <span>{isProcessing ? '⏳' : '✦'}</span>
              {isProcessing ? 'GENERATING CURRICULUM...' : 'GENERATE CURRICULUM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
