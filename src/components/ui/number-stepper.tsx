import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface NumberStepperProps
  extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
  /** Ghost text when value is 0 (e.g. yesterday's value) */
  placeholder?: number
  /** Small hint next to label (e.g. "target: 5" or checkmark) */
  hint?: React.ReactNode
}

export const NumberStepper = React.forwardRef<HTMLDivElement, NumberStepperProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 999,
      step = 1,
      label,
      disabled,
      placeholder,
      hint,
      className,
      ...props
    },
    ref
  ) => {
    const handleDecrement = () => {
      const next = Math.max(min, value - step)
      onChange(next)
    }
    const handleIncrement = () => {
      const next = Math.min(max, value + step)
      onChange(next)
    }
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10)
      if (!Number.isNaN(parsed)) {
        onChange(Math.min(max, Math.max(min, parsed)))
      }
    }
    const safeValue = Math.min(max, Math.max(min, value))

    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5', className)} {...props}>
        {(label || hint) && (
          <div className="flex items-center justify-between gap-2">
            {label && (
              <span className="text-sm font-medium text-muted-foreground">
                {label}
              </span>
            )}
            {hint != null && <span className="text-xs">{hint}</span>}
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg border bg-background">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-r-none border-0"
            onClick={handleDecrement}
            disabled={disabled || safeValue <= min}
            aria-label={label ? `Decrease ${label}` : 'Decrease'}
          >
            <Minus className="size-5" aria-hidden />
          </Button>
          <Input
            type="number"
            min={min}
            max={max}
            value={safeValue}
            onChange={handleInputChange}
            placeholder={placeholder != null && safeValue === 0 ? String(placeholder) : undefined}
            className="h-11 min-h-[44px] border-0 text-center text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            disabled={disabled}
            aria-label={label}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-l-none border-0"
            onClick={handleIncrement}
            disabled={disabled || safeValue >= max}
            aria-label={label ? `Increase ${label}` : 'Increase'}
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
    )
  }
)
NumberStepper.displayName = 'NumberStepper'
