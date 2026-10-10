import clsx from 'clsx'
import { forwardRef } from 'react'

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ invalid, className, ...props }, ref) => (
  <input ref={ref} aria-invalid={invalid || undefined} className={clsx('field', invalid && 'field-error', className)} {...props} />
))
Input.displayName = 'Input'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ invalid, className, children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={clsx('field cursor-pointer pr-8', invalid && 'field-error', className)}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ invalid, className, ...props }, ref) => (
  <textarea ref={ref} aria-invalid={invalid || undefined} className={clsx('field resize-y', invalid && 'field-error', className)} {...props} />
))
Textarea.displayName = 'Textarea'
