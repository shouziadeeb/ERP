/** Confirms sign-out before clearing session (used from AppShell). */
import { Icon } from '../Icon'

interface LogoutConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({ open, onCancel, onConfirm }: LogoutConfirmModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl p-6 flex flex-col gap-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0">
            <Icon name="logout" className="text-[24px]" />
          </div>
          <div>
            <h3 id="logout-dialog-title" className="text-base font-semibold text-on-surface">
              Sign out?
            </h3>
            <p className="text-sm text-secondary mt-1">
              You will need to sign in again to access ApexERP modules and data.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-surface-container-low text-sm font-semibold text-on-surface hover:bg-surface-container"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold flex items-center gap-1.5 hover:bg-primary-container"
            onClick={onConfirm}
          >
            <Icon name="logout" className="text-[16px]" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
