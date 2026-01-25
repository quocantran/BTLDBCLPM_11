/**
 * Tính toán status của exam dựa trên thời gian hiện tại và thời gian start/end
 * @param referenceDate Thời gian tham chiếu (thường là thời gian hiện tại)
 * @param startTime Thời gian bắt đầu exam
 * @param endTime Thời gian kết thúc exam
 * @param currentStatus Status hiện tại của exam trong database
 * @returns Status được tính toán: 'scheduled' | 'active' | 'completed' | 'cancelled'
 */
export function computeExamStatus(
  referenceDate: Date,
  startTime: Date,
  endTime: Date,
  currentStatus: string,
): 'scheduled' | 'active' | 'completed' | 'cancelled' {
  // If exam is cancelled, keep that status
  if (currentStatus === 'cancelled') {
    return 'cancelled';
  }

  // If exam has ended, mark as completed
  if (referenceDate > endTime) {
    return 'completed';
  }

  // If exam is currently running, mark as active
  if (referenceDate >= startTime && referenceDate <= endTime) {
    return 'active';
  }

  // If exam hasn't started yet, keep current status (usually scheduled)
  return currentStatus as 'scheduled' | 'active' | 'completed' | 'cancelled';
}
