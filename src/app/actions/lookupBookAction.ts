'use server';

import { z } from 'zod';
const { lookupBookByIsbn } = require('@/lib/isbnLookup'); // Using require for .js file

const LookupBookInputSchema = z.object({
  isbn: z.string().trim(),
});

export interface LookupBookActionResult {
  found: boolean;
  title?: string;
  author?: string;
  description?: string;
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  edition?: string; // Google Books API doesn't typically provide edition directly
  error?: string;
  source?: string; // e.g., 'Google Books'
  coverImageUrl?: string; // Add new field for cover image URL
}

export async function lookupBookAction(
  params: z.infer<typeof LookupBookInputSchema>
): Promise<LookupBookActionResult> {
  const validation = LookupBookInputSchema.safeParse(params);
  if (!validation.success) {
    return {
      found: false,
      error: validation.error.flatten().fieldErrors.isbn?.[0] || "Invalid input.",
    };
  }

  const { isbn } = validation.data;

  try {
    // lookupBookByIsbn from isbnLookup.js returns an object that matches LookupBookActionResult closely
    const result = await lookupBookByIsbn(isbn);
    
    if (!result.found && !result.error) {
        // Ensure there's an error message if not found and no specific error was set by the lookup
        result.error = "Book details not found for the provided ISBN.";
    }

    return result as LookupBookActionResult;
  } catch (error: any) {
    console.error("[lookupBookAction] Error:", error);
    return {
      found: false,
      error: error.message || "An unexpected error occurred during ISBN lookup.",
    };
  }
} 