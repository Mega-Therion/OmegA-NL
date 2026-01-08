'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ErrorBoundary } from 'react-error-boundary'
import { useHotkeys } from 'react-hotkeys-hook'
import { knowledgeBase } from '@/data/knowledge'
import { retrieveContext } from '@/utils/rag'
import { useNeuroStore } from '@/store/useNeuroStore'

const qualityConfig = {
  ultra: { glow: 'shadow-glow', density: 'bg-cyan-400/20' },
  balanced: { glow: 'shadow-lg', density: 'bg-cyan-400/10' },
  lite: { glow: 'shadow-md', density: 'bg-cyan-400/5' }
}

const generateAssistantReply = (prompt: string, ragSnippets: string[]) => {
  const trimmed = prompt.slice(0, 140)
  const grounded = ragSnippets.length
    ? `Grounded context: ${ragSnippets.join(' | ')}`
    : 'No external context surfaced; responding from core heuristics.'
  return `Acknowledged. Optimizing response for: "${trimmed}". ${grounded}`
}

const FallbackScreen = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center bg-black text-red-400">
    <div className="text-center space-y-4">
      <h1 className="text-2xl">Neuro-Link Fault Detected</h1>
      <p className="text-sm opacity-70">{error.message}</p>
      <button
        className="rounded-full border border-red-400/50 px-5 py-2"
        onClick={() => window.location.reload()}
      >
        Restart Session
      </button>
    </div>
  </div>
)

