import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps
} from 'recharts'
import type { StudentDashboardPerformance } from '@/services/types'

interface ChartDatum {
  submittedAt: string
  label: string
  examTitle: string
  score: number
  result: 'Passed' | 'Failed'
}

interface ResultsTrendCardProps {
  performance?: StudentDashboardPerformance
  isLoading?: boolean
}

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

const formatTooltipDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

interface ChartTooltipPayload {
  payload?: ChartDatum
}

type ChartTooltipProps = TooltipProps<number, string> & {
  payload?: ChartTooltipPayload[]
}

const ChartTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  const datum = payload[0].payload as ChartDatum

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-[var(--medium-text)]">
        {formatTooltipDate(datum.submittedAt)}
      </p>
      <p className="text-sm font-semibold text-[var(--dark-text)]">
        {datum.examTitle}
      </p>
      <p className="text-xs text-[var(--medium-text)]">
        Score {datum.score.toFixed(1)}% · {datum.result}
      </p>
    </div>
  )
}

const buildChartData = (
  performance?: StudentDashboardPerformance
): ChartDatum[] => {
  if (!performance?.points?.length) {
    return []
  }

  return performance.points.map((point) => ({
    submittedAt: point.submittedAt,
    examTitle: point.examTitle,
    score: point.score,
    result: point.result,
    label: formatDate(point.submittedAt)
  }))
}

export const ResultsTrendCard = ({
  performance,
  isLoading
}: ResultsTrendCardProps) => {
  const chartData = useMemo(() => buildChartData(performance), [performance])
  const hasData = chartData.length > 0
  const averageScore = performance?.averageScore ?? 0
  const passRate = performance?.passRate ?? 0

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-[var(--medium-text)]">
            Performance trend
          </p>
          <h2 className="text-2xl font-semibold text-[var(--dark-text)]">
            Track your scores over time
          </h2>
          <p className="text-sm text-[var(--medium-text)] mt-1">
            Visual history of your graded exam attempts.
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs uppercase text-[var(--medium-text)]">
              Avg. score
            </p>
            <p className="text-2xl font-semibold text-[var(--dark-text)]">
              {averageScore.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-[var(--medium-text)]">
              Pass rate
            </p>
            <p className="text-2xl font-semibold text-[var(--dark-text)]">
              {passRate}%
            </p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-[var(--medium-text)] mt-6">
          No graded exams yet. Complete an exam to start building your trend.
        </p>
      ) : (
        <div className="mt-6 h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: '#E5E7EB' }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#4F46E5"
                strokeWidth={3}
                fill="url(#scoreGradient)"
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
