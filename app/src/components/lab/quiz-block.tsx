/**
 * Multiple-choice quiz component.
 * Reveals correct/wrong with Framer Motion animation.
 * Reports final score via optional onScore callback.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { QuizItem } from '@/lib/schema-lab'

interface QuizBlockProps {
  items: QuizItem[]
  onScore?: (score: number) => void
  className?: string
}

type AnswerState = 'unanswered' | 'correct' | 'wrong'

interface QuestionState {
  selected: number | null
  state: AnswerState
}

export function QuizBlock({ items, onScore, className }: QuizBlockProps) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<QuestionState[]>(
    () => items.map(() => ({ selected: null, state: 'unanswered' })),
  )
  const [finished, setFinished] = useState(false)
  const reduce = useReducedMotionPreference()

  const question = items[current]
  const answerState = answers[current]
  const isAnswered = answerState.state !== 'unanswered'

  function handleSelect(idx: number) {
    if (isAnswered) return

    const isCorrect = idx === question.correct
    const newAnswers = answers.map((a, i) =>
      i === current
        ? { selected: idx, state: (isCorrect ? 'correct' : 'wrong') as AnswerState }
        : a,
    )
    setAnswers(newAnswers)
  }

  function handleNext() {
    if (current < items.length - 1) {
      setCurrent((c) => c + 1)
    } else {
      const score = answers.filter((a) => a.state === 'correct').length
      // Count the just-answered question too if needed (already set above)
      const finalScore = answers.reduce(
        (acc, a) => acc + (a.state === 'correct' ? 1 : 0),
        0,
      )
      setFinished(true)
      onScore?.(finalScore)
      void score // suppress lint warning
    }
  }

  function handleReset() {
    setCurrent(0)
    setAnswers(items.map(() => ({ selected: null, state: 'unanswered' })))
    setFinished(false)
  }

  const finalScore = answers.filter((a) => a.state === 'correct').length

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-xl border border-border bg-card p-6 text-center', className)}
      >
        <p className="text-2xl font-bold">
          {finalScore}/{items.length}
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          {finalScore === items.length
            ? 'Perfect score!'
            : finalScore >= items.length * 0.7
            ? 'Good job!'
            : 'Keep practicing!'}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </motion.div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {current + 1} of {items.length}</span>
        <span>{answers.filter((a) => a.state !== 'unanswered').length} answered</span>
      </div>

      {/* Accessible live region — announces answer feedback to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAnswered
          ? answerState.state === 'correct'
            ? 'Correct!'
            : 'Incorrect. See the highlighted answer.'
          : ''}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={reduce ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? {} : { opacity: 0, x: -12 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <p
            className="font-medium leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm"
            dangerouslySetInnerHTML={{ __html: question.q }}
          />

          <div className="space-y-2">
            {question.options.map((opt, idx) => {
              const isSelected = answerState.selected === idx
              const isCorrectOpt = idx === question.correct
              let variant: 'default' | 'correct' | 'wrong' = 'default'
              if (isAnswered) {
                if (isCorrectOpt) variant = 'correct'
                else if (isSelected) variant = 'wrong'
              }

              return (
                <motion.button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={isAnswered}
                  whileTap={isAnswered ? {} : { scale: 0.98 }}
                  className={cn(
                    'w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-colors',
                    'disabled:cursor-default',
                    variant === 'default' && !isAnswered &&
                      'border-border hover:border-primary hover:bg-primary/5',
                    variant === 'default' && isAnswered && 'border-border bg-muted/20 opacity-60',
                    variant === 'correct' && 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
                    variant === 'wrong' && 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400',
                    isSelected && variant === 'default' && 'border-primary bg-primary/10',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {isAnswered && isCorrectOpt && (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                    )}
                    {isAnswered && isSelected && !isCorrectOpt && (
                      <XCircle className="w-4 h-4 shrink-0 text-red-500" />
                    )}
                    {opt}
                  </span>
                </motion.button>
              )
            })}
          </div>

          {/* Explanation reveal */}
          <AnimatePresence>
            {isAnswered && question.whyCorrect && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mt-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
                  <span className="font-medium text-foreground">Why: </span>
                  <span dangerouslySetInnerHTML={{ __html: question.whyCorrect }} />
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {isAnswered && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleNext}>
                {current < items.length - 1 ? 'Next →' : 'Finish'}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
