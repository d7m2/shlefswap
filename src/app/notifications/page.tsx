
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/contexts/NotificationContext';
import { BellRing, CheckCheck, Trash2, ListFilter, BellOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ITEMS_PER_PAGE = 10;

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications,
  } = useNotifications();
  const { isLoggedIn } = useAuth();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when tab changes or notifications update
  }, [activeTab, notifications]);


  if (!mounted) {
    // Basic skeleton or loading state to avoid SSR mismatch issues with context-dependent UI
    return (
        <div className="space-y-8">
            <PageHeader title="Notifications" description="Loading your notifications..." />
            <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded w-1/2 mx-auto"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
            </div>
        </div>
    );
  }
  
  if (!isLoggedIn) {
    return (
        <div className="space-y-8">
            <PageHeader title="Notifications" description="View your account notifications." />
            <Alert variant="default" className="max-w-md mx-auto text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-primary" />
                <AlertTitle className="font-semibold">Login Required</AlertTitle>
                <AlertDescription>Please log in to view your notifications.</AlertDescription>
                 <Button asChild className="mt-4"><Link href="/login?redirect=/notifications">Login</Link></Button>
            </Alert>
        </div>
    )
  }


  return (
    <div className="space-y-8">
      <PageHeader title={t('notifications.title')} description={t('notifications.description')}>
        <div className="flex gap-2">
           {unreadCount > 0 && (
             <Button variant="outline" onClick={markAllAsRead} size="sm">
              <CheckCheck className="mr-2 h-4 w-4" /> {t('notifications.markAllAsRead')}
            </Button>
           )}
          {notifications.length > 0 && (
             <Button variant="destructive" onClick={clearAllNotifications} size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> {t('notifications.clearAll')}
            </Button>
          )}
        </div>
      </PageHeader>
      
      {notifications.length === 0 ? (
        <Card className="text-center py-16 shadow-sm">
          <CardHeader>
            <BellOff className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <CardTitle className="text-2xl text-muted-foreground">{t('notifications.noNotificationsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6">
              {t('notifications.noNotificationsDescription')}
            </CardDescription>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/">{t('notifications.exploreButton')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto">
              <TabsTrigger value="all"><ListFilter className="mr-2 h-4 w-4" />{t('notifications.allTab', { count: notifications.length })}</TabsTrigger>
              <TabsTrigger value="unread"><BellRing className="mr-2 h-4 w-4" />{t('notifications.unreadTab', { count: unreadCount })}</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6 space-y-3">
              {paginatedNotifications.map(notification => (
                <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={markAsRead}
                    onClear={clearNotification}
                />
              ))}
            </TabsContent>
            <TabsContent value="unread" className="mt-6 space-y-3">
              {paginatedNotifications.length > 0 ? paginatedNotifications.map(notification => (
                <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={markAsRead}
                    onClear={clearNotification}
                />
              )) : (
                <p className="text-center text-muted-foreground py-8">{t('notifications.noUnread')}</p>
              )}
            </TabsContent>
          </Tabs>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
              >
                {t('notifications.previousPage')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('notifications.pageIndicator', { currentPage: currentPage, totalPages: totalPages })}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
              >
                {t('notifications.nextPage')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
