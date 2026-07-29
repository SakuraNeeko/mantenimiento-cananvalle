'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-8 w-full rounded-[6px] border border-input bg-background px-2.5 py-1 text-sm shadow-xs transition-colors',
      'placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
