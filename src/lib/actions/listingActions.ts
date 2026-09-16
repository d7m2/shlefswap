'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { CreateListingFormSchema, UpdateListingFormSchema } from '@/lib/schemas';
import type { User, UsedBookListing } from '@/types';
import { db, storage } from '@/lib/firebase/config';
import {
  collection, addDoc, serverTimestamp, doc, updateDoc, getDoc,
  writeBatch, setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
// Create Listing Action
export type CreateListingFormState = {
  message: string;
  errors?: Partial<Record<keyof z.infer<typeof CreateListingFormSchema>, string[]>> & { _form?: string[] };
  success: boolean;
  listingId?: string;
};

export async function createListingAction(
  prevState: CreateListingFormState,
  formData: FormData
): Promise<CreateListingFormState> {
  console.log("CREATE LISTING ACTION STARTED");

  const userIdFromClient = formData.get('userIdFromClient') as string | null;
  const usernameFromClient = formData.get('usernameFromClient') as string | null; // For fallback
  const profilePictureUrlFromClient = formData.get('profilePictureUrlFromClient') as string | null;


  if (!userIdFromClient) {
    console.error("User not authenticated or user ID is missing");
    return {
      message: 'User not authenticated or user ID is missing. Please log in to create a listing.',
      errors: { _form: ['Authentication required. User ID not provided.'] },
      success: false,
    };
  }

  console.log("Fetching user data for", userIdFromClient);
  let sellerDataForListing: User;
  try {
    const userDocRef = doc(db, 'users', userIdFromClient);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      console.error("User profile not found for ID:", userIdFromClient);
      return {
        message: 'User profile not found. Cannot create listing.',
        errors: { _form: [`User profile not found for ID: ${userIdFromClient}.`] },
        success: false,
      };
    }
    const dbUserData = userDocSnap.data();
    sellerDataForListing = {
      id: userIdFromClient,
      username: dbUserData.username || usernameFromClient || 'Unknown User',
      email: dbUserData.email || '', 
      profilePictureUrl: dbUserData.profilePictureUrl || profilePictureUrlFromClient,
      p2pRating: dbUserData.p2pRating || 0,
      p2pTransactionCount: dbUserData.p2pTransactionCount || 0,
      memberSince: dbUserData.memberSince?.toDate ? dbUserData.memberSince.toDate().toISOString() : (dbUserData.memberSince || new Date().toISOString()),
      bio: dbUserData.bio || '',
    };
    console.log("User data fetched successfully");
  } catch (fetchError: any) {
    console.error("Error fetching user details for listing:", fetchError);
    return {
      message: 'Failed to fetch user details for listing. ' + fetchError.message,
      errors: { _form: ['Failed to fetch user details.'] },
      success: false,
    };
  }


  const photoEntries = formData.getAll('photos'); 
  const filesOnly = photoEntries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0
  );
  const photosToValidate = filesOnly.length > 0 ? filesOnly[0] : undefined;
  
  const conditionValue = formData.get('condition');
  const parsedCondition = (conditionValue === null || conditionValue === "" || conditionValue === "undefined") ? undefined : conditionValue as z.infer<typeof CreateListingFormSchema>['condition'];

  const listingTypeValue = formData.get('listingType');
  const parsedListingType = (listingTypeValue === null || listingTypeValue === "" || listingTypeValue === "undefined") ? undefined : listingTypeValue as z.infer<typeof CreateListingFormSchema>['listingType'];

  const pageCountValue = formData.get('pageCount') || undefined;

  const validatedFields = CreateListingFormSchema.safeParse({
    isbn: formData.get('isbn') || undefined,
    title: formData.get('title'),
    author: formData.get('author'),
    pageCount: pageCountValue,
    condition: parsedCondition,
    description: formData.get('description'),
    photos: photosToValidate, 
    listingType: parsedListingType,
    price: formData.get('price') ? String(formData.get('price')) : undefined, 
    swapPreferences: formData.get('swapPreferences') || undefined,
    preferences: formData.get('preferences') || undefined,
  });

  if (!validatedFields.success) {
    const flatErrors = validatedFields.error.flatten();
    const combinedErrors: CreateListingFormState['errors'] = {
        ...flatErrors.fieldErrors,
    };
    if (flatErrors.formErrors.length > 0) {
        combinedErrors._form = flatErrors.formErrors;
    }
    return {
      message: 'Failed to create listing. Please check the errors below.',
      errors: combinedErrors,
      success: false,
    };
  }
  
  const { listingType, price, swapPreferences, preferences, title, author, condition, description, photos, isbn, pageCount } = validatedFields.data;
  let uploadedPhotoUrl: string | undefined = undefined;
  let photoStoragePath: string | null = null;
  const fetchedCoverImageUrlFromForm = formData.get('fetchedCoverImageUrl') as string | null;

  try {
    if (photos && photos instanceof File) {
        try {
          const photoName = `${Date.now()}-${photos.name.replace(/\s+/g, '_')}`;
          photoStoragePath = `bookListings/${userIdFromClient}/${photoName}`;
          console.log(`Attempting to upload photo: ${photoName} to path: ${photoStoragePath} for user: ${userIdFromClient}`);
          const storageRefValue = ref(storage, photoStoragePath); // Renamed to avoid conflict if 'storageRef' is used inside loop
          
          let uploadAttempt = 0;
          const maxAttempts = 3;
          let uploadSuccessful = false;
          let lastError;
          
          while (uploadAttempt < maxAttempts && !uploadSuccessful) {
            try {
              uploadAttempt++;
              console.log(`Upload attempt ${uploadAttempt} for ${photoName}`);
              await uploadBytes(storageRefValue, photos);
              uploadSuccessful = true;
            } catch (uploadError: any) {
              lastError = uploadError;
              console.error(`Upload attempt ${uploadAttempt} failed:`, uploadError.message);
              if (uploadAttempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          
          if (!uploadSuccessful) {
            throw lastError || new Error('Upload failed after multiple attempts');
          }
          
          uploadedPhotoUrl = await getDownloadURL(storageRefValue);
          console.log(`Successfully uploaded photo: ${photoName}, URL: ${uploadedPhotoUrl}, Path: ${photoStoragePath}`);
        } catch (photoError: any) {
          console.error(`Error uploading photo:`, photoError);
          throw new Error(`Failed to upload photo: ${photoError.message}`);
        }
    } else if (fetchedCoverImageUrlFromForm) {
        console.log(`Using directly fetched cover image URL: ${fetchedCoverImageUrlFromForm}`);
        uploadedPhotoUrl = fetchedCoverImageUrlFromForm;
        photoStoragePath = null; 
    }
    
    // Build listing data
    const listingDataForFirestore: Omit<UsedBookListing, 'listingId' | 'listedDate' | 'id' | 'salePrice' | 'swapPreferences' | 'pageCount' | 'photoPath'> & {
        salePrice?: number;
        swapPreferences?: string;
        preferences?: string;
        pageCount?: number;
        photoPath?: string;
    } = {
      title,
      author,
      condition,
      description,
      listingType,
      isbn: isbn || undefined,
      coverImageUrl: uploadedPhotoUrl || `https://picsum.photos/300/450?random=${Date.now()}`,
      photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
      genres: ['User Listed'],
      averageRating: 0,
      language: 'English',
      publisher: '',
      publicationDate: '',
      aiHint: 'user book',
      sellerId: userIdFromClient, 
      seller: sellerDataForListing, 
      sellerUsername: sellerDataForListing.username, 
      sellerProfilePictureUrl: sellerDataForListing.profilePictureUrl, 
      status: 'available', 
      availability: 'available', 
    };

    if (listingType.split(',').includes('Sell')) {
      if (price !== undefined && price !== null && price !== '') {
        const numericPrice = parseFloat(price);
        if (!isNaN(numericPrice)) {
          listingDataForFirestore.salePrice = numericPrice;
        }
      }
    }

    if (preferences !== undefined && preferences !== null && preferences.trim() !== '') {
      listingDataForFirestore.preferences = preferences;
    }

    if (photoStoragePath) {
      listingDataForFirestore.photoPath = photoStoragePath;
    }
    if (listingType.split(',').includes('Swap') && swapPreferences !== undefined && swapPreferences !== null && swapPreferences !== '') {
      listingDataForFirestore.swapPreferences = swapPreferences;
    }
    if (pageCount !== undefined && pageCount !== null && pageCount !== '') {
        const numericPageCount = parseInt(pageCount, 10);
        if(!isNaN(numericPageCount)) {
            listingDataForFirestore.pageCount = numericPageCount;
        }
    }
    
    // @ts-ignore serverTimestamp will be handled by Firestore
    const docRef = await addDoc(collection(db, 'usedBookListings'), {
      ...listingDataForFirestore,
      listedDate: serverTimestamp(), 
    });
    
    const userListingRef = doc(db, `users/${userIdFromClient}/myListings/${docRef.id}`);
    await setDoc(userListingRef, {
        listingId: docRef.id,
        title: title,
        listedDate: serverTimestamp(),
        coverImageUrl: listingDataForFirestore.coverImageUrl,
        listingType: listingType,
        status: 'Available' // also track status in user's own list for quick view
    });


    revalidatePath('/marketplace'); 
    revalidatePath('/sell'); 
    revalidatePath(`/profile/listings`); 
    revalidatePath(`/profile/${userIdFromClient}/listings`);
    revalidatePath('/'); // Revalidate home page as it might show recent listings
    revalidatePath('/profile'); // Revalidate the profile dashboard

    console.log("Revalidation paths called including /profile for createListingAction");

    return { 
        message: `Successfully created listing for "${validatedFields.data.title}"!`, 
        success: true, 
        errors: {},
        listingId: docRef.id 
    };

  } catch (error: any) {
    console.error("Error creating listing in Firebase: ", error);
    if (photoStoragePath) { 
        try {
            const photoRefToDelete = ref(storage, photoStoragePath);
            await deleteObject(photoRefToDelete);
            console.log(`Cleaned up photo from storage: ${photoStoragePath}`);
        } catch (cleanupError) {
            console.warn(`Failed to cleanup photo ${photoStoragePath} from storage:`, cleanupError);
        }
    }
    return {
      message: 'Failed to create listing due to a server error. Please try again. ' + error.message,
      errors: { _form: [error.message || 'Server error'] },
      success: false,
    };
  }
}
// Delete Listing Action (Newer version)
export type DeleteListingState = {
  success: boolean;
  message: string;
  error?: string;
  listingId?: string;
};

interface DeleteListingParams {
  listingId: string;
  photoPath?: string; 
  currentUserId: string; 
}

export async function deleteListingAction(params: DeleteListingParams): Promise<DeleteListingState> {
  const { listingId, photoPath: photoPathFromParams, currentUserId } = params;

  if (!listingId || !currentUserId) {
    return { success: false, message: "Listing ID and User ID are required.", error: "Missing parameters" };
  }

  const listingDocRef = doc(db, 'usedBookListings', listingId);
  const userListingRef = doc(db, `users/${currentUserId}/myListings/${listingId}`);

  try {
    console.log(`Attempting to delete listing: ${listingId} by user: ${currentUserId}`);

    const listingDocSnap = await getDoc(listingDocRef);
    if (!listingDocSnap.exists()) {
      return { success: false, message: "Listing not found.", error: "Not Found" };
    }
    const listingData = listingDocSnap.data() as UsedBookListing;
    if (listingData.sellerId !== currentUserId) {
      console.warn(`User ${currentUserId} attempted to delete listing ${listingId} owned by ${listingData.sellerId}`);
      return { success: false, message: "You are not authorized to delete this listing.", error: "Unauthorized" };
    }

    const batch = writeBatch(db);
    batch.delete(listingDocRef);
    batch.delete(userListingRef); 
    
    let actualPhotoPath = photoPathFromParams || listingData.photoPath;
    
    if (!actualPhotoPath && listingData.coverImageUrl && listingData.coverImageUrl.includes('firebasestorage.googleapis.com')) {
        try {
            const url = new URL(listingData.coverImageUrl);
            let path = decodeURIComponent(url.pathname);
            const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || storage.app.options.storageBucket;
            console.log(`[deleteListingAction] Derived bucketName: ${bucketName}`);
            const prefixToRemove = bucketName ? `/v0/b/${bucketName}/o/` : null;
            if (prefixToRemove && path.startsWith(prefixToRemove)) {
                actualPhotoPath = path.substring(prefixToRemove.length);
                console.log(`[deleteListingAction] Derived actualPhotoPath: ${actualPhotoPath}`);
            }
        } catch (e) {
            console.warn("[deleteListingAction] Could not parse photo path from coverImageUrl:", listingData.coverImageUrl, e);
        }
    }

    if (actualPhotoPath) {
      console.log(`Deleting photo from storage at path: ${actualPhotoPath}`);
      const photoRef = ref(storage, actualPhotoPath);
      try {
        await deleteObject(photoRef);
        console.log(`Successfully deleted photo: ${actualPhotoPath}`);
      } catch (storageError: any) {
        if (storageError.code !== 'storage/object-not-found') {
            console.warn(`Failed to delete photo ${actualPhotoPath} from storage:`, storageError.message);
        }
      }
    } else {
        console.log("No valid photoPath provided or derived, skipping photo deletion from storage for listing:", listingId);
    }

    await batch.commit();
    console.log(`Successfully deleted listing ${listingId} and associated user listing reference.`);

    revalidatePath('/marketplace');
    revalidatePath(`/marketplace/${listingId}`);
    revalidatePath(`/profile/listings`); 
    revalidatePath(`/profile/${currentUserId}/listings`);
    revalidatePath('/');
    revalidatePath('/browse');
    revalidatePath('/profile'); // Revalidate the profile dashboard

    return { success: true, message: "Listing deleted successfully.", listingId };

  } catch (error: any) {
    console.error(`Error deleting listing ${listingId}:`, error);
    return { 
      success: false, 
      message: 'Failed to delete listing. ' + error.message, 
      error: error.code || 'Server Error' 
    };
  }
}

export type UpdateListingFormState = {
  message: string;
  errors?: Partial<Record<keyof z.infer<typeof UpdateListingFormSchema>, string[]>> & { _form?: string[]; };
  success: boolean;
  listingId?: string;
  error?: string; // Added for top-level errors not specific to a field
};

export async function updateListingAction(
  prevState: UpdateListingFormState,
  formData: FormData
): Promise<UpdateListingFormState> {
  console.log("UPDATE LISTING ACTION STARTED");

  const listingIdFromForm = formData.get('listingId') as string | null; // Renamed for clarity
  const userIdFromClient = formData.get('userIdFromClient') as string | null;

  if (!listingIdFromForm) {
    return {
      message: 'Listing ID is missing. Cannot update.',
      errors: { _form: ['Listing ID is required.'] },
      success: false,
      error: "Missing Listing ID"
      // listingId prop here should refer to a defined variable if needed,
      // but for this error path, it might not be essential if it's null/undefined.
      // However, to satisfy linter if it complains, ensure listingIdFromForm is passed.
      // listingId: listingIdFromForm // This might be null, handle accordingly or omit if error is about missing ID
    };
  }

  if (!userIdFromClient) {
    return {
      message: 'User not authenticated. Please log in to update a listing.',
      errors: { _form: ['Authentication required.'] },
      success: false,
      listingId: listingIdFromForm, // Use the sourced listingId
      error: "Authentication Failed"
    };
  }

  const listingDocRef = doc(db, 'usedBookListings', listingIdFromForm);
  try {
    const listingSnap = await getDoc(listingDocRef);
    if (!listingSnap.exists()) {
      return {
        message: 'Listing not found.',
        success: false,
        listingId: listingIdFromForm, // Use the sourced listingId
        error: "Not Found"
      };
    }
    const currentListingData = listingSnap.data() as UsedBookListing;
    if (currentListingData.sellerId !== userIdFromClient) {
      return {
        message: 'You are not authorized to update this listing.',
        success: false,
        listingId: listingIdFromForm, // Use the sourced listingId
        error: "Unauthorized"
      };
    }

    const photoEntries = formData.getAll('photos');
    const filesOnly = photoEntries.filter(
      (entry): entry is File => entry instanceof File && entry.size > 0
    );
    const newPhotoToValidate = filesOnly.length > 0 ? filesOnly[0] : undefined;

    const conditionValue = formData.get('condition');
    const parsedCondition = (conditionValue === null || conditionValue === "" || conditionValue === "undefined") 
                            ? undefined 
                            : conditionValue as z.infer<typeof UpdateListingFormSchema>['condition'];

    const listingTypeValue = formData.get('listingType');
    const parsedListingType = (listingTypeValue === null || listingTypeValue === "" || listingTypeValue === "undefined") 
                              ? undefined 
                              : listingTypeValue as z.infer<typeof UpdateListingFormSchema>['listingType'];
    
    const pageCountValue = formData.get('pageCount') || undefined;

    const validatedFields = UpdateListingFormSchema.safeParse({
      isbn: formData.get('isbn') || undefined,
      title: formData.get('title'),
      author: formData.get('author'),
      pageCount: pageCountValue,
      condition: parsedCondition,
      description: formData.get('description'),
      photos: newPhotoToValidate, // Validate new photo, can be undefined
      listingType: parsedListingType,
      price: formData.get('price') ? String(formData.get('price')) : undefined,
      swapPreferences: formData.get('swapPreferences') || undefined,
      preferences: formData.get('preferences') || undefined,
    });

    if (!validatedFields.success) {
      const flatErrors = validatedFields.error.flatten();
      const combinedErrors: UpdateListingFormState['errors'] = {
          ...flatErrors.fieldErrors,
      };
      if (flatErrors.formErrors.length > 0) {
          combinedErrors._form = flatErrors.formErrors;
      }
      return {
        message: 'Failed to update listing. Please check the errors below.',
        errors: combinedErrors,
        success: false,
        listingId: listingIdFromForm, // Use the sourced listingId
        error: "Validation Error"
      };
    }

    // Destructure fields from validated form data
    const { title, author, condition, description, photos: newPhotoFile, listingType, price, swapPreferences, preferences, isbn, pageCount } = validatedFields.data;
    
    // Line 1420 (problematic destructuring) is now removed.

    const updates: Partial<UsedBookListing> = {
      title,
      author,
      condition,
      description,
      listingType,
      isbn: isbn || undefined,
      pageCount: pageCount ? parseInt(pageCount, 10) : undefined,
      preferences: preferences || undefined,
      lastUpdated: serverTimestamp() as any,
    };

    const types = listingType.split(',');
    if (types.includes('Sell')) {
      if (price !== undefined && price !== null && price !== '') {
        updates.salePrice = parseFloat(price);
      } else {
        updates.salePrice = undefined; 
      }
    } else {
      updates.salePrice = undefined;
    }
    if (types.includes('Swap')) {
      updates.swapPreferences = swapPreferences || undefined;
    } else {
      updates.swapPreferences = undefined;
    }

    let newPhotoStoragePath: string | null = null; // Changed from undefined
    let newUploadedPhotoUrl: string | undefined = undefined;

    if (newPhotoFile && newPhotoFile instanceof File) {
      console.log(`New photo provided for listing ${listingIdFromForm}. Uploading...`);
      if (currentListingData.photoPath) {
        console.log(`Deleting old photo: ${currentListingData.photoPath}`);
        const oldPhotoRef = ref(storage, currentListingData.photoPath);
        try {
          await deleteObject(oldPhotoRef);
          console.log(`Successfully deleted old photo: ${currentListingData.photoPath}`);
        } catch (deleteError: any) {
          console.warn(`Could not delete old photo ${currentListingData.photoPath}:`, deleteError.message);
        }
      }
      try {
        const photoName = `${Date.now()}-${newPhotoFile.name.replace(/\s+/g, '_')}`;
        newPhotoStoragePath = `bookListings/${userIdFromClient}/${photoName}`;
        const storageRef = ref(storage, newPhotoStoragePath);
        await uploadBytes(storageRef, newPhotoFile);
        newUploadedPhotoUrl = await getDownloadURL(storageRef);
        updates.coverImageUrl = newUploadedPhotoUrl;
        updates.photoPath = newPhotoStoragePath;
        updates.photos = [newUploadedPhotoUrl]; 
        console.log(`Successfully uploaded new photo: ${photoName}, URL: ${newUploadedPhotoUrl}`);
      } catch (photoError: any) {
        console.error(`Error uploading new photo for listing ${listingIdFromForm}:`, photoError);
        return {
            message: `Failed to upload new photo: ${photoError.message}. Listing details (except photo) may have been updated if other fields changed.`,
            errors: { photos: [`Photo upload failed: ${photoError.message}`] },
            success: false, 
            listingId: listingIdFromForm,
            error: "Photo Upload Error"
        };
      }
    } else if (formData.get('removeCurrentImage') === 'true' && currentListingData.photoPath) {
        console.log(`Removing current image for listing ${listingIdFromForm} at path ${currentListingData.photoPath}`);
        const oldPhotoRef = ref(storage, currentListingData.photoPath);
        try {
            await deleteObject(oldPhotoRef);
            console.log(`Successfully removed photo from storage: ${currentListingData.photoPath}`);
            updates.coverImageUrl = `https://picsum.photos/300/450?random=${Date.now()}`; // Removed erroneous backslash 
            updates.photoPath = undefined; 
            updates.photos = [];
        } catch (deleteError: any) {
            console.warn(`Could not remove photo ${currentListingData.photoPath}:`, deleteError.message);
        }
    } else if (!newPhotoFile && formData.get('removeCurrentImage') !== 'true' && currentListingData.coverImageUrl) {
      updates.coverImageUrl = currentListingData.coverImageUrl;
      updates.photoPath = currentListingData.photoPath || undefined;
      updates.photos = currentListingData.photos || (currentListingData.coverImageUrl ? [currentListingData.coverImageUrl] : []);
    }

    await updateDoc(listingDocRef, updates);
    
    const userListingRef = doc(db, `users/${userIdFromClient}/myListings/${listingIdFromForm}`); // Corrected backtick usage
    const userListingUpdates: Partial<UsedBookListing> = {
        title: updates.title || currentListingData.title,
        coverImageUrl: updates.coverImageUrl || currentListingData.coverImageUrl,
        listingType: updates.listingType || currentListingData.listingType,
        lastUpdated: serverTimestamp() as any,
    };
    if (updates.status) {
        (userListingUpdates as any).status = updates.status;
    }

    if (Object.keys(userListingUpdates).some(key => userListingUpdates[key as keyof UsedBookListing] !== undefined)) {
        await updateDoc(userListingRef, userListingUpdates);
    }

    console.log(`Successfully updated listing ${listingIdFromForm}`); // Corrected backtick usage

    revalidatePath('/marketplace');
    revalidatePath(`/marketplace/book/${listingIdFromForm}`); // Corrected backtick usage
    revalidatePath(`/profile/listings`); // Corrected backtick usage
    revalidatePath(`/profile/listings/${listingIdFromForm}/edit`); // Corrected backtick usage
    revalidatePath(`/profile/${userIdFromClient}/listings`); // Corrected backtick usage
    revalidatePath('/');
    revalidatePath('/profile');

    return {
      message: `Successfully updated listing "${updates.title || currentListingData.title}"!`, // Corrected backtick usage
      success: true,
      listingId: listingIdFromForm,
    };

  } catch (error: any) {
    console.error(`Error updating listing ${listingIdFromForm}:`, error); // Corrected backtick usage
    return {
      message: `Failed to update listing. ${error.message}`, // Corrected backtick usage
      success: false,
      listingId: listingIdFromForm,
      error: error.code || "Server Error",
    };
  }
}
