
'use client';

import Link from 'next/link';
import { Bell, MailCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export function NotificationIcon() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder to avoid SSR mismatch for interactive component
    return (
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted/50 w-9 h-9" disabled>
            <Bell className="h-5 w-5 text-foreground/80" />
        </Button>
    );
  }

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setIsOpen(false); // Close popover after clicking a notification
  };
  
  const recentNotifications = notifications.slice(0, 7); // Show up to 7 recent notifications

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted/50 w-9 h-9" aria-label="View notifications">
          <Bell className="h-5 w-5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 shadow-xl border-border/70" align="end">
        <div className="p-3 flex items-center justify-between border-b">
          <h4 className="font-semibold text-sm text-primary">{t('header.notifications')}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-primary hover:bg-primary/10 h-7 px-2">
              <MailCheck className="mr-1.5 h-3.5 w-3.5" /> {t('notifications.markAllAsRead')}
            </Button>
          )}
        </div>
        {recentNotifications.length > 0 ? (
          <ScrollArea className="max-h-[300px] sm:max-h-[350px]">
            <div className="divide-y divide-border/50">
              {recentNotifications.map((notification) => (
                <div key={notification.id} onClick={() => handleNotificationClick(notification.id)}>
                    <NotificationItem notification={notification} isDropdownItem />
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
            {t('notifications.noNotificationsTitle')}
          </div>
        )}
        <Separator />
        <div className="p-2">
          <Button variant="link" asChild className="w-full text-primary justify-center text-xs">
            <Link href="/notifications" onClick={() => setIsOpen(false)}>{t('notifications.viewAllLink')}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
