'use server';

import { revalidatePath } from 'next/cache';
import type { Book } from '@/types';
import { db } from '@/lib/firebase/config';
import {
  collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch,
} from 'firebase/firestore';
// --- Wishlist Actions ---

export type WishlistActionResult = {
  success: boolean;
  message: string;
  error?: string;
};

export async function addToWishlistAction(
  userId: string, 
  bookId: string, 
  bookData: Omit<Book, 'id'> // Pass necessary book data to store
): Promise<WishlistActionResult> {
  if (!userId || !bookId) {
    return { success: false, message: "User ID and Book ID are required.", error: "Missing parameters" };
  }
  try {
    // Check if already in wishlist to prevent duplicates (optional, depends on desired behavior)
    const q = query(collection(db, "userFavorites"), where("userId", "==", userId), where("bookId", "==", bookId));
    const existing = await getDocs(q);
    if (!existing.empty) {
      return { success: true, message: "Item already in wishlist." }; // Or false if considered an error
    }

    await addDoc(collection(db, "userFavorites"), {
      userId,
      bookId,
      ...bookData, // Store denormalized book data for easier display
      addedAt: serverTimestamp(),
    });

    revalidatePath('/profile');
    revalidatePath('/profile/wishlist');
    revalidatePath(`/marketplace/book/${bookId}`); // Revalidate book page if it shows wishlist status

    return { success: true, message: "Added to wishlist successfully." };
  } catch (error: any) {
    console.error("Error adding to wishlist:", error);
    return { success: false, message: "Failed to add to wishlist.", error: error.message };
  }
}

export async function removeFromWishlistAction(userId: string, bookId: string): Promise<WishlistActionResult> {
  if (!userId || !bookId) {
    return { success: false, message: "User ID and Book ID are required.", error: "Missing parameters" };
  }
  try {
    const q = query(collection(db, "userFavorites"), where("userId", "==", userId), where("bookId", "==", bookId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, message: "Item not found in wishlist.", error: "Not found" };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });
    await batch.commit();

    revalidatePath('/profile');
    revalidatePath('/profile/wishlist');
    revalidatePath(`/marketplace/book/${bookId}`);

    return { success: true, message: "Removed from wishlist successfully." };
  } catch (error: any) {
    console.error("Error removing from wishlist:", error);
    return { success: false, message: "Failed to remove from wishlist.", error: error.message };
  }
}
