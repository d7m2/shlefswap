import { db } from './config';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import type { Book } from '@/types';
export async function findBookByTitleAndAuthor(title: string, author: string): Promise<Book | null> {
  if (!title || !author) {
    console.log("Title and Author are required to find a book.");
    return null;
  }
  try {
    const booksRef = collection(db, 'books');
    const q = query(
      booksRef,
      where("title", "==", title),
      where("author", "==", author),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      // Assuming your Book type has an id field, and other fields like coverImageUrl, etc.
      // You might need to adjust the data mapping based on your exact Book type and Firestore structure.
      return {
        id: docSnap.id,
        ...data,
        // Ensure all fields from Book type are present, e.g.,
        // coverImageUrl: data.coverImageUrl || 'default_cover_image_url',
        // averageRating: data.averageRating || 0,
        // price: data.price || 0,
        // genres: data.genres || [],
      } as Book;
    } else {
      console.log(`No book found with title "${title}" and author "${author}"`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching book by title and author:", error);
    // throw error; // Or return null, depending on desired error handling
    return null;
  }
}
