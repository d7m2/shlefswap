// src/services/bookService.ts
import { apiClient } from '@/lib/apiClient';
import type { Book } from '@/types';

export const bookService = {
  async getNewBooks(params?: Record<string, string>): Promise<Book[]> {
    console.log('Fetching new books with params:', params);
    // The /api/books route supports sortBy=newest|rating, genre, and limit.
    return apiClient.get<Book[]>('/books', { params });
  },

  async getBookById(id: string): Promise<Book | undefined> {
    console.log(`Fetching book with ID: ${id}`);
    // /api/books handles ?ids= (comma-separated document IDs).
    const books = await apiClient.get<Book[]>('/books', { params: { ids: id } });
    return books[0];
  },
};
