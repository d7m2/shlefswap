'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef, useCallback, useTransition } from 'react';
import { getConversationDetails } from '@/lib/firebase/utils';
import { sendMessageAction } from '@/app/actions'; // Make sure this is the correct path
import type { Conversation, Message } from '@/types';
import { Loader2, Send, AlertCircle, ArrowDown, MessageSquare, Check } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useActionState } from 'react'; // For handling form action state
import { type SendMessageState } from '@/app/actions'; // Import state type
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot, limit, startAfter, Timestamp, getDocs } from 'firebase/firestore';

const initialSendMessageState: SendMessageState = {
  message: '',
  success: false,
};

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const conversationId = params.conversationId as string;
  const { currentUser } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [lastVisibleMessageDoc, setLastVisibleMessageDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // useTransition for pending state of the action
  const [isSubmitting, startTransition] = useTransition();

  // useActionState for the send message form
  const [sendMessageFormState, dispatchSendMessage, isSendingPending] = useActionState(
    sendMessageAction,
    initialSendMessageState
  );
  const [newMessageContent, setNewMessageContent] = useState('');

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      // Show button if scrolled up more than one viewport height from the bottom
      setShowScrollToBottom(scrollHeight - scrollTop > clientHeight * 1.5);
      
      // Load more messages if scrolled to the top
      if (scrollTop === 0 && hasMoreMessages && !isLoadingMore && !isLoading) {
        loadMoreMessages();
      }
    }
  }, [hasMoreMessages, isLoadingMore, isLoading]); // Added dependencies

  useEffect(() => {
    if (!conversationId || !currentUser?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setInitialLoadComplete(false);

    let unsubscribeMessages: (() => void) | null = null;

    const setupConversationAndMessages = async () => {
      try {
        const fetchedConversation = await getConversationDetails(conversationId, currentUser.id);
        if (!fetchedConversation) {
          setError("Conversation not found or you don't have access.");
          toast({ title: "Error", description: "Conversation not found or access denied.", variant: "destructive" });
          router.push("/profile/messages");
          setIsLoading(false);
          return;
        }
        setConversation(fetchedConversation);

        // Firestore listener for messages
        const messagesQuery = query(
          collection(db, "conversations", conversationId, "messages"),
          orderBy("timestamp", "desc"), // Get newest first for initial view, then reverse for display
          limit(20) // Initial limit
        );

        unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
          const fetchedMessages: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedMessages.push({
              id: doc.id,
              ...data,
              timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Message);
          });
          
          setMessages(fetchedMessages.reverse()); // Reverse to display oldest first in this batch

          if (querySnapshot.docs.length > 0) {
            setLastVisibleMessageDoc(querySnapshot.docs[querySnapshot.docs.length - 1]); // Oldest in this batch for pagination
          }
          setHasMoreMessages(querySnapshot.docs.length >= 20);
          setInitialLoadComplete(true);
          setIsLoading(false);
          
          // Scroll to bottom after initial messages are loaded
          if (messagesEndRef.current) {
             messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          }

        }, (err) => {
          console.error("Error listening to messages:", err);
          setError("Failed to load messages in real-time.");
          toast({ title: "Real-time Error", description: "Could not update messages automatically.", variant: "destructive" });
          setIsLoading(false);
        });

      } catch (err: any) {
        console.error("Error setting up conversation and messages:", err);
        setError(err.message || "Failed to load conversation details.");
        toast({ title: "Error", description: err.message || "Failed to load conversation.", variant: "destructive" });
        setIsLoading(false);
      }
    };

    setupConversationAndMessages();

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [conversationId, currentUser?.id, router, toast]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore || !lastVisibleMessageDoc || !initialLoadComplete) return;
    setIsLoadingMore(true);
    try {
      // Use the getMessages function for pagination, ensuring it's compatible with Firestore cursors
      const olderMessagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("timestamp", "desc"),
        startAfter(lastVisibleMessageDoc),
        limit(20)
      );
      
      const querySnapshot = await getDocs(olderMessagesQuery); // Changed from getDocs to avoid conflicts
      const newMessages: Message[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        newMessages.push({ 
          id: doc.id, 
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Message);
      });

      setMessages(prevMessages => [...newMessages.reverse(), ...prevMessages]); // Prepend older messages
      
      if (querySnapshot.docs.length > 0) {
        setLastVisibleMessageDoc(querySnapshot.docs[querySnapshot.docs.length - 1]); // Oldest in the new batch
      }
      setHasMoreMessages(querySnapshot.docs.length >= 20);

    } catch (err: any) {
      console.error("Error loading more messages:", err);
      toast({ title: "Error", description: "Failed to load older messages.", variant: "destructive" });
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMoreMessages, isLoadingMore, lastVisibleMessageDoc, toast, initialLoadComplete]);

  useEffect(() => {
    // Scroll to bottom when messages change, but only if near the bottom already or initial load
    if (messages.length > 0 && !showScrollToBottom) {
      scrollToBottom('auto'); 
    }
  }, [messages, showScrollToBottom]);

  useEffect(() => {
    const chatDiv = chatContainerRef.current;
    if (chatDiv) {
      chatDiv.addEventListener('scroll', handleScroll);
      return () => chatDiv.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // Effect to handle form submission result
  useEffect(() => {
    if (sendMessageFormState.success && sendMessageFormState.newMessageId && currentUser) {
      // Optimistically add the new message to the state
      const optimisticMessage: Message = {
        id: sendMessageFormState.newMessageId, // Use the ID from the action response
        conversationId: conversationId,
        senderId: currentUser.id,
        senderUsername: currentUser.username || 'You', 
        content: newMessageContent, // Content from the input field before clearing
        timestamp: new Date().toISOString(), // Client-side timestamp, server will override
        isRead: false, // Assume unread initially
        // receiverId and receiverUsername are not strictly needed for display in the sender's own UI here
        // but if they were, they would need to be derived similar to how otherParticipant is.
      };
      
      // Add to local state. The listener will eventually sync, this provides immediate feedback.
      // To avoid duplicates if listener is fast, can add a check or rely on key prop for rendering
      setMessages(prevMessages => {
        // Avoid adding if already present (e.g., if listener was super fast)
        if (prevMessages.find(msg => msg.id === optimisticMessage.id)) {
          return prevMessages;
        }
        return [...prevMessages, optimisticMessage];
      });

      setNewMessageContent(''); 
      toast({ title: "Message Sent!", variant: "default"});
      scrollToBottom();
    } else if (!sendMessageFormState.success && sendMessageFormState.error) {
      toast({ title: "Send Error", description: sendMessageFormState.message || sendMessageFormState.error, variant: "destructive" });
    }
  }, [sendMessageFormState, toast, conversationId, currentUser, newMessageContent]);

  const handleFormSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    console.log('[ConversationPage] handleFormSubmit triggered.');
    console.log('[ConversationPage] Current user:', currentUser);
    console.log('[ConversationPage] Current conversationId:', conversationId);
    console.log('[ConversationPage] New message content:', newMessageContent);

    if (!newMessageContent.trim() || !currentUser || !currentUser.id || !currentUser.username || !conversationId) {
      console.error('[ConversationPage] Validation failed before dispatch:', {
        newMessageContent: newMessageContent.trim(),
        currentUserExists: !!currentUser,
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        conversationId,
      });
      toast({ title: "Error", description: "Cannot send message. Missing required information (user, conversation, or message content).", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('senderId', currentUser.id);
    formData.append('senderUsername', currentUser.username);
    formData.append('content', newMessageContent);
    
    console.log('[ConversationPage] FormData prepared:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    startTransition(() => {
      console.log('[ConversationPage] Dispatching sendMessageAction...');
      dispatchSendMessage(formData);
    });
  };

  if (isLoading && !initialLoadComplete) { // Show main loader only during initial load
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <PageHeader title="Error" description={error || "Could not load conversation details."} />
        <Button onClick={() => router.push('/profile/messages')} className="mt-4">Back to Messages</Button>
      </div>
    );
  }

  const otherParticipant = conversation.participantUsernames
    .map((username, index) => ({
      id: conversation.participantIds[index],
      username: username,
      profilePictureUrl: conversation.participantProfilePictures?.[index]
    }))
    .find(p => p.id !== currentUser?.id);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,4rem)-var(--profile-sidebar-width,0px)-1rem)]">
      <PageHeader 
        title={otherParticipant ? `Chat with ${otherParticipant.username}` : "Conversation"} 
        description={conversation.relatedListingTitle ? `Regarding: ${conversation.relatedListingTitle}` : undefined}
        className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm z-10 sticky top-0"
      />
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-slate-800 relative">
        {(isLoading && !initialLoadComplete) && (
            <div className="absolute inset-0 flex justify-center items-center bg-slate-100 dark:bg-slate-800/80 z-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        )}
        {isLoadingMore && (
            <div className="flex justify-center py-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        )}
        {!hasMoreMessages && messages.length > 0 && initialLoadComplete && (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-3 text-center">No older messages.</p>
        )}
         {messages.length === 0 && initialLoadComplete && !isLoading && (
          <div className="text-center text-slate-500 dark:text-slate-400 py-10">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No messages yet</p>
            <p className="text-xs">Start the conversation by sending a message below.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isSender = msg.senderId === currentUser?.id;
          const participantForAvatar = isSender ? currentUser : otherParticipant;
          return (
            <div key={msg.id} className={`flex items-end gap-2.5 ${isSender ? 'justify-end' : 'justify-start'}`}>
              {!isSender && (
                <Avatar className="h-8 w-8 self-end flex-shrink-0 shadow-sm">
                  <AvatarFallback className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs">
                    {participantForAvatar?.username?.substring(0,1).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div 
                className={`max-w-[70%] sm:max-w-[65%] md:max-w-[60%] p-3 rounded-xl shadow-md ${ 
                  isSender 
                  ? 'ml-auto bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-600'
                }`}
              >
                {!isSender && <p className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">{msg.senderUsername}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={`text-xs mt-1.5 flex items-center ${isSender ? 'text-blue-100/90 justify-end' : 'text-slate-500 dark:text-slate-400 justify-end'}`}>
                  <span>{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                  {isSender && (
                    <Check className="h-3.5 w-3.5 ml-1 opacity-80" />
                  )}
                </div>
              </div>
              {isSender && (
                 <Avatar className="h-8 w-8 self-end flex-shrink-0 shadow-sm">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {participantForAvatar?.username?.substring(0,1).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        {showScrollToBottom && (
          <Button 
            onClick={() => scrollToBottom('smooth')}
            variant="outline" 
            size="icon" 
            className="absolute bottom-20 right-4 rounded-full h-10 w-10 shadow-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 z-10 border border-slate-200 dark:border-slate-600 flex items-center justify-center"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>
      <form onSubmit={handleFormSubmit} className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 sticky bottom-0 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <Input
            type="text"
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            placeholder="Type your message..."
            disabled={isSendingPending || isSubmitting}
            className="flex-grow h-11 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-full py-2.5 px-4 text-sm"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isSendingPending && !isSubmitting && newMessageContent.trim()) {
                        handleFormSubmit(); 
                    }
                }
            }}
          />
          <Button type="submit" disabled={isSendingPending || isSubmitting || !newMessageContent.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 w-11 flex items-center justify-center flex-shrink-0">
            {(isSendingPending || isSubmitting) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </form>
    </div>
  );
} 
