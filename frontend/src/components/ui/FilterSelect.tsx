import { Icon } from '../Icon'

interface FilterSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]
  disabled?: boolean
}

export function FilterSelect({ id, value, onChange, options, disabled }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        className="h-9 px-3 pr-8 rounded-lg bg-surface-container-low text-sm appearance-none focus:outline-none focus:bg-surface-container cursor-pointer disabled:opacity-60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary text-[16px] pointer-events-none"
      />
    </div>
  )
}
