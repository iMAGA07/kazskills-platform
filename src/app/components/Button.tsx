import { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/90 focus:ring-secondary': variant === 'secondary',
          'border-2 border-border bg-transparent hover:bg-accent focus:ring-primary': variant === 'outline',
          'hover:bg-accent text-foreground focus:ring-primary': variant === 'ghost',
          'bg-success text-success-foreground hover:bg-success/90 focus:ring-success': variant === 'success',
          'bg-warning text-warning-foreground hover:bg-warning/90 focus:ring-warning': variant === 'warning',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive': variant === 'destructive',
          
          // Sizes
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
