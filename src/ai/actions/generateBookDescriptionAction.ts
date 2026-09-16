'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const InputSchema = z.object({
  title: z.string().min(1, "Title is required."),
  author: z.string().min(1, "Author is required."),
});

export interface GenerateBookDescriptionState {
  success: boolean;
  description?: string;
  error?: string;
}

// Ensure the API key is available in your environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set. AI features will not work.");
  // Potentially throw an error here or handle it in a way that your app expects
  // For now, we log and let the action fail if called.
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || ""); // Fallback to empty string if not set, though it will fail

export async function generateBookDescriptionAction(
  params: z.infer<typeof InputSchema>
): Promise<GenerateBookDescriptionState> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: "AI API key is not configured. Cannot generate description.",
    };
  }

  const validation = InputSchema.safeParse(params);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors.toString() || "Invalid input.",
    };
  }

  const { title, author } = validation.data;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `Generate a compelling and comprehensive book description for a book titled "${title}" by ${author}. 
    The description should be suitable for an online bookstore listing. 
    It should be engaging and encourage potential readers to buy or swap the book. 
    Focus on the plot, main characters, themes, and overall reading experience. 
    Keep it concise yet informative, around 150-250 words. 
    Do not include any placeholders like "[Book Title]" or "[Author Name]". Output only the description text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (text) {
      return {
        success: true,
        description: text.trim(),
      };
    } else {
      return {
        success: false,
        error: "AI model did not return a description. Please try again.",
      };
    }
  } catch (error: any) {
    console.error("Error generating book description with Gemini:", error);
    let errorMessage = "An unexpected error occurred while generating the description.";
    if (error.message) {
      errorMessage = error.message;
    }
    // More specific error handling can be added here based on Gemini API error types
    if (error.toString().includes("API key not valid")) {
        errorMessage = "The AI API key is invalid or missing. Please check your configuration.";
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
} 