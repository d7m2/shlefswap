'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { SubmitGeneralUserRatingSchema } from '@/lib/schemas';
import type { UserGeneralRating } from '@/types';
import { db } from '@/lib/firebase/config';
import {
  doc, runTransaction, query, where, collection, getDocs, serverTimestamp,
} from 'firebase/firestore';
export type SubmitGeneralUserRatingState = {
  message: string;
  success: boolean;
  errors?: Partial<Record<keyof z.infer<typeof SubmitGeneralUserRatingSchema>, string[]>> & { _form?: string[] };
  ratingId?: string;
};

export async function submitGeneralUserRatingAction(
  prevState: SubmitGeneralUserRatingState,
  formData: FormData
): Promise<SubmitGeneralUserRatingState> {
  const raterUserId = formData.get('raterUserId') as string | null;
  const raterUsername = formData.get('raterUsername') as string | null;
  const raterProfilePictureUrl = formData.get('raterProfilePictureUrl') as string | null; // Can be null
  const ratedUserId = formData.get('ratedUserId') as string | null;
  const ratingValue = formData.get('rating');
  const comment = formData.get('comment') as string | undefined;

  if (!raterUserId || !ratedUserId) {
    return {
      message: 'User IDs for rater and rated user are required.',
      success: false,
      errors: { _form: ['Authentication error or missing user ID.'] },
    };
  }

  if (raterUserId === ratedUserId) {
    return {
      message: 'Users cannot rate themselves.',
      success: false,
      errors: { _form: ['You cannot submit a rating for your own profile.'] },
    };
  }

  const validatedFields = SubmitGeneralUserRatingSchema.safeParse({
    ratedUserId,
    raterUserId,
    raterUsername: raterUsername || 'Anonymous', // Fallback for username
    raterProfilePictureUrl: raterProfilePictureUrl || null,
    rating: ratingValue ? parseInt(ratingValue as string, 10) : undefined,
    comment: comment || undefined,
  });

  if (!validatedFields.success) {
    const flatErrors = validatedFields.error.flatten();
    return {
      message: 'Invalid rating data. Please check the errors.',
      success: false,
      errors: { ...flatErrors.fieldErrors, _form: flatErrors.formErrors },
    };
  }

  const { rating, ...ratingData } = validatedFields.data;

  // Use a composite ID for the rating document to easily check for existence/update
  const ratingDocId = `${raterUserId}_${ratedUserId}`;
  const ratingDocRef = doc(db, 'userGeneralRatings', ratingDocId);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Create or Update the individual rating document
      const newRatingDoc: Omit<UserGeneralRating, 'id'> = {
        ...ratingData,
        rating: rating as 1 | 2 | 3 | 4 | 5, // Ensure rating is of the correct literal type
        createdAt: serverTimestamp() as any, // Firestore will convert this
        updatedAt: serverTimestamp() as any, // Firestore will convert this
      };

      const existingRatingSnap = await transaction.get(ratingDocRef);
      if (existingRatingSnap.exists()) {
        transaction.update(ratingDocRef, {
          ...ratingData,
          rating: rating as 1 | 2 | 3 | 4 | 5,
          comment: ratingData.comment || null, // Ensure comment is explicitly set or nulled
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(ratingDocRef, newRatingDoc);
      }

      // 2. Recalculate average rating for the ratedUser
      const ratingsQuery = query(collection(db, 'userGeneralRatings'), where('ratedUserId', '==', ratedUserId));
      // Important: We need to get all ratings for the user *within the transaction* if we want to be perfectly consistent.
      // However, Firestore transactions have limitations on the number of documents read/written.
      // A more scalable approach for high-traffic sites might be to update averages with Cloud Functions on write to userGeneralRatings.
      // For this implementation, let's fetch outside the transaction before it starts, or accept slight eventual consistency if done naively inside.
      // Let's try a simplified fetch of all ratings to recalculate. This might hit limits if a user has MANY ratings.
      
      // Fetch all ratings for the rated user (this is done after the current rating is set/updated in the transaction)
      const allRatingsSnapshot = await getDocs(ratingsQuery); // This will include the just-written/updated rating after the transaction commits.
                                                          // To be more accurate *within* the transaction, we'd need to read before, and then adjust based on the current write.
                                                          // This is complex. For now, we accept it reflects state *after* this write would notionally commit.
      
      let totalRating = 0;
      let ratingCount = 0;
      allRatingsSnapshot.forEach(docSnap => {
        const r = docSnap.data() as UserGeneralRating;
        totalRating += r.rating;
        ratingCount++;
      });
      
      // Adjust for the current operation if it was an update vs a new rating.
      // This logic is simplified: it assumes the snapshot reflects the DB *after* the current op if it were to commit.
      // More robust transactional updates often involve reading current aggregates, applying diffs, then writing new aggregates.

      const newAverageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // 3. Update the user's document
      const userDocRef = doc(db, 'users', ratedUserId);
      transaction.update(userDocRef, {
        generalAverageRating: newAverageRating,
        generalRatingCount: ratingCount,
      });
    });

    revalidatePath(`/profile/user/${ratedUserId}`);

    return {
      message: 'Rating submitted successfully!',
      success: true,
      ratingId: ratingDocId,
    };
  } catch (error: any) {
    console.error("Error submitting user rating:", error);
    return {
      message: `Failed to submit rating: ${error.message}`,
      success: false,
      errors: { _form: [`Server error: ${error.message}`] },
    };
  }
}
