import { Icon } from '../Icon'
import type { Employee } from '../../types/employee'

interface DeleteEmployeeModalProps {
  employee: Employee | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteEmployeeModal({
  employee,
  deleting,
  onCancel,
  onConfirm,
}: DeleteEmployeeModalProps) {
  if (!employee) return null

  return (
    <div
      className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={deleting ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl p-6 flex flex-col gap-4"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
            <Icon name="delete_forever" className="text-[24px]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-on-surface">Delete Employee Record</h3>
            <p className="text-sm text-secondary mt-1">
              Remove <strong className="text-on-surface">{employee.fullName}</strong> from the
              workforce directory?
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-surface-container-low text-sm font-semibold disabled:opacity-60"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-error text-on-error text-sm font-semibold flex items-center gap-1 disabled:opacity-60"
            onClick={onConfirm}
            disabled={deleting}
          >
            <Icon name="delete" className="text-[16px]" />
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
