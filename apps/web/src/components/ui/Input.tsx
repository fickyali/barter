'use client';

import * as React from 'react';

import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
