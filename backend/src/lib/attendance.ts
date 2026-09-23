type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'Half Day'
  | 'On Leave'
  | 'Holiday'

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workingHours: number
  status: AttendanceStatus
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function padNum(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

export function generateEmployeeAttendance(
  employeeId: string,
  year: number,
  month: number,
): AttendanceRecord[] {
  const rand = createSeededRandom(Number(employeeId.replace(/\D/g, '')) + year * 100 + month)
  const daysInMonth = new Date(year, month, 0).getDate()
  const records: AttendanceRecord[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${padNum(month, 2)}-${padNum(day, 2)}`
    const weekday = new Date(year, month - 1, day).getDay()
    if (weekday === 0 || weekday === 6) {
      records.push({
        id: `ATT-${employeeId}-${date}`,
        employeeId,
        date,
        checkIn: null,
        checkOut: null,
        workingHours: 0,
        status: 'Holiday',
      })
      continue
    }

    const roll = rand()
    let status: AttendanceStatus = 'Present'
    if (roll < 0.04) status = 'Absent'
    else if (roll < 0.1) status = 'Late'
    else if (roll < 0.13) status = 'On Leave'
    else if (roll < 0.15) status = 'Half Day'

    const checkIn =
      status === 'Absent' || status === 'On Leave'
        ? null
        : status === 'Late'
          ? '10:18'
          : `09:0${1 + (day % 5)}`
    const checkOut =
      status === 'Absent' || status === 'On Leave'
        ? status === 'Half Day'
          ? '13:30'
          : null
        : `18:0${3 + (day % 4)}`
    const workingHours =
      status === 'Absent' || status === 'On Leave'
        ? 0
        : status === 'Half Day'
          ? 4.25
          : status === 'Late'
            ? 7.5
            : 8.5 + (day % 3) * 0.15

    records.push({
      id: `ATT-${employeeId}-${date}`,
      employeeId,
      date,
      checkIn,
      checkOut,
      workingHours: Math.round(workingHours * 100) / 100,
      status,
    })
  }

  return records
}
