export type PayrollStatus = 'Draft' | 'Processed' | 'Paid'

export interface PayrollRecord {
  id: string
  employeeId: string
  month: string
  basicSalary: number
  allowances: number
  deductions: number
  grossSalary: number
  netSalary: number
  status: PayrollStatus
}
