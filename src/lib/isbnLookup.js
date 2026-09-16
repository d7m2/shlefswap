const axios = require('axios');
const isDev = process.env.NODE_ENV === 'development';

// IMPORTANT: API keys should be stored in environment variables for security.
// Read the Google Books API key from environment variables
const GOOGLE_BOOKS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

async function fetchBookDataFromGoogleBooks(isbn) {
  if (!GOOGLE_BOOKS_API_KEY) {
    const errorMessage = "Google Books API key is not configured. Please set NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY environment variable.";
    if (isDev) console.error(errorMessage);
    return { found: false, error: errorMessage, source: 'Google Books' };
  }

  const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`;
  if (isDev) console.log(`Fetching from Google Books: ${googleBooksUrl}`);

  try {
    const response = await axios.get(googleBooksUrl);
    const data = response.data;
    if (isDev) console.debug(JSON.stringify(data, null, '\t'));

    if (data.totalItems > 0 && data.items && data.items.length > 0) {
      const item = data.items[0];
      const volumeInfo = item.volumeInfo;

      let title = volumeInfo.title || '';
      const subtitle = volumeInfo.subtitle;
      if (subtitle) {
        title += `: ${subtitle}`;
      }

      const authors = volumeInfo.authors || []; // Array of strings
      const publisher = volumeInfo.publisher || '';
      const publishedDate = volumeInfo.publishedDate || ''; // YYYY-MM-DD or YYYY
      const description = volumeInfo.description || '';
      const pageCount = volumeInfo.pageCount ? Number(volumeInfo.pageCount) : undefined;
      const imageLinks = volumeInfo.imageLinks;
      const coverImageUrl = imageLinks?.thumbnail || imageLinks?.smallThumbnail || undefined;

      let isbn10, isbn13;
      if (volumeInfo.industryIdentifiers) {
        for (const identifier of volumeInfo.industryIdentifiers) {
          if (identifier.type === 'ISBN_10') isbn10 = identifier.identifier;
          if (identifier.type === 'ISBN_13') isbn13 = identifier.identifier;
        }
      }
      // If the input ISBN was 10 digits, and we only found a 13, use input for isbn10
      if (isbn.length === 10 && !isbn10 && isbn13) {
        isbn10 = isbn;
      }
       // If the input ISBN was 13 digits, and we only found a 10, use input for isbn13
      if (isbn.length === 13 && !isbn13 && isbn10) {
        isbn13 = isbn;
      }


      return {
        found: true,
        title: title,
        author: authors.join(', '), // Convert array to comma-separated string
        publisher: publisher,
        publishedDate: publishedDate,
        description: description,
        pageCount: pageCount,
        isbn10: isbn10,
        isbn13: isbn13 || isbn, // Fallback to input ISBN if 13 not found explicitly
        coverImageUrl: coverImageUrl,
        source: 'Google Books',
      };
    } else {
      return { found: false, error: 'No items found in Google Books for this ISBN.', source: 'Google Books' };
    }
  } catch (error) {
    if (isDev) {
      console.error(`Failed to fetch book data from Google Books for ISBN ${isbn}:`, error.response ? error.response.data : error.message);
    }
    let errorMessage = 'Failed to fetch from Google Books.';
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
        errorMessage = `Google Books API Error: ${error.response.data.error.message}`;
    } else if (error.message) {
        errorMessage = `Google Books request error: ${error.message}`;
    }
    return { found: false, error: errorMessage, source: 'Google Books' };
  }
}

// Main lookup function
// For now, it will primarily use Google Books.
// It can be expanded to try other sources if Google Books fails or if desired.
async function lookupBookByIsbn(isbn) {
  if (!isbn || typeof isbn !== 'string' || isbn.trim().length === 0) {
    return { found: false, error: 'ISBN is required.' };
  }
  const cleanedIsbn = isbn.replace(/-/g, '').toUpperCase();
  if (!((cleanedIsbn.length === 10 || cleanedIsbn.length === 13) && /^[\dXx]+$/.test(cleanedIsbn))) {
      return { found: false, error: 'Invalid ISBN format. Must be 10 or 13 digits/X.' };
  }

  const googleBooksResult = await fetchBookDataFromGoogleBooks(cleanedIsbn);

  if (googleBooksResult.found) {
    return googleBooksResult; // Return if Google Books found it
  }

  
  return googleBooksResult; // This will contain the error from Google Books if it failed
}

module.exports = {
  lookupBookByIsbn,

}; 