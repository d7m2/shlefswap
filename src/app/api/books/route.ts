import { NextResponse } from 'next/server';
import { dbAdmin, admin } from '@/lib/firebase/server';
import { sampleBooks } from '@/lib/sample-books';
import type { Book } from '@/types';

// Applies the same filtering/sorting/limiting contract against the sample
// catalog, used when the Admin SDK is unavailable or Firestore is empty.
function fallbackBooks(searchParams: URLSearchParams): Book[] {
  const ids = searchParams.get('ids');

  if (ids) {
    const idSet = new Set(ids.split(',').map((id) => id.trim()).filter(Boolean));
    return sampleBooks.filter((book) => idSet.has(book.id));
  }

  let books = [...sampleBooks];
  const sortBy = searchParams.get('sortBy');

  if (sortBy === 'newest') {
    books.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } else if (sortBy === 'rating') {
    books.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  } else {
    books.sort((a, b) => a.title.localeCompare(b.title));
  }

  const genre = searchParams.get('genre');
  if (genre) {
    books = books.filter((book) => book.genres?.includes(genre));
  }

  const limitParam = searchParams.get('limit');
  const numLimit = parseInt(limitParam ?? '', 10);
  if (!Number.isNaN(numLimit) && numLimit > 0) {
    books = books.slice(0, numLimit);
  }

  return books;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy');
  const limitParam = searchParams.get('limit');
  const genre = searchParams.get('genre');
  const ids = searchParams.get('ids');

  if (!dbAdmin) {
    return NextResponse.json(fallbackBooks(searchParams));
  }

  try {
    const booksCollection = dbAdmin.collection('books');
    const idArray = ids ? ids.split(',') : null;

    if (idArray) {
      if (idArray.length > 30) {
        return NextResponse.json(
          { message: 'Too many IDs requested. Maximum is 30.', error: 'Bad Request' },
          { status: 400 }
        );
      }
      const q = booksCollection.where(admin.firestore.FieldPath.documentId(), 'in', idArray);
      const querySnapshot = await q.get();
      const books = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Book));
      return NextResponse.json(books);
    }

    let q: admin.firestore.Query = booksCollection;

    if (sortBy === 'newest') {
      q = q.orderBy('createdAt', 'desc');
    } else if (sortBy === 'rating') {
      q = q.orderBy('averageRating', 'desc');
    } else {
      q = q.orderBy('title');
    }

    if (genre) {
      q = q.where('genres', 'array-contains', genre);
    }

    if (limitParam) {
      const numLimit = parseInt(limitParam, 10);
      if (!Number.isNaN(numLimit) && numLimit > 0) {
        q = q.limit(numLimit);
      } else {
        console.warn(`Invalid limit parameter: ${limitParam}. Using default limit if any, or no limit.`);
      }
    }

    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return NextResponse.json(fallbackBooks(searchParams));
    }

    const books = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Book));
    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books, falling back to sample catalog:', error);
    return NextResponse.json(fallbackBooks(searchParams));
  }
}