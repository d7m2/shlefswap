'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message, Conversation } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, ArrowLeft, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { sendMessageAction, type SendMessageState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useFormStatus } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ChatInterfaceProps {
  conversationId: string;
  messages: Message[];
  isLoading: boolean;
  onMessageSent: (newMessage: Message) => void;
  currentUserId: string;
  conversationParticipants: string[];
  participantProfilePictures?: (string | undefined)[];
  conversations: Conversation[];
  onBack?: () => void;
}

function SubmitMessageButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 w-11 flex items-center justify-center flex-shrink-0">
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send message</span>
        </Button>
    );
}

function renderMessageContent(content: string) {
  return content.split(/(\s+)/).map((token, index) => {
    if (/^\/[\w\-/]+$/.test(token)) {
      return (
        <Link key={index} href={token} className="underline hover:opacity-80">
          {token}
        </Link>
      );
    }
    if (/^https?:\/\/\S+$/.test(token)) {
      return (
        <a key={index} href={token} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
          {token}
        </a>
      );
    }
    return <span key={index}>{token}</span>;
  });
}


export function ChatInterface({
  conversationId,
  messages,
  isLoading,
  onMessageSent,
  currentUserId,
  conversationParticipants,
  conversations,
  onBack,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const initialState: SendMessageState = { message: '', success: false };

  const otherParticipantIndex = conversationParticipants.findIndex(username => username !== currentUser?.username);
  const otherParticipantUsername = conversationParticipants[otherParticipantIndex] || 'Chat Partner';


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversationId]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || !currentUser) return;

    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('content', trimmedInput);
    formData.append('senderId', currentUser.id);
    formData.append('senderUsername', currentUser.username);

    const targetConversation = conversations.find(c => c.id === conversationId);
    const receiverId = targetConversation?.participantIds.find(pid => pid !== currentUser.id);

    if (!receiverId) {
        toast({ title: "Error", description: "Could not determine message recipient.", variant: "destructive"});
        return;
    }
    formData.append('receiverId', receiverId);
    
    setInputValue('');

    const result = await sendMessageAction(initialState, formData);

    if (result.success && result.newMessageId) {
        const newMessage: Message = {
            id: result.newMessageId,
            conversationId: conversationId,
            senderId: currentUser.id,
            senderUsername: currentUser.username,
            receiverId: receiverId, 
            receiverUsername: otherParticipantUsername, 
            content: trimmedInput,
            timestamp: new Date().toISOString(), 
            isRead: false, 
        };
        onMessageSent(newMessage);
    } else {
        toast({ title: "Message Error", description: result.error || "Failed to send message.", variant: "destructive"});
        setInputValue(trimmedInput); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-800">
      {/* Chat Header */}
      <header className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm z-10 sticky top-0 flex items-center gap-3">
        {onBack && (
          <Button type="button" variant="ghost" size="icon" onClick={onBack} className="md:hidden shrink-0" aria-label="Back to conversations">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700 shadow-sm">
          <AvatarFallback className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm">
            {otherParticipantUsername.substring(0,1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-md text-slate-800 dark:text-slate-100 truncate">{otherParticipantUsername}</h3>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-3">
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="text-center text-slate-500 dark:text-slate-400 py-10">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No messages yet</p>
              <p className="text-xs">Start the conversation by sending a message below.</p>
            </div>
          )}
          {messages.map((msg) => {
            const isSender = msg.senderId === currentUserId;
            return (
            <div
              key={msg.id + '-' + msg.timestamp}
              className={cn(
                "flex items-end gap-2.5",
                isSender ? 'justify-end' : 'justify-start'
              )}
            >
              {!isSender && (
                <Avatar className="h-8 w-8 self-end flex-shrink-0 shadow-sm">
                   <AvatarFallback className="bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs">
                     {otherParticipantUsername.substring(0,1).toUpperCase()}
                   </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[70%] sm:max-w-[65%] md:max-w-[60%] p-3 rounded-xl shadow-md",
                  isSender
                    ? 'ml-auto bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-600'
                )}
              >
                {!isSender && <p className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">{msg.senderUsername}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{renderMessageContent(msg.content)}</p>
                <div className={cn(
                    'text-xs mt-1.5 flex items-center',
                    isSender ? 'text-blue-100/90 justify-end' : 'text-slate-500 dark:text-slate-400 justify-end'
                )}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    {isSender && (
                        <Check className="h-3.5 w-3.5 ml-1 opacity-80" />
                    )}
                </div>
              </div>
              {isSender && (
                <Avatar className="h-8 w-8 self-end flex-shrink-0 shadow-sm">
                   <AvatarFallback className="bg-blue-500 text-white text-xs">
                     {(currentUser?.username || 'Y').substring(0,1).toUpperCase()}
                   </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        </div>
      </ScrollArea>

      {/* Message Input Area */}
      <footer className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 sticky bottom-0 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex items-center w-full gap-2 sm:gap-3">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow h-11 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-full py-2.5 px-4 text-sm"
            autoComplete="off"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const trimmedInput = inputValue.trim();
                    if (trimmedInput && currentUser) {
                         handleSubmit(e as any);
                    }
                }
            }}
          />
          <SubmitMessageButton />
        </form>
      </footer>
    </div>
  );
}
