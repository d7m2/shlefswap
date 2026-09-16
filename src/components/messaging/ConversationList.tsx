'use client';

import type { Conversation } from '@/types';
import { ConversationListItem } from './ConversationListItem';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserId: string;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
}: ConversationListProps) {
  const t = useTranslation();
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground h-full flex flex-col justify-center items-center">
        <p>Loading user...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground h-full flex flex-col justify-center items-center">
        <p>{t('messaging.noConversationsTitle')}</p>
        <p className="text-xs">{t('messaging.noConversationsDescription')}</p>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            isSelected={conversation.id === selectedConversationId}
            onSelect={() => onSelectConversation(conversation.id)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
