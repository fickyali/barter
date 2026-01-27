'use client';

import * as React from 'react';

import { cn } from '@/lib/cn';

type Variant = 'neutral' | 'success' | 'warning' | 'danger';

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium';
  const variants: Record<Variant, string> = {
    neutral: 'border-border bg-surface2 text-foreground',
    success: 'border-transparent bg-success/12 text-success',
    warning: 'border-transparent bg-warning/14 text-warning',
    danger: 'border-transparent bg-danger/12 text-danger',
  };

  return <span className={cn(base, variants[variant], className)} {...props} />;
}
