import type { StudentDashboardPendingActions } from '@/services/types'

interface PendingActionsCardProps {
  pendingActions: StudentDashboardPendingActions
  isLoading?: boolean
}

const ActionRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <span className="text-sm text-[var(--medium-text)]">{label}</span>
    <span className="text-base font-semibold text-[var(--dark-text)]">
      {value}
    </span>
  </div>
)

export const PendingActionsCard = ({
  pendingActions,
  isLoading
}: PendingActionsCardProps) => {
  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-medium text-[var(--medium-text)]">
        Quick overview
      </p>
      <h3 className="text-xl font-semibold text-[var(--dark-text)]">
        Pending actions
      </h3>
      <div className="mt-6">
        <ActionRow
          label="Certificates awaiting review"
          value={`${pendingActions.pendingCertificateCount}`}
        />
        <ActionRow
          label="Exams in the next 7 days"
          value={`${pendingActions.examsThisWeek}`}
        />
        <ActionRow
          label="Active exam status"
          value={pendingActions.hasActiveExam ? 'Active now' : 'Idle'}
        />
      </div>
    </section>
  )
}
