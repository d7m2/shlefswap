'use client';

import type { Conversation } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  currentUserId: string;
}

export function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
  currentUserId,
}: ConversationListItemProps) {
  const otherParticipantIndex = conversation.participantIds.findIndex(id => id !== currentUserId);
  const otherParticipantUsername = conversation.participantUsernames[otherParticipantIndex] || 'Unknown User';

  const lastMessageText = conversation.lastMessage?.content 
    ? (conversation.lastMessage.senderId === currentUserId ? "You: " : "") + conversation.lastMessage.content 
    : 'No messages yet';
  
  const lastMessageTime = conversation.lastMessage?.timestamp 
    ? formatDistanceToNowStrict(new Date(conversation.lastMessage.timestamp), { addSuffix: true }) 
    : '';

  const unreadCountForCurrentUser = conversation.participantUnreadCount?.[currentUserId] || 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 p-4 w-full text-left transition-colors duration-150 border-b border-slate-200 dark:border-slate-700 last:border-b-0',
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
        !isSelected && unreadCountForCurrentUser > 0 && 'bg-blue-50/70 dark:bg-blue-900/20 hover:bg-blue-100/70 dark:hover:bg-blue-800/30 font-medium'
      )}
      aria-current={isSelected ? 'page' : undefined}
    >
      <Avatar className="h-11 w-11 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
        <AvatarFallback className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm">
            {otherParticipantUsername.substring(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <h4 className={cn(
              "text-sm font-semibold truncate", 
              isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-100",
              !isSelected && unreadCountForCurrentUser > 0 && "text-blue-700 dark:text-blue-300"
            )}>
            {otherParticipantUsername}
          </h4>
          {lastMessageTime && (
            <span className={cn(
                "text-xs shrink-0 ml-2", 
                isSelected ? "text-blue-500 dark:text-blue-500" : "text-slate-500 dark:text-slate-400",
                !isSelected && unreadCountForCurrentUser > 0 && "text-blue-600 dark:text-blue-400"
            )}>{lastMessageTime}</span>
          )}
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className={cn(
              "text-xs truncate pr-2", 
              isSelected ? "text-blue-600/90 dark:text-blue-400/90" : "text-slate-500 dark:text-slate-400",
              !isSelected && unreadCountForCurrentUser > 0 && "text-slate-700 dark:text-slate-300 font-medium"
            )}>
            {lastMessageText}
          </p>
          {unreadCountForCurrentUser > 0 && (
            <Badge className="h-5 px-2 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600">
              {unreadCountForCurrentUser > 9 ? '9+' : unreadCountForCurrentUser}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
