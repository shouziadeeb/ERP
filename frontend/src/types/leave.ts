export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
  approvedBy: string | null
}
