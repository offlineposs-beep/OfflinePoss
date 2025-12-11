
import type { ReactNode } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

type PageHeaderProps = {
  title: string;
  children?: ReactNode;
};

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <SidebarTrigger />
      
      {/* Title */}
      <div className="absolute left-1/2 -translate-x-1/2 md:static md:left-auto md:translate-x-0">
        <h1 className="truncate text-lg font-semibold md:text-2xl">{title}</h1>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
}
