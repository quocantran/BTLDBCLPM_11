import React from 'react'
import { Badge, Icon } from '@/components/atoms'
import type { QuestionPreviewItemProps } from './QuestionPreviewItem.types'

export const QuestionPreviewItem: React.FC<QuestionPreviewItemProps> = ({
  index,
  question,
  choices,
  onEdit,
  onDelete,
  onToggleCollapse,
  isExpanded = false
}) => {
  const getChoicePrefix = (position: number) =>
    String.fromCharCode('A'.charCodeAt(0) + position)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm !mb-0 font-medium leading-relaxed text-slate-900">
            <span className="mr-2 font-semibold text-slate-500">{index}.</span>
            {question}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg cursor-pointer p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Edit question"
          >
            <Icon name="edit" size="small" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 cursor-pointer text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Remove question"
          >
            <Icon name="trash" size="small" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg p-2 cursor-pointer text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
          >
            <Icon
              name="chevron-down"
              className={
                isExpanded ? 'rotate-180 transform transition' : 'transition'
              }
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="">
          {choices.length > 0 ? (
            <div className="space-y-3">
              {choices.map((choice, choiceIndex) => {
                const isCorrect = choice.isCorrect
                return (
                  <div
                    key={choice.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {getChoicePrefix(choiceIndex)}
                    </div>
                    <div className="flex justify-center items-center">
                      <p className="text-sm text-slate-70 !mb-0">
                        {choice.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No answer choices available for this question yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
