
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Heart,
  Settings,
  Tag,
  MessageSquare,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type React from 'react';

type NavItemConfig = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  isSeparator?: false;
};

type SeparatorConfig = {
  isSeparator: true;
  key: string;
};

type ProfileNavItemConfig = NavItemConfig | SeparatorConfig;


export function ProfileSidebarNav() {
  const pathname = usePathname();
  const t = useTranslation();

  const profileNavItems: ProfileNavItemConfig[] = [
    { href: '/profile', labelKey: 'profileSidebar.dashboard', icon: LayoutDashboard },
    { href: '/profile/listings', labelKey: 'profileSidebar.myListings', icon: Store },
    { href: '/profile/offers', labelKey: 'profileSidebar.myOffers', icon: Tag },
    { href: '/profile/wishlist', labelKey: 'profileSidebar.wishlist', icon: Heart },
    { href: '/messages', labelKey: 'profileSidebar.messages', icon: MessageSquare }, // Ensure this href is correct
    { isSeparator: true, key: 'separator-before-settings' }, 
    { href: '/profile/settings', labelKey: 'profileSidebar.settings', icon: Settings },
  ];

  return (
    <SidebarMenu className="p-2 space-y-1"> {/* Adjusted spacing */}
      {profileNavItems.map((item) => {
        if (item.isSeparator) {
          return <SidebarSeparator key={item.key} className="my-2 group-data-[state=collapsed]:hidden" />;
        }
        
        const navItem = item as NavItemConfig;

        // Check if the current pathname starts with the nav item's href.
        // For the root profile page, ensure it's an exact match.
        const isActive = navItem.href === '/profile' 
            ? pathname === navItem.href 
            : pathname.startsWith(navItem.href);
        
        return (
          <SidebarMenuItem key={navItem.labelKey}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(
                'w-full justify-start text-sm h-auto py-2.5 px-3 rounded-lg transition-colors duration-150', 
                isActive 
                  ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold shadow-inner' 
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/15 hover:text-sidebar-primary',
                'group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:p-2 group-data-[state=collapsed]:aspect-square group-data-[state=collapsed]:w-9 group-data-[state=collapsed]:h-9 group-data-[state=collapsed]:rounded-full' // Adjusted collapsed styling
              )}
              tooltip={{
                children: t(navItem.labelKey),
                side: 'right',
                align: 'center',
                className: 'bg-primary text-primary-foreground text-xs px-2 py-1 shadow-lg rounded-md'
              }}
            >
              <Link href={navItem.href} className="flex items-center gap-2.5"> {/* Ensure Link is flex container for gap */}
                <navItem.icon className={cn(
                    'h-5 w-5 shrink-0', // Standardized icon size
                    isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover/menu-item:text-sidebar-primary',
                    'group-data-[state=collapsed]:mx-auto'
                  )} 
                />
                <span className="group-data-[state=collapsed]:hidden">{t(navItem.labelKey)}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

