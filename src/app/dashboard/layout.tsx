import type { ReactNode } from 'react';
import { SidebarNav } from '@/components/sidebar-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset>
          {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
