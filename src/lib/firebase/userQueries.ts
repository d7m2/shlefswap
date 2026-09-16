import { db } from './config';
import { collection, query, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import type { User } from '@/types';
export async function getUserWishlistCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const wishlistQuery = query(collection(db, 'userFavorites'), where("userId", "==", userId));
    const snapshot = await getCountFromServer(wishlistQuery);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching user wishlist count:", error);
    return 0;
  }
}
export async function getUserById(userId: string): Promise<User | null> {
  if (!userId) {
    console.log("User ID not provided to getUserById.");
    return null;
  }
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      // Combine document data with its ID
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      console.log(`No user found with ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching user by ID (${userId}):`, error);
    return null;
  }
}
