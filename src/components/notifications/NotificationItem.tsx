
'use client';

import type { Notification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BellRing, 
  MessageSquare, 
  Tag, 
  CheckCircle, 
  ShoppingCart, 
  Info,
  Sparkles,
  XCircle, // Keep XCircle for clearing
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClear?: (id: string) => void;
  isDropdownItem?: boolean; // To slightly alter styles for dropdown
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'new_offer':
      return <Tag className="h-5 w-5 text-accent" />;
    case 'offer_accepted':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'offer_rejected':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'offer_cancelled':
      return <XCircle className="h-5 w-5 text-muted-foreground" />; // Keep consistent for cancellation
    case 'new_message':
      return <MessageSquare className="h-5 w-5 text-primary" />;
    case 'listing_sold':
      return <ShoppingCart className="h-5 w-5 text-purple-500" />;
    case 'swap_agreed':
        return <Sparkles className="h-5 w-5 text-yellow-500" />
    case 'feedback_received':
      return <BellRing className="h-5 w-5 text-blue-500" />;
    case 'system_update':
      return <Info className="h-5 w-5 text-orange-500" />;
    default:
      return <BellRing className="h-5 w-5 text-muted-foreground" />;
  }
};

export function NotificationItem({ notification, onMarkAsRead, onClear, isDropdownItem = false }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  const content = (
    <>
      <div className="shrink-0 self-start pt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-grow space-y-0.5">
        <p className={cn("font-semibold text-sm", isDropdownItem ? "text-popover-foreground" : "text-foreground")}>{notification.title}</p>
        <p className={cn("text-xs", isDropdownItem ? "text-popover-foreground/80" : "text-muted-foreground")}>{notification.message}</p>
        <p className={cn("text-xs", isDropdownItem ? "text-popover-foreground/60" : "text-muted-foreground/80")}>{timeAgo}</p>
      </div>
      {!isDropdownItem && ( // Only show these buttons if not in a dropdown
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          {!notification.isRead && onMarkAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="text-xs text-primary hover:bg-primary/10 h-6 px-2 py-1"
              aria-label="Mark as read"
            >
              Mark Read
            </Button>
          )}
          {onClear && (
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClear(notification.id);
                }}
                aria-label="Clear notification"
            >
                <XCircle className="h-3.5 w-3.5"/>
            </Button>
          )}
        </div>
      )}
    </>
  );

  const itemClasses = cn(
    "flex items-start gap-3 p-3 transition-colors duration-150",
    !notification.isRead && (isDropdownItem ? "bg-accent/10" : "bg-primary/5"),
    isDropdownItem ? "hover:bg-accent/20 rounded-md" : "border-b last:border-b-0 hover:bg-muted/30",
    notification.link ? "cursor-pointer" : ""
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className={itemClasses}>
        {content}
      </Link>
    );
  }

  return <div className={itemClasses}>{content}</div>;
}
