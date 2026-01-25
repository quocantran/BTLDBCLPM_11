import { Modal } from 'antd'
import { ClockCircleOutlined, LoadingOutlined } from '@ant-design/icons'

export interface TimeUpModalProps {
  /** Whether the modal is visible */
  isOpen: boolean
  /** Whether the submission is in progress */
  isSubmitting: boolean
}

/**
 * TimeUpModal - Displays when exam time runs out
 * Shows a notification that the exam is being auto-submitted
 */
export const TimeUpModal = ({ isOpen, isSubmitting }: TimeUpModalProps) => {
  return (
    <Modal
      open={isOpen}
      closable={false}
      footer={null}
      centered
      width={400}
      maskClosable={false}
    >
      <div className="flex flex-col items-center justify-center py-8">
        {isSubmitting ? (
          <div className="w-16 h-16 flex items-center justify-center">
            <LoadingOutlined style={{ fontSize: 48, color: 'var(--primary-color)' }} spin />
          </div>
        ) : (
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <ClockCircleOutlined style={{ fontSize: 32, color: '#ea580c' }} />
          </div>
        )}
        
        <h3 className="mt-6 text-xl font-semibold text-slate-800">
          Time's Up!
        </h3>
        <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">
          {isSubmitting 
            ? 'Your exam is being submitted automatically. Please wait...'
            : 'Your time has expired. Submitting your answers now...'}
        </p>
        
        {/* Progress indicator */}
        <div className="mt-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <div className={`w-2 h-2 rounded-full ${isSubmitting ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
      </div>
    </Modal>
  )
}

export default TimeUpModal
