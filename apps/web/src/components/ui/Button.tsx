'use client';

import * as React from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', asChild = false, type, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20';

    const variants: Record<Variant, string> = {
      primary: 'border-transparent bg-primary text-primary-foreground hover:opacity-95',
      secondary: 'bg-surface text-foreground border-border hover:bg-surface2',
      ghost: 'border-transparent bg-transparent text-foreground hover:bg-surface2',
      destructive: 'border-transparent bg-danger text-danger-foreground hover:opacity-95',
    };

    const sizes: Record<Size, string> = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-5 text-base',
    };

    const composedClassName = cn(base, variants[variant], sizes[size], className);

    if (asChild) {
      const { children, ...rest } = props;
      const onlyChild = React.Children.only(children) as React.ReactElement<any>;
      return React.cloneElement(onlyChild, {
        ...rest,
        className: cn(onlyChild.props?.className, composedClassName),
        ref: (onlyChild as any).ref ?? (ref as any),
      });
    }

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={composedClassName}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
