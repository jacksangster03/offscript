import { cn } from './cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  glowing?: boolean
}

export function Card({ elevated, glowing, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border transition-all duration-200',
        elevated
          ? 'bg-bg-elevated border-border-default shadow-elevated'
          : 'bg-bg-surface border-border-subtle shadow-surface',
        glowing && 'shadow-glow-accent border-accent/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pt-6 pb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pb-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-text-primary', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-text-muted mt-0.5', className)} {...props}>
      {children}
    </p>
  )
}
