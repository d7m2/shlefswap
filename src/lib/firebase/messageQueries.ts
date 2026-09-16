import { db } from './config';
import {
  collection, getDocs, query, orderBy, limit, startAfter, doc, getDoc,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Conversation, Message } from '@/types';
export async function getConversationDetails(conversationId: string, currentUserId: string): Promise<Conversation | null> {
  if (!conversationId || !currentUserId) {
    console.log("Conversation ID and Current User ID are required.");
    return null;
  }
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(conversationRef);

    if (docSnap.exists()) {
      const rawData = docSnap.data(); // Get raw data from Firestore

      // Ensure current user is part of the conversation
      if (!rawData.participantIds || !Array.isArray(rawData.participantIds) || !rawData.participantIds.includes(currentUserId)) {
        console.error(`User ${currentUserId} is not part of conversation ${conversationId}. Access denied.`);
        return null;
      }

      const safeToISOString = (field: any): string | undefined => {
        if (field && typeof field.toDate === 'function') { // Check for Firestore Timestamp
          return field.toDate().toISOString();
        }
        if (typeof field === 'string') { // Already an ISO string
          return field;
        }
        return undefined; // Or return a default like new Date().toISOString() if type requires string
      };

      const finalCreatedAt = safeToISOString(rawData.createdAt);
      const finalLastActivity = safeToISOString(rawData.lastActivity);
      
      let finalLastMessage: Message | undefined = undefined;
      if (rawData.lastMessage && typeof rawData.lastMessage === 'object') {
        const lastMessageTimestamp = safeToISOString(rawData.lastMessage.timestamp);
        // Message type requires timestamp to be a string.
        // If lastMessageTimestamp is undefined here, we must provide a valid string or not create finalLastMessage.
        if (lastMessageTimestamp) {
          finalLastMessage = {
            // Spread known fields of Message type from rawData.lastMessage
            id: rawData.lastMessage.id,
            conversationId: rawData.lastMessage.conversationId,
            senderId: rawData.lastMessage.senderId,
            senderUsername: rawData.lastMessage.senderUsername,
            receiverId: rawData.lastMessage.receiverId,
            receiverUsername: rawData.lastMessage.receiverUsername,
            content: rawData.lastMessage.content,
            isRead: rawData.lastMessage.isRead,
            timestamp: lastMessageTimestamp, // This is now guaranteed to be a string if finalLastMessage is formed
          } as Message; // Cast to Message to ensure all required fields are there or handled
        } else {
          // Optional: Handle if lastMessage object exists but timestamp is missing/invalid
          // For now, if timestamp can't be resolved to string, finalLastMessage remains undefined.
          // console.warn("Last message timestamp for conversation ${conversationId} is invalid or missing.");
        }
      }

      // Construct the final Conversation object
      const conversation: Conversation = {
        id: docSnap.id,
        participantIds: rawData.participantIds,
        participantUsernames: rawData.participantUsernames,
        participantProfilePictures: rawData.participantProfilePictures, // Optional in type
        relatedListingId: rawData.relatedListingId, // Optional in type
        relatedListingTitle: rawData.relatedListingTitle, // Optional in type
        participantUnreadCount: rawData.participantUnreadCount, // Optional in type
        createdAt: finalCreatedAt, // Optional in type (string | undefined)
        lastActivity: finalLastActivity, // Optional in type (string | undefined)
        lastMessage: finalLastMessage, // Optional in type (Message | undefined)
      };
      
      // Validate that participantIds is an array of strings (runtime check if needed)
      if (!Array.isArray(conversation.participantIds) || !conversation.participantIds.every(id => typeof id === 'string')) {
          console.error("Invalid participantIds in conversation data:", conversationId);
          // Handle error, maybe return null or throw
      }


      return conversation;
    } else {
      console.log(`Conversation with ID ${conversationId} not found.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching conversation details for ${conversationId}:`, error);
    // throw error; // Or return null
    return null;
  }
}
export async function getMessages(
  conversationId: string,
  count: number = 20,
  lastVisibleMessageDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ messages: Message[]; lastVisible?: QueryDocumentSnapshot<DocumentData>; hasMore: boolean }> {
  if (!conversationId) {
    console.error("Conversation ID is required to fetch messages.");
    return { messages: [], hasMore: false };
  }

  try {
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    let q = query(messagesRef, orderBy("timestamp", "desc"), limit(count));

    if (lastVisibleMessageDoc) {
      q = query(messagesRef, orderBy("timestamp", "desc"), startAfter(lastVisibleMessageDoc), limit(count));
    }

    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderUsername: data.senderUsername,
        content: data.content,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
        isRead: data.isRead,
      } as Message);
    });

    // Reverse the messages to show oldest first for typical chat display (newest at bottom)
    // However, for infinite scroll loading older messages, you might append to the top.
    // For now, returning newest first as per query (desc), usually handled in UI.

    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === count;

    return { messages: messages.reverse(), lastVisible: newLastVisible, hasMore }; // Reversed for typical UI render

  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    return { messages: [], hasMore: false };
  }
}
