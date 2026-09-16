
'use client';

import type React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { ProfileSidebarNav } from '@/components/profile/ProfileSidebarNav';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';


export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, logout, currentUser } = useAuth();
  const router = useRouter();
  const t = useTranslation();

  useEffect(() => {
    if (!isLoggedIn && !currentUser) { 
      router.push('/login?redirect=/profile');
    }
  }, [isLoggedIn, currentUser, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]"> {/* Adjusted height considering header */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-border/60">
        <SidebarHeader className="p-2">
          <span className="text-lg font-semibold text-sidebar-primary group-data-[state=collapsed]:hidden">
            {t('header.profile')}
          </span>
           {/* Trigger for collapsed state when sidebar is icon-only, only for mobile */}
          <SidebarTrigger className="group-data-[state=expanded]:hidden md:hidden h-8 w-8" />
        </SidebarHeader>
        <SidebarContent>
          <ProfileSidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:aspect-square group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:w-9 group-data-[state=collapsed]:h-9 group-data-[state=collapsed]:rounded-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4 group-data-[state=collapsed]:mr-0" />
              <span className="group-data-[state=collapsed]:hidden">{t('header.logout')}</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      {/* The SidebarInset now directly wraps the children. 
          Page-specific container logic (like max-width) should be handled within the children pages themselves 
          or in a more specific layout component if needed for message pages.
      */}
      <SidebarInset>
         {/* For routes like /messages, the child (MessagesPage) will implement its own two-pane layout within this inset. */}
         {/* For other profile pages, they can use <div className="container mx-auto px-4"> if needed. */}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

