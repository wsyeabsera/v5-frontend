'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ExecutionFollowUpQuestion } from '@/types'
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react'

interface ExecutionQuestionsProps {
  questions: ExecutionFollowUpQuestion[]
  userFeedback: { questionId: string; answer: string }[]
  updateFeedback: (questionId: string, answer: string) => void
  onSubmitFeedback: () => void
  submittingFeedback: boolean
}

export function ExecutionQuestions({
  questions,
  userFeedback,
  updateFeedback,
  onSubmitFeedback,
  submittingFeedback,
}: ExecutionQuestionsProps) {
  const unansweredQuestions = questions.filter(q => !q.userAnswer && !userFeedback.find(f => f.questionId === q.id))

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'low':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      default:
        return 'bg-muted'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'missing-data':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
      case 'error-recovery':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'coordination':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20'
      case 'ambiguity':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'user-choice':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      default:
        return 'bg-muted'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Follow-Up Questions
          <Badge variant="outline">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question) => {
          const hasAnswer = question.userAnswer || userFeedback.find(f => f.questionId === question.id)?.answer

          return (
            <div key={question.id} className="space-y-3 p-4 border rounded-lg bg-muted/30">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${getPriorityColor(question.priority)}`}>
                    {question.priority} priority
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(question.category)}`}>
                    {question.category}
                  </Badge>
                  {hasAnswer && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                      Answered
                    </Badge>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <p className="text-sm font-medium mb-3">{question.question}</p>

                {/* Context */}
                <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-muted-foreground">Step {question.context.stepOrder}:</span>
                    <span className="ml-2">{question.context.whatFailed}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">What was tried:</span>
                    <span className="ml-2">{question.context.whatWasTried}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Current state:</span>
                    <span className="ml-2">{question.context.currentState}</span>
                  </div>
                  {question.context.suggestion && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="font-medium text-muted-foreground">Suggestion:</span>
                      <span className="ml-2">{question.context.suggestion}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Answer Input */}
              {!hasAnswer ? (
                <Textarea
                  placeholder="Your answer..."
                  value={userFeedback.find(f => f.questionId === question.id)?.answer || ''}
                  onChange={(e) => updateFeedback(question.id, e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                  <p className="text-sm">{question.userAnswer || userFeedback.find(f => f.questionId === question.id)?.answer}</p>
                </div>
              )}
            </div>
          )
        })}

        {/* Submit Button */}
        {unansweredQuestions.length > 0 && (
          <Button
            onClick={onSubmitFeedback}
            disabled={submittingFeedback || userFeedback.length === 0}
            className="w-full gap-2"
          >
            {submittingFeedback ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resuming Execution...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Submit Answers & Resume Execution
              </>
            )}
          </Button>
        )}

        {unansweredQuestions.length === 0 && questions.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-700">
            <AlertCircle className="w-4 h-4" />
            All questions have been answered. Execution can proceed.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

