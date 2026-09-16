'use server';

import { revalidatePath } from 'next/cache';
import { SendMessageSchema } from '@/lib/schemas';
import type { Conversation, Message, User } from '@/types';
import { db } from '@/lib/firebase/config';
import {
  collection, addDoc, serverTimestamp, doc, updateDoc, getDoc,
  query, where, getDocs,
} from 'firebase/firestore';
// --- Messaging Actions ---
export type SendMessageState = {
    message: string;
    success: boolean;
    error?: string;
    newMessageId?: string; 
};

export async function sendMessageAction(prevState: SendMessageState, formData: FormData): Promise<SendMessageState> {
    const validatedFields = SendMessageSchema.safeParse({
        conversationId: formData.get('conversationId'),
        content: formData.get('content'),
        senderId: formData.get('senderId'),
        senderUsername: formData.get('senderUsername'),
    });

    if (!validatedFields.success) {
        console.log("Validation errors in sendMessageAction:", validatedFields.error.flatten());
        return {
            message: "Invalid message data. Please check your input.",
            success: false,
            error: JSON.stringify(validatedFields.error.flatten().fieldErrors) || "Validation failed",
        };
    }

    const { conversationId, content, senderId, senderUsername } = validatedFields.data;

    try {
        const conversationRef = doc(db, "conversations", conversationId);
        const conversationSnap = await getDoc(conversationRef);

        if (!conversationSnap.exists()) {
            return { message: "Conversation not found. Cannot send message.", success: false, error: "Conversation not found." };
        }

        const conversationData = conversationSnap.data() as Conversation;
        if (!conversationData.participantIds.includes(senderId)) {
            return { message: "You are not a participant of this conversation.", success: false, error: "Access denied. Sender not in conversation." };
        }

        const newMessageData: Omit<Message, 'id'> = {
            conversationId,
            senderId,
            senderUsername,
            content,
            timestamp: serverTimestamp() as any,
            isRead: false,
        };

        const messagesCollectionRef = collection(db, "conversations", conversationId, "messages");
        const newMessageDocRef = await addDoc(messagesCollectionRef, newMessageData);
        
        const lastMessageSummary: Partial<Message> = {
            id: newMessageDocRef.id,
            senderId,
            senderUsername,
            content: content.length > 100 ? content.substring(0, 97) + "..." : content,
            timestamp: newMessageData.timestamp,
        };

        await updateDoc(conversationRef, {
            lastMessage: lastMessageSummary,
            lastActivity: serverTimestamp(),
        });

        revalidatePath(`/profile/messages/${conversationId}`);
        revalidatePath('/profile/messages');

        return { 
            message: "Message sent successfully!", 
            success: true, 
            newMessageId: newMessageDocRef.id 
        };

    } catch (error: any) {
        console.error("Error in sendMessageAction:", error);
        return { 
            message: "Failed to send message due to a server error.", 
            success: false, 
            error: error.message || "An unexpected server error occurred."
        };
    }
}

export type StartConversationState = {
    message: string;
    success: boolean;
    error?: string;
    conversationId?: string;
};

export async function startConversationAction(
    targetUserId: string,
    currentUserIdFromClient: string, 
    currentUserUsernameFromClient: string, 
    targetUserUsername: string, // Added this to ensure we have target's username
    targetUserProfilePic?: string,
    currentUserProfilePicFromClient?: string,
    relatedListingId?: string,
    relatedListingTitle?: string,
): Promise<StartConversationState> {
    
    if (!currentUserIdFromClient || !currentUserUsernameFromClient) { 
      return { message: 'User not authenticated or user ID/username mismatch.', success: false, error: 'Authentication required.' };
    }

    if (currentUserIdFromClient === targetUserId) { 
        return { message: 'Cannot start a conversation with yourself.', success: false, error: 'Self-chat not allowed.' };
    }

    try {
      const sortedParticipantIds = [currentUserIdFromClient, targetUserId].sort();
      let existingConversationId: string | null = null;
      let needsParticipantIdsUpdate = false;

      // Query 1: Check for conversation with sorted participant IDs
      const qSorted = query(
        collection(db, 'conversations'), 
        where('participantIds', '==', sortedParticipantIds)
      );
      let querySnapshot = await getDocs(qSorted);

      if (!querySnapshot.empty) {
        existingConversationId = querySnapshot.docs[0].id;
      } else {
        // If not found with sorted IDs, check for the other permutation (unsorted in DB)
        // This is only necessary if user IDs are different (which they should be for a conversation)
        if (currentUserIdFromClient !== targetUserId) {
          const reversedParticipantIds = [sortedParticipantIds[1], sortedParticipantIds[0]];
          // Ensure we are not querying with the same array again if somehow ids were identical (defensive)
          if (sortedParticipantIds[0] !== reversedParticipantIds[0] || sortedParticipantIds[1] !== reversedParticipantIds[1]) {
            const qReversed = query(
              collection(db, 'conversations'),
              where('participantIds', '==', reversedParticipantIds)
            );
            const reversedQuerySnapshot = await getDocs(qReversed);
            if (!reversedQuerySnapshot.empty) {
              existingConversationId = reversedQuerySnapshot.docs[0].id;
              // Mark that this found conversation needs its participantIds to be sorted
              needsParticipantIdsUpdate = true; 
            }
          }
        }
      }

      if (existingConversationId) {
        // Conversation already exists
        if (needsParticipantIdsUpdate) {
          // Self-heal: Update the participantIds to be sorted
          try {
            await updateDoc(doc(db, 'conversations', existingConversationId), {
              participantIds: sortedParticipantIds
            });
            console.log(`Self-healed conversation ${existingConversationId}: updated participantIds to be sorted.`);
          } catch (updateError) {
            console.error(`Error self-healing participantIds for conversation ${existingConversationId}:`, updateError);
            // Proceed anyway, but log the error. The main goal is to return the conversationId.
          }
        }
        return { 
          message: "Conversation already exists.", 
          success: true, 
          conversationId: existingConversationId 
        };
      }
      
      // If no existing conversation found (neither sorted nor reversed), create a new one.
      // Ensure the new conversation uses sortedParticipantIds.
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      const targetUserData = targetUserDoc.exists() ? targetUserDoc.data() as User : null;


      const newConversationPayload: Omit<Conversation, 'id' | 'lastMessage'> = {
        participantIds: sortedParticipantIds, // CRITICAL: Use sorted IDs for new conversations
        participantUsernames: sortedParticipantIds.map(id => 
            id === currentUserIdFromClient 
            ? currentUserUsernameFromClient 
            : (targetUserData?.username || targetUserUsername)
        ), 
        participantProfilePictures: sortedParticipantIds.map(id => 
            id === currentUserIdFromClient 
            ? (currentUserProfilePicFromClient || null) 
            : (targetUserData?.profilePictureUrl || targetUserProfilePic || null)
        ), 
        lastActivity: serverTimestamp(),
        relatedListingId: relatedListingId || null, 
        relatedListingTitle: relatedListingTitle || null,
        createdAt: serverTimestamp(),
        participantUnreadCount: { 
          [currentUserIdFromClient]: 0,
          [targetUserId]: 0,
        }
      };

      // @ts-ignore Firestore types might not perfectly align with Conversation omitting lastMessage
      const conversationDocRef = await addDoc(collection(db, 'conversations'), newConversationPayload);
      
      revalidatePath('/profile/messages');
      return { message: "Conversation started successfully.", success: true, conversationId: conversationDocRef.id };

    } catch (error: any) {
      console.error("Error starting conversation: ", error);
      return { message: 'Failed to start conversation.', success: false, error: error.message || 'Server error.' };
    }
}
