import type React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode; // For actions like a "Create New" button
}

export function PageHeader({ title, description, className, children }: PageHeaderProps) {
  return (
    <div className={cn(
        "mb-8 sm:mb-10 pb-4 sm:pb-5 border-b-2 border-primary/20", 
        className
      )}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
            {title}
          </h1>
          {description && (
            <p className="mt-1 sm:mt-2 text-base sm:text-lg text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div className="flex-shrink-0 mt-3 sm:mt-0">{children}</div>}
      </div>
    </div>
  );
}
