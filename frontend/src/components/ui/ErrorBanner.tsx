interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-lg border border-error-container bg-error-container/40 px-4 py-3 flex items-center justify-between text-sm text-on-error-container">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          className="h-8 px-3 rounded-lg bg-surface-container-lowest font-semibold text-on-surface"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  )
}
