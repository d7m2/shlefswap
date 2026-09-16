import type { User as AppUser } from '@/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';

export function buildLoginFallbackUser(fbUser: FirebaseUser, email: string): AppUser {
  const newUsername = fbUser.displayName || email.split('@')[0];
  return {
    id: fbUser.uid,
    username: newUsername,
    email: fbUser.email || email,
    profilePictureUrl: `https://picsum.photos/200/200?random=${fbUser.uid}`,
    memberSince: new Date().toISOString(),
    p2pRating: 0,
    p2pTransactionCount: 0,
    bio: `Welcome to Shelf Swap! Profile created on login.`,
  };
}

export function buildNewRegisteredUser(fbUser: FirebaseUser, username: string, email: string): AppUser {
  return {
    id: fbUser.uid,
    username,
    email: fbUser.email || email,
    profilePictureUrl: `https://picsum.photos/200/200?random=${fbUser.uid}`,
    memberSince: new Date().toISOString(),
    p2pRating: 0,
    p2pTransactionCount: 0,
    bio: `Book lover and new member of Shelf Swap!`,
    favoriteGenres: [],
    lastLogin: new Date().toISOString(),
    accountLevel: 'standard',
    emailVerified: fbUser.emailVerified,
  };
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  try {
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
    const usernameQuerySnapshot = await getDocs(usernameQuery);
    return !usernameQuerySnapshot.empty;
  } catch (error) {
    console.warn("Error checking username uniqueness:", error);
    return false;
  }
}

export async function deleteStoredProfilePicture(profilePictureUrl: string): Promise<void> {
  if (!profilePictureUrl.includes('picsum.photos') && profilePictureUrl.startsWith('https://firebasestorage.googleapis.com')) {
    try {
      const profilePicRef = ref(storage, profilePictureUrl);
      await deleteObject(profilePicRef);
    } catch (storageError) {
      const code = (storageError as { code?: string }).code;
      if (code !== 'storage/object-not-found') {
        console.warn("Could not delete profile picture:", storageError);
      }
    }
  }
}