'use client';

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser } from '@/types';
import { auth, db, storage } from '@/lib/firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail,
  deleteUser as deleteFirebaseUser,
  updatePassword as updateFirebasePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CheckCircle, LogOut, UserPlus, Mail, Lock } from 'lucide-react';
import { isValidEmail, validatePasswordStrength, validateUsername } from '@/lib/authValidators';
import { buildLoginFallbackUser, buildNewRegisteredUser, isUsernameTaken, deleteStoredProfilePicture } from '@/lib/authProfile';
import {
  deleteAccountErrorMessage,
  loginErrorMessage,
  passwordResetErrorMessage,
  passwordUpdateErrorMessage,
  reauthenticateErrorMessage,
  registerErrorMessage,
} from '@/lib/authErrors';

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loadingAuth: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password?: string) => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<AppUser>, newProfilePictureFile?: File) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  deleteCurrentUserAccount: () => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  reauthenticateUser: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { toast } = useToast();

  const fetchAppUser = useCallback(async (uid: string): Promise<AppUser | null> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const memberSince = data.memberSince?.toDate ? data.memberSince.toDate().toISOString() : data.memberSince;
      return { ...data, id: uid, memberSince } as AppUser;
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const appUser = await fetchAppUser(user.uid);
        setCurrentUser(appUser);
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [fetchAppUser]);

  const isLoggedIn = !!firebaseUser && !!currentUser;

  const login = useCallback(async (email: string, password?: string) => {
    if (!password) {
      toast({ title: "Password Required", description: "Password is required for email login.", variant: "destructive" });
      throw new Error("Password Required");
    }

    if (!isValidEmail(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      throw new Error("Invalid Email Format");
    }

    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      let appUser = await fetchAppUser(fbUser.uid);

      if (!appUser) {
        console.warn(`User profile for UID ${fbUser.uid} (email: ${fbUser.email}) not found in Firestore. Attempting to create it.`);
        const newUserProfileOnLogin = buildLoginFallbackUser(fbUser, email);

        const userDocRef = doc(db, 'users', fbUser.uid);
        await setDoc(userDocRef, {
          ...newUserProfileOnLogin,
          memberSince: serverTimestamp(),
        });

        appUser = await fetchAppUser(fbUser.uid);

        if (appUser) {
          toast({
            title: 'Profile Created',
            description: `Welcome! Your Shelf Swap profile has been set up.`,
            icon: <UserPlus className="h-5 w-5 text-primary" />,
          });
        } else {
          toast({ title: "Profile Creation Failed", description: "Could not create your user profile after login. Please try again or contact support.", variant: "destructive" });
          await signOut(auth);
          throw new Error("Failed to create and fetch user profile after login.");
        }
      }

      setCurrentUser(appUser);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${appUser.username}!`,
        icon: <CheckCircle className="h-5 w-5 text-primary" />,
      });

    } catch (error: any) {
      console.error("Login error:", error);
      toast({ title: 'Login Failed', description: loginErrorMessage(error), variant: 'destructive' });
      throw error;
    } finally {
      setLoadingAuth(false);
    }
  }, [toast, fetchAppUser]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
        icon: <LogOut className="h-5 w-5" />,
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const register = useCallback(async (username: string, email: string, password?: string) => {
    if (!password) {
      toast({ title: "Password Required", description: "Password is required for registration.", variant: "destructive" });
      throw new Error("Password Required");
    }

    if (!isValidEmail(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      throw new Error("Invalid Email Format");
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      toast({ title: "Invalid Username", description: usernameValidation.message, variant: "destructive" });
      throw new Error(usernameValidation.message);
    }

    if (await isUsernameTaken(username)) {
      toast({ title: "Username Taken", description: "This username is already in use. Please choose another.", variant: "destructive" });
      throw new Error("Username already in use");
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      toast({ title: "Weak Password", description: passwordValidation.message, variant: "destructive" });
      throw new Error(passwordValidation.message);
    }

    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      await updateFirebaseProfile(fbUser, { displayName: username });

      const newUserProfile = buildNewRegisteredUser(fbUser, username, email);

      const userDocRef = doc(db, 'users', fbUser.uid);
      await setDoc(userDocRef, {
        ...newUserProfile,
        memberSince: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      const createdAppUser = await fetchAppUser(fbUser.uid);
      setCurrentUser(createdAppUser || newUserProfile);

      toast({
        title: 'Registration Successful',
        description: `Welcome to Shelf Swap, ${username}!`,
        icon: <UserPlus className="h-5 w-5 text-primary" />,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({ title: 'Registration Failed', description: registerErrorMessage(error), variant: 'destructive' });
      throw error;
    } finally {
      setLoadingAuth(false);
    }
  }, [toast, fetchAppUser]);

  const updateUserProfile = useCallback(async (userId: string, data: Partial<AppUser>, newProfilePictureFile?: File) => {
    if (!firebaseUser || userId !== firebaseUser.uid) {
      toast({ title: "Unauthorized", description: "You can only update your own profile.", variant: "destructive" });
      throw new Error("Unauthorized profile update attempt");
    }

    const userDocRef = doc(db, 'users', userId);

    if (data.username) {
      const usernameValidation = validateUsername(data.username);
      if (!usernameValidation.valid) {
        toast({ title: "Invalid Username", description: usernameValidation.message, variant: "destructive" });
        throw new Error(usernameValidation.message);
      }

      if (data.username !== currentUser?.username && await isUsernameTaken(data.username)) {
        toast({ title: "Username Taken", description: "This username is already in use. Please choose another.", variant: "destructive" });
        throw new Error("Username already in use");
      }
    }

    try {
      let profilePictureUrl = data.profilePictureUrl || currentUser?.profilePictureUrl;

      if (newProfilePictureFile) {
        const storage_ref = ref(storage, `profilePictures/${userId}/${newProfilePictureFile.name}`);
        await uploadBytes(storage_ref, newProfilePictureFile);
        profilePictureUrl = await getDownloadURL(storage_ref);

        if (currentUser?.profilePictureUrl) {
          await deleteStoredProfilePicture(currentUser.profilePictureUrl);
        }
      }

      if (data.username && data.username !== currentUser?.username) {
        await updateFirebaseProfile(firebaseUser, { displayName: data.username });
      }

      const updateData = {
        ...data,
        profilePictureUrl,
        updatedAt: serverTimestamp(),
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      await updateDoc(userDocRef, updateData);

      const updatedUser = await fetchAppUser(userId);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
          icon: <CheckCircle className="h-5 w-5 text-primary" />,
        });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: 'Update Failed',
        description: error.message || "Could not update your profile. Please try again.",
        variant: 'destructive'
      });
      throw error;
    }
  }, [firebaseUser, currentUser, toast, fetchAppUser]);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!isValidEmail(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      throw new Error("Invalid Email Format");
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for instructions to reset your password.',
        icon: <Mail className="h-5 w-5 text-primary" />,
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({ title: 'Password Reset Failed', description: passwordResetErrorMessage(error), variant: 'destructive' });
      throw error;
    }
  }, [toast]);

  const updateUserPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: "Not Logged In", description: "You must be logged in to change your password.", variant: "destructive" });
      throw new Error("User not logged in or missing email");
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      toast({ title: "Weak Password", description: passwordValidation.message, variant: "destructive" });
      throw new Error(passwordValidation.message);
    }

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      await updateFirebasePassword(firebaseUser, newPassword);

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully changed.',
        icon: <Lock className="h-5 w-5 text-primary" />,
      });
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ title: 'Password Update Failed', description: passwordUpdateErrorMessage(error), variant: 'destructive' });
      throw error;
    }
  }, [firebaseUser, toast]);

  const reauthenticateUser = useCallback(async (password: string): Promise<boolean> => {
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: "Not Logged In", description: "You must be logged in to perform this action.", variant: "destructive" });
      return false;
    }

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, credential);
      return true;
    } catch (error: any) {
      console.error("Reauthentication error:", error);
      toast({ title: 'Authentication Failed', description: reauthenticateErrorMessage(error), variant: 'destructive' });
      return false;
    }
  }, [firebaseUser, toast]);

  const deleteCurrentUserAccount = useCallback(async () => {
    if (!firebaseUser) {
      toast({ title: "Not Logged In", description: "No user is currently logged in.", variant: "destructive" });
      throw new Error("User not logged in");
    }
    try {
      const batch = writeBatch(db);

      const userDocRef = doc(db, "users", firebaseUser.uid);
      batch.delete(userDocRef);

      const userListingsQuery = query(collection(db, 'usedBookListings'), where('seller.id', '==', firebaseUser.uid));
      const userListingsSnapshot = await getDocs(userListingsQuery);
      userListingsSnapshot.forEach((listingDoc) => {
        batch.delete(listingDoc.ref);
      });

      const userOrdersQuery = query(collection(db, 'orders'), where('userId', '==', firebaseUser.uid));
      const userOrdersSnapshot = await getDocs(userOrdersQuery);
      userOrdersSnapshot.forEach((orderDoc) => {
        batch.delete(orderDoc.ref);
      });

      const userConversationsQuery = query(collection(db, 'conversations'), where('participantIds', 'array-contains', firebaseUser.uid));
      const userConversationsSnapshot = await getDocs(userConversationsQuery);
      userConversationsSnapshot.forEach((conversationDoc) => {
        batch.delete(conversationDoc.ref);
      });

      const userFavoritesQuery = query(collection(db, 'userFavorites'), where('userId', '==', firebaseUser.uid));
      const userFavoritesSnapshot = await getDocs(userFavoritesQuery);
      userFavoritesSnapshot.forEach((favoriteDoc) => {
        batch.delete(favoriteDoc.ref);
      });

      const userReviewsQuery = query(collection(db, 'reviews'), where('userId', '==', firebaseUser.uid));
      const userReviewsSnapshot = await getDocs(userReviewsQuery);
      userReviewsSnapshot.forEach((reviewDoc) => {
        batch.delete(reviewDoc.ref);
      });

      await batch.commit();

      if (currentUser?.profilePictureUrl) {
        await deleteStoredProfilePicture(currentUser.profilePictureUrl);
      }

      await deleteFirebaseUser(firebaseUser);

      toast({ title: "Account Deleted", description: "Your account and associated data have been permanently deleted." });
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({ title: "Deletion Failed", description: deleteAccountErrorMessage(error), variant: "destructive" });
      throw error;
    }
  }, [firebaseUser, currentUser, toast]);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      currentUser,
      firebaseUser,
      loadingAuth,
      login,
      logout,
      register,
      updateUserProfile,
      sendPasswordReset,
      deleteCurrentUserAccount,
      updateUserPassword,
      reauthenticateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};