export default function Home() {
  const {
    messages,
    memory,
    metrics,
    ragEnabled,
    qualityMode,
    addMessage,
    addMemory,
    togglePin,
    toggleRag,
    setQualityMode,
    clearSession,
    setMetrics
  } = useNeuroStore()
  const [input, setInput] = useState('')
  const [ragMatches, setRagMatches] = useState(() => retrieveContext('', knowledgeBase))
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        fps: Math.round(55 + Math.random() * 10),
        latency: Math.round(18 + Math.random() * 20),
        memory: Math.round(420 + Math.random() * 180),
        mood: Math.round((0.4 + Math.random() * 0.5) * 100) / 100
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [setMetrics])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useHotkeys('ctrl+l', clearSession)
  useHotkeys('ctrl+/', () => setInput('/help'))

  const ragHighlights = useMemo(() => {
    return ragMatches.map((match) => ({
      id: match.document.id,
      title: match.document.title,
      score: match.score,
      highlights: match.highlights
    }))
  }, [ragMatches])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim()) return

    const timestamp = new Date().toISOString()
    const userMessage = {
      id: `msg-${timestamp}`,
      role: 'user' as const,
      content: input.trim(),
      timestamp
    }

    addMessage(userMessage)

    if (input.startsWith('/')) {
      if (input.startsWith('/help')) {
        addMessage({
          id: `sys-${timestamp}`,
          role: 'system',
          content:
            'Commands: /help, /memory <note>, /rag, /quality <ultra|balanced|lite>',
          timestamp
        })
      } else if (input.startsWith('/memory')) {
        const note = input.replace('/memory', '').trim()
        if (note) {
          addMemory({
            id: `mem-${timestamp}`,
            label: `Session note ${memory.length + 1}`,
            content: note,
            pinned: true,
            updatedAt: timestamp
          })
        }
      } else if (input.startsWith('/rag')) {
        toggleRag()
      } else if (input.startsWith('/quality')) {
        const mode = input.replace('/quality', '').trim()
        if (mode === 'ultra' || mode === 'balanced' || mode === 'lite') {
          setQualityMode(mode)
        }
      }
      setInput('')
      return
    }

    const matches = ragEnabled ? retrieveContext(input, knowledgeBase) : []
    setRagMatches(matches)

    const ragSnippets = matches.flatMap((match) => match.highlights)
    const assistantReply = generateAssistantReply(input, ragSnippets)

    addMessage({
      id: `assist-${timestamp}`,
      role: 'assistant',
      content: assistantReply,
      timestamp
    })

    if (input.length > 8) {
      addMemory({
        id: `mem-${timestamp}`,
        label: `User intent ${memory.length + 1}`,
        content: input,
        pinned: false,
        updatedAt: timestamp
      })
    }

    setInput('')
  }

  const density = qualityConfig[qualityMode].density
  const glow = qualityConfig[qualityMode].glow

  return (
    <ErrorBoundary FallbackComponent={FallbackScreen}>
      <div className="min-h-screen bg-cyber-bg px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-cyber-primary">JARVIS Neuro-Link</h1>
            <p className="text-sm text-cyan-100/60">
              Optimized memory lattice with retrieval-augmented reasoning.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-cyan-100/70">
            <div className="rounded-full border border-cyan-400/30 px-4 py-2">
              FPS: {metrics.fps}
            </div>
            <div className="rounded-full border border-cyan-400/30 px-4 py-2">
              Latency: {metrics.latency}ms
            </div>
            <div className="rounded-full border border-cyan-400/30 px-4 py-2">
              Memory: {metrics.memory}MB
            </div>
            <div className="rounded-full border border-cyan-400/30 px-4 py-2">
              Mood: {Math.round(metrics.mood * 100)}%
            </div>
          </div>
        </header>

        <main className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className={`rounded-3xl border border-cyan-400/20 ${density} p-6 ${glow}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl text-cyan-100">Command Stream</h2>
                <p className="text-xs text-cyan-100/50">
                  Context-aware dialogue with memory weaving.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={toggleRag}
                  className={`rounded-full border px-4 py-2 ${
                    ragEnabled
                      ? 'border-cyan-400/60 text-cyan-100'
                      : 'border-cyan-400/20 text-cyan-100/40'
                  }`}
                >
                  RAG {ragEnabled ? 'On' : 'Off'}
                </button>
                <select
                  value={qualityMode}
                  onChange={(event) => setQualityMode(event.target.value as typeof qualityMode)}
                  className="rounded-full border border-cyan-400/40 bg-black/40 px-3 py-2 text-xs"
                >
                  <option value="ultra">Ultra</option>
                  <option value="balanced">Balanced</option>
                  <option value="lite">Lite</option>
                </select>
              </div>
            </div>

            <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto pr-3">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-cyan-400/30 p-6 text-sm text-cyan-100/60">
                  Start a session to populate the neural context buffer.
                </div>
              )}
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-4 text-sm ${
                    message.role === 'user'
                      ? 'border-cyan-400/40 bg-cyan-400/10'
                      : message.role === 'assistant'
                      ? 'border-blue-400/40 bg-blue-400/10'
                      : 'border-purple-400/40 bg-purple-400/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] uppercase text-cyan-100/50">
                    <span>{message.role}</span>
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-2 text-cyan-100/90">{message.content}</p>
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <textarea
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  if (ragEnabled) {
                    setRagMatches(retrieveContext(event.target.value, knowledgeBase))
                  }
                }}
                placeholder="Transmit a directive (try /help, /memory, /rag, /quality)..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-cyan-400/30 bg-black/30 p-4 text-sm text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-cyan-100/50">
                  Commands: /help • /memory &lt;note&gt; • /rag • /quality
                </div>
                <button
                  type="submit"
                  className="rounded-full border border-cyan-400/60 px-6 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10"
                >
                  Send
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6">
            <div className={`rounded-3xl border border-cyan-400/20 p-6 ${density} ${glow}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-cyan-100">RAG Signal Layer</h2>
                <span className="text-xs text-cyan-100/50">
                  {ragEnabled ? 'Active' : 'Standby'}
                </span>
              </div>
              <div className="mt-4 space-y-4 text-xs text-cyan-100/70">
                {ragHighlights.length === 0 ? (
                  <p>No retrieval matches yet. Provide a query to activate context search.</p>
                ) : (
                  ragHighlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="rounded-2xl border border-cyan-400/30 bg-black/30 p-4"
                    >
                      <div className="flex items-center justify-between text-xs text-cyan-100">
                        <span>{highlight.title}</span>
                        <span>{highlight.score.toFixed(2)}</span>
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {highlight.highlights.map((line, index) => (
                          <li key={`${highlight.id}-${index}`}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`rounded-3xl border border-cyan-400/20 p-6 ${density} ${glow}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-cyan-100">Memory Bank</h2>
                <span className="text-xs text-cyan-100/50">{memory.length} stored</span>
              </div>
              <div className="mt-4 space-y-3 text-xs text-cyan-100/70">
                {memory.length === 0 ? (
                  <p>Capture a memory using /memory &lt;note&gt; or send a directive.</p>
                ) : (
                  memory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-black/30 p-4"
                    >
                      <div>
                        <p className="text-cyan-100">{item.label}</p>
                        <p className="mt-1 text-cyan-100/70">{item.content}</p>
                        <p className="mt-2 text-[10px] uppercase text-cyan-100/40">
                          Updated {new Date(item.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => togglePin(item.id)}
                        className={`text-xs ${item.pinned ? 'text-cyan-100' : 'text-cyan-100/40'}`}
                      >
                        {item.pinned ? 'Pinned' : 'Pin'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  )
}
