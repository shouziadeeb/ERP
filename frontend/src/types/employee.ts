export type EmployeeStatus =
  | 'Active'
  | 'On Leave'
  | 'Probation'
  | 'Suspended'
  | 'Inactive'

export type EmploymentType = 'Full Time' | 'Part Time' | 'Contract' | 'Intern'

export interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  country: string
  city: string
  departmentId: string
  departmentName: string
  designationId: string
  designation: string
  managerId: string | null
  employmentType: EmploymentType
  joiningDate: string
  status: EmployeeStatus
  skills: string[]
  avatar: string | null
}

export interface Department {
  id: string
  name: string
  code: string
}

export interface Designation {
  id: string
  title: string
  departmentId: string
}
