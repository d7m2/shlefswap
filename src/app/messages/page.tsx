'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import type { Conversation, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, Timestamp, getDocs, serverTimestamp } from 'firebase/firestore';

function MessagesPageContent() {
  const { currentUser, isLoggedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      setIsLoadingConversations(true);
      const q = query(
        collection(db, "conversations"),
        where("participantIds", "array-contains", currentUser.id),
        orderBy("lastActivity", "desc")
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userConversations: Conversation[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          userConversations.push({
            id: doc.id,
            ...data,
            lastActivity: (data.lastActivity as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
            createdAt: (data.createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
            lastMessage: data.lastMessage ? {
                ...data.lastMessage,
                timestamp: (data.lastMessage.timestamp as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
            } : undefined,
            participantUnreadCount: data.participantUnreadCount || {},
          } as Conversation);
        });
        setConversations(userConversations);
        setIsLoadingConversations(false);
      }, (error) => {
        console.error("Error fetching conversations: ", error);
        setIsLoadingConversations(false);
      });

      return () => unsubscribe();
    } else if (mounted && !isLoggedIn) {
      setIsLoadingConversations(false);
      setConversations([]);
    }
  }, [currentUser?.id, isLoggedIn, mounted]);

  useEffect(() => {
    let unsubscribeMessages: (() => void) | null = null;
    if (selectedConversationId && currentUser?.id) {
      setIsLoadingMessages(true);
      const messagesQuery = query(
        collection(db, "conversations", selectedConversationId, "messages"),
        orderBy("timestamp", "asc")
      );

      unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
        const convMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          convMessages.push({
            id: doc.id,
            ...data,
            timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          } as Message);
        });
        setMessages(convMessages);
        setIsLoadingMessages(false);
      }, (error) => {
        console.error(`Error fetching messages for ${selectedConversationId}: `, error);
        setIsLoadingMessages(false);
      });

      const markMessagesAsRead = async () => {
        const conversationRef = doc(db, "conversations", selectedConversationId);
        const messagesToUpdateQuery = query(
          collection(db, "conversations", selectedConversationId, "messages"),
          where("isRead", "==", false),
          where("senderId", "!=", currentUser.id)
        );
        
        try {
          const batch = writeBatch(db);
          const snapshot = await getDocs(messagesToUpdateQuery);
          snapshot.forEach(messageDoc => {
            batch.update(doc(db, "conversations", selectedConversationId, "messages", messageDoc.id), { isRead: true });
          });
          
          const unreadCountUpdateField = `participantUnreadCount.${currentUser.id}`;
          batch.update(conversationRef, { [unreadCountUpdateField]: 0, lastActivity: serverTimestamp() });
          
          await batch.commit();
        } catch (error) {
          console.error("Error marking messages as read: ", error);
        }
      };

      markMessagesAsRead();

    } else {
      setMessages([]);
    }
    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
    }
  }, [selectedConversationId, currentUser?.id]);

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    router.replace(`${pathname}?conversationId=${conversationId}`, { scroll: false });
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    router.replace(pathname, { scroll: false });
  };

  const onMessageSent = (newMessage: Message) => {
    setMessages(prev => [...prev, newMessage]);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Messages" description="Log in to view and manage your conversations." />
        <Alert variant="default" className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-primary" />
          <AlertTitle className="font-semibold">Login Required</AlertTitle>
          <AlertDescription>Please log in to access your messages.</AlertDescription>
          <Button asChild className="mt-4"><Link href="/login?redirect=/messages">Login</Link></Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,4rem)-1rem)] bg-slate-100 dark:bg-slate-800">
      <PageHeader 
        title="My Messages" 
        description="View and manage your conversations." 
        className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm z-10 sticky top-0"
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-slate-200 dark:border-slate-700">
        <div className={cn(
          "shrink-0 basis-auto w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-800",
          selectedConversationId && "max-md:hidden"
        )}>
          {isLoadingConversations ? (
            <div className="p-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-slate-500 dark:text-slate-400 mt-2">Loading conversations...</p>
            </div>
          ) : conversations.length > 0 ? (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              currentUserId={currentUser?.id || ''}
            />
          ) : (
            <div className="p-6 text-center h-full flex flex-col justify-center items-center text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No Conversations Yet</h3>
              <p className="text-sm">
                Start a new conversation from a book listing or by making an offer.
              </p>
            </div>
          )}
        </div>

        <div className={cn(
          "flex flex-1 min-w-0 flex-col",
          !selectedConversationId && "max-md:hidden"
        )}>
          {selectedConversationId && currentUser ? (
            <ChatInterface
              conversationId={selectedConversationId}
              messages={messages}
              isLoading={isLoadingMessages}
              onMessageSent={onMessageSent}
              currentUserId={currentUser.id}
              conversationParticipants={conversations.find(c => c.id === selectedConversationId)?.participantUsernames || []}
              participantProfilePictures={conversations.find(c => c.id === selectedConversationId)?.participantProfilePictures?.map(p => p === null ? undefined : p)}
              conversations={conversations}
              onBack={handleBackToList}
            />
          ) : conversations.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Select a Conversation</h3>
              <p className="text-sm">
                Choose a conversation from the list to view messages.
              </p>
            </div>
          ) : null }
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <MessagesPageContent />
        </Suspense>
    );
}

