'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import type { Conversation, Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from 'firebase/firestore';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    } else {
      setSelectedConversationId(null); 
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      setIsLoadingConversations(false);
      setConversations([]);
      return;
    }

    setIsLoadingConversations(true);
    setError(null);

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.id),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(conversationsQuery, async (querySnapshot) => {
      try {
        const userConversations: Conversation[] = [];
        for (const docSnap of querySnapshot.docs) {
          const convData = docSnap.data() as Omit<Conversation, 'id' | 'participantProfiles'>;
          
          const participantProfiles: User[] = [];
          if (convData.participantIds) {
            for (const pId of convData.participantIds) {
                const userDocRef = doc(db, 'users', pId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  participantProfiles.push({
                    id: userDocSnap.id,
                    username: userData.username || 'Unknown User',
                    profilePictureUrl: userData.profilePictureUrl || undefined,
                    email: userData.email || '',
                  } as User);
                }
            }
          }

          let lastMessageTimestamp: string | undefined = undefined;
          if (convData.lastMessage && convData.lastMessage.timestamp) {
            const ts = convData.lastMessage.timestamp;
            if (typeof ts === 'object' && ts !== null && typeof (ts as any).toDate === 'function') {
              lastMessageTimestamp = (ts as any).toDate().toISOString();
            } else if (typeof ts === 'string') {
              lastMessageTimestamp = ts;
            } else if (typeof ts === 'number') {
              lastMessageTimestamp = new Date(ts).toISOString();
            } else {
              lastMessageTimestamp = String(ts);
            }
          }

          userConversations.push({
            ...convData,
            id: docSnap.id,
            lastMessage: convData.lastMessage ? {
                ...convData.lastMessage,
                timestamp: lastMessageTimestamp || new Date().toISOString(),
            } : undefined,
            participantProfiles,
          });
        }
        setConversations(userConversations);

        if (!searchParams.get('conversationId') && userConversations.length > 0 && !selectedConversationId) {
          // Optionally, select the first one if you want to auto-select.
          // For now, let's not auto-select to allow the placeholder "Select a Conversation" to show.
          // handleSelectConversation(userConversations[0].id); 
        }

      } catch (err) {
        console.error("Error fetching conversations: ", err);
        setError("Failed to load conversations. Please try again.");
      }
      setIsLoadingConversations(false);
    }, (err) => {
      console.error("Error in conversations snapshot listener: ", err);
      setError("Connection error while fetching conversations.");
      setIsLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [currentUser, isLoggedIn, searchParams]);

  useEffect(() => {
    if (!selectedConversationId || !currentUser) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    setError(null);

    const messagesQuery = query(
      collection(db, 'conversations', selectedConversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      try {
        const convMessages: Message[] = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          let messageTimestamp: string;
          const ts = data.timestamp;

          if (typeof ts === 'object' && ts !== null && typeof (ts as any).toDate === 'function') {
            messageTimestamp = (ts as any).toDate().toISOString();
          } else if (typeof ts === 'string') {
            messageTimestamp = ts;
          } else if (typeof ts === 'number') {
            messageTimestamp = new Date(ts).toISOString();
          } else {
            messageTimestamp = String(ts);
          }

          return {
            id: docSnap.id,
            ...data,
            timestamp: messageTimestamp,
          } as Message;
        });
        setMessages(convMessages);
      } catch (err) {
        console.error(`Error fetching messages for ${selectedConversationId}: `, err);
        setError("Failed to load messages. Please try again.");
      }
      setIsLoadingMessages(false);
    }, (err) => {
      console.error(`Error in messages snapshot listener for ${selectedConversationId}: `, err);
      setError("Connection error while fetching messages.");
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedConversationId, currentUser]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    router.replace(`${pathname}?conversationId=${conversationId}`, { scroll: false });
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    router.replace(pathname, { scroll: false });
  };

  const onMessageSent = (newMessage: Message) => {
    setMessages(prev => {
      const existing = prev.find(m => m.id === newMessage.id);
      if (existing) return prev;
      return [...prev, newMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });
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
          <Button asChild className="mt-4"><Link href="/login?redirect=/profile/messages">Login</Link></Button>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Messages" description="View and manage your conversations." />
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertTriangle className="h-6 w-6" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100svh-var(--header-height,4rem)-1rem)] min-h-[480px] bg-slate-100 dark:bg-slate-800">
      <PageHeader title="My Messages" description="View and manage your conversations." className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm z-10 sticky top-0" />

      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-slate-200 dark:border-slate-700">
        <div className={cn(
          "shrink-0 basis-auto w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-800",
          selectedConversationId && "max-md:hidden"
        )}>
          {isLoadingConversations ? (
            <div className="p-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Loading conversations...</p>
            </div>
          ) : conversations.length > 0 ? (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              currentUserId={currentUser!.id}
            />
          ) : (
            <div className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-primary">No Conversations Yet</h3>
              <p className="text-sm text-muted-foreground">
                Start a new conversation from a book listing or by making an offer.
              </p>
            </div>
          )}
        </div>

        <div className={cn(
          "flex flex-1 min-w-0 flex-col",
          !selectedConversationId && "max-md:hidden"
        )}>
          {selectedConversationId ? (
            <ChatInterface
              conversationId={selectedConversationId}
              messages={messages}
              isLoading={isLoadingMessages}
              onMessageSent={onMessageSent}
              currentUserId={currentUser!.id}
              conversationParticipants={conversations.find(c=>c.id === selectedConversationId)?.participantProfiles?.map((p: User) => p.username) || []}
              participantProfilePictures={conversations.find(c=>c.id === selectedConversationId)?.participantProfiles?.map((p: User) => p.profilePictureUrl)}
              conversations={conversations}
              onBack={handleBackToList}
            />
          ) : conversations.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground">Select a Conversation</h3>
              <p className="text-sm text-muted-foreground">
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