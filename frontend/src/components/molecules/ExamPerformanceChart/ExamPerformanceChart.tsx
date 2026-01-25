'use client'

import React, { useMemo, useCallback, Component, type ReactNode } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps
} from 'recharts'
import {
  type ExamPerformanceChartProps,
  type ExamPerformanceRecord
} from './ExamPerformanceChart.types'

// Error Boundary to catch recharts errors
interface ChartErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ChartErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ChartErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      '[ExamPerformanceChart] Chart rendering error:',
      error,
      errorInfo
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Unable to render chart. Please try refreshing the page.
          </div>
        )
      )
    }

    return this.props.children
  }
}

interface CustomizedAxisTickProps {
  x?: number
  y?: number
  payload?: {
    value: string | number
  }
}

const BAR_MIN_WIDTH = 72
const CHART_MIN_WIDTH = 640

interface ChartDatum extends ExamPerformanceRecord {
  total: number
  passRate: number
  failRate: number
}

interface TooltipEntry {
  color?: string
  dataKey?: string | number
  name?: string
  value?: number
  payload?: ChartDatum
}

const PASS_COLOR = '#22C55E'
const FAIL_COLOR = '#F97316'
const MAX_TICK_LABEL_LENGTH = 14

const formatPercentage = (value: number) => `${Math.round(value)}%`

type ChartTooltipProps = TooltipProps<number, string> & {
  payload?: TooltipEntry[]
  label?: string
}

const TooltipContent: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label
}) => {
  if (!active || !payload?.length) {
    return null
  }

  const datum = payload[0].payload as ChartDatum

  return (
    <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-xs text-slate-500">
        {datum.total.toLocaleString()} students · Pass rate{' '}
        {formatPercentage(datum.passRate)}
      </p>
      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => (
          <div
            key={String(entry.dataKey ?? entry.name ?? index)}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color ?? 'currentColor' }}
              />
              {entry.name ?? entry.dataKey}
            </span>
            <span className="text-slate-700">
              {entry.value?.toLocaleString()} ·{' '}
              {formatPercentage(
                entry.dataKey === 'passCount' ? datum.passRate : datum.failRate
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ExamPerformanceChart: React.FC<ExamPerformanceChartProps> = ({
  title = 'Exam Performance Overview',
  subtitle = 'Pass and fail distribution across recent exams',
  records,
  summary,
  className,
  onExamSelect,
  headerActions
}) => {
  const safeRecords = Array.isArray(records) ? records : []

  const chartData = useMemo<ChartDatum[]>(() => {
    const result = safeRecords
      .filter((record) => record && typeof record === 'object')
      .map((record, index) => {
        const passCount =
          typeof record.passCount === 'number' &&
          Number.isFinite(record.passCount)
            ? record.passCount
            : 0
        const failCount =
          typeof record.failCount === 'number' &&
          Number.isFinite(record.failCount)
            ? record.failCount
            : 0
        const total = passCount + failCount
        const safeTotal = total || 1
        const passRate = (passCount / safeTotal) * 100
        // Ensure examName is always a valid non-empty string for XAxis
        const examName =
          record.examName &&
          typeof record.examName === 'string' &&
          record.examName.trim()
            ? record.examName.trim()
            : `Exam ${index + 1}`
        const examId =
          record.examId && typeof record.examId === 'string'
            ? record.examId
            : `exam-${index}`
        return {
          examId,
          examName,
          passCount,
          failCount,
          total,
          passRate,
          failRate: total ? 100 - passRate : 0
        }
      })

    return result
  }, [safeRecords])

  const totalStudents = useMemo(() => {
    if (summary?.totalStudents !== undefined) {
      return summary.totalStudents
    }
    return chartData.reduce((acc, record) => acc + record.total, 0)
  }, [chartData, summary?.totalStudents])

  const aggregatedPassRate = useMemo(() => {
    if (summary?.passRate !== undefined) {
      return summary.passRate
    }
    const passTotal = chartData.reduce(
      (acc, record) => acc + record.passCount,
      0
    )
    const safeTotal = totalStudents || 1
    return (passTotal / safeTotal) * 100
  }, [chartData, summary?.passRate, totalStudents])

  const handleDataPointClick = useCallback(
    (payload?: ChartDatum) => {
      if (!payload || !onExamSelect) {
        return
      }

      onExamSelect({
        examId: payload.examId,
        examName: payload.examName,
        passCount: payload.passCount,
        failCount: payload.failCount
      })
    },
    [onExamSelect]
  )

  const isInteractive = Boolean(onExamSelect)
  const chartWidth = Math.max(chartData.length * BAR_MIN_WIDTH, CHART_MIN_WIDTH)

  const renderXAxisTick = useCallback(
    ({ x = 0, y = 0, payload }: CustomizedAxisTickProps) => {
      const value = String(payload?.value ?? '')
      const truncated =
        value.length > MAX_TICK_LABEL_LENGTH
          ? `${value.slice(0, MAX_TICK_LABEL_LENGTH - 1)}…`
          : value

      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={12}
            textAnchor="end"
            fill="#475569"
            fontSize={12}
            transform="rotate(-30)"
          >
            {truncated}
          </text>
          {value !== truncated ? <title>{value}</title> : null}
        </g>
      )
    },
    []
  )

  if (!chartData.length) {
    return (
      <div
        className={`rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 shadow-sm ${
          className ?? ''
        }`.trim()}
      >
        No exam performance data available yet.
      </div>
    )
  }

  const chartOuterClass = `h-80 w-full overflow-x-auto select-none ${
    isInteractive ? 'cursor-pointer' : ''
  }`.trim()

  const barClassName = isInteractive ? 'cursor-pointer' : undefined

  return (
    <div
      className={`space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${
        className ?? ''
      }`.trim()}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            {headerActions ?? (
              <div className="md:self-end">{headerActions}</div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span>
                Exams tracked:{' '}
                <span className="font-medium text-slate-900">
                  {chartData.length}
                </span>
              </span>
              <span>
                Total students:{' '}
                <span className="font-medium text-slate-900">
                  {totalStudents.toLocaleString()}
                </span>
              </span>
              <span>
                Overall pass rate:{' '}
                <span className="font-medium text-emerald-600">
                  {formatPercentage(aggregatedPassRate)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={chartOuterClass}>
        <div className="h-full min-w-full" style={{ width: chartWidth }}>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 24, right: 16, left: 0, bottom: 16 }}
                className={isInteractive ? 'cursor-pointer' : undefined}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
                <XAxis
                  dataKey="examName"
                  interval={0}
                  height={64}
                  tickLine={false}
                  tickMargin={16}
                  tick={renderXAxisTick}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={<TooltipContent />}
                  cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 12 }}
                />
                <Bar
                  dataKey="failCount"
                  name="Fail"
                  fill={FAIL_COLOR}
                  stackId="performance"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={48}
                  onClick={(data) =>
                    handleDataPointClick(data?.payload as ChartDatum)
                  }
                  className={barClassName}
                />
                <Bar
                  dataKey="passCount"
                  name="Pass"
                  fill={PASS_COLOR}
                  stackId="performance"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  onClick={(data) =>
                    handleDataPointClick(data?.payload as ChartDatum)
                  }
                  className={barClassName}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </div>
      </div>
    </div>
  )
}
