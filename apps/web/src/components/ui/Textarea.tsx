'use client';

import * as React from 'react';

import { cn } from '@/lib/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
