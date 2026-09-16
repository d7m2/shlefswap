import { z } from 'zod';

// Define constants for file validation
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const CreateListingFormSchema = z.object({
  isbn: z.string().trim()
    .min(10, "ISBN must be at least 10 characters (excluding hyphens)")
    .max(17, "ISBN cannot be more than 17 characters (including hyphens for ISBN-13)")
    .regex(/^(?=(?:[0-9]-*){9}[0-9Xx]$|^(?:[0-9]-*){12}[0-9]$)[0-9Xx-]+$/, "Invalid ISBN format. Use 10 or 13 digits, optionally with hyphens (e.g., 978-0321765723 or 0321765723).")
    .optional()
    .or(z.literal('')),
  title: z.string().trim().min(1, "Title is required").max(150, "Title too long"),
  author: z.string().trim().min(1, "Author is required").max(100, "Author name too long"),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : String(val),
    z.string()
      .regex(/^\d*$/, "Page count must be a number") 
      .refine(valStr => valStr === undefined || (parseInt(valStr, 10) >= 1 && parseInt(valStr, 10) <= 10000), {
        message: "Page count must be between 1 and 10,000, or leave empty.",
      })
      .optional()
  ),
  condition: z.enum(["New", "Like New", "Very Good", "Good", "Acceptable"], { required_error: "Condition is required" }),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  photos: z.instanceof(File, { message: "Please upload an image for your book." })
    .refine(file => file.size <= MAX_FILE_SIZE, `Max file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
    .refine(
      file => ACCEPTED_IMAGE_TYPES.includes(file.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ).optional(), // Made optional for edit, but will be required for create server-side if no placeholder
  listingType: z.string().trim().min(1, "Select at least one listing type.").refine(val => val.split(',').every((t) => ["Sell", "Swap", "Free"].includes(t)), "Listing type can only be Sell, Swap, or Free."),
  preferences: z.string().trim().min(3, "Please describe what you'd like in return (e.g., asking price, books you'd swap for, or free giveaway terms).").max(2000, "Preferences too long"),
  price: z.string().optional().refine(val => {
    if (val === undefined || val.trim() === '') return true; // Optional, so empty is fine
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0.01 && num <= 100000;
  }, "Price must be a valid number between $0.01 and $100,000, or leave empty if not for sale."),
  swapPreferences: z.string().trim().max(500, "Swap preferences too long").optional(),
  // Add new optional fields from AI lookup
  edition: z.string().trim().max(100, "Edition info too long").optional(),
  publisher: z.string().trim().max(100, "Publisher name too long").optional(),
  publishedDate: z.string().trim().max(50, "Published date info too long").optional(), // Consider date validation if strict format is needed
});

// Since photos is already optional in CreateListingFormSchema's base object definition,
// and the refinements are still applicable, UpdateListingFormSchema can be an alias.
export const UpdateListingFormSchema = CreateListingFormSchema;

export type CreateListingFormValues = z.infer<typeof CreateListingFormSchema>;

export const ShippingAddressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  addressLine1: z.string().min(5, "Address Line 1 must be at least 5 characters."),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City must be at least 2 characters."),
  stateProvince: z.string().min(2, "State/Province must be at least 2 characters."),
  postalCode: z.string().min(3, "Postal code must be at least 3 characters."),
  country: z.string().min(2, "Country must be at least 2 characters."),
  phoneNumber: z.string().optional().refine(val => !val || /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(val), {
    message: "Invalid phone number format.",
  }),
});

export const SaudiPaymentMethods = z.enum(['tamara', 'hyperpay', 'mada', 'stcpay', 'alrajhi']);
export type SaudiPaymentMethodType = z.infer<typeof SaudiPaymentMethods>;

export const PaymentDetailsSchema = z.object({
  paymentMethodType: z.enum(['card', 'tamara', 'hyperpay', 'mada', 'stcpay', 'alrajhi'], {
    required_error: "Please select a payment method.",
  }),
  cardholderName: z.string().optional(),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvc: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethodType === 'card') {
    if (!data.cardholderName || data.cardholderName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cardholderName'],
        message: "Cardholder name must be at least 2 characters.",
      });
    }
    if (!data.cardNumber || !/^\d{13,19}$/.test(data.cardNumber.replace(/\s/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cardNumber'],
        message: "Invalid card number.",
      });
    }
    if (!data.expiryDate || !/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(data.expiryDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiryDate'],
        message: "Invalid expiry date (MM/YY).",
      });
    }
    if (!data.cvc || !/^\d{3,4}$/.test(data.cvc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cvc'],
        message: "Invalid CVC.",
      });
    }
  }
});

export const CheckoutFormSchema = z.object({
  shipping: ShippingAddressSchema,
  payment: PaymentDetailsSchema,
});

export const MakeOfferFormSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required."),
  listingTitle: z.string().optional(), // For context, not strictly validated here as it's from listing
  bookCoverImageUrl: z.string().url().optional(), // For context
  listingType: z.string().min(1, "Listing type is required."),
  offeredAmount: z.number({invalid_type_error: "Offer amount must be a number."}).positive("Offer amount must be positive.").optional(),
  messageToSeller: z.string().max(500, "Message cannot exceed 500 characters.").optional(),
  proposedSwapItemIds: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return undefined; }
      }
      return val;
    },
    z.array(z.string().min(1, "Swap item ID cannot be empty.")).optional()
  ),
  proposedSwapItemTitles: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return undefined; }
      }
      return val;
    },
    z.array(z.string().min(1, "Swap item title cannot be empty.")).optional()
  ),
  offeredByUserId: z.string(),
  offeredByUsername: z.string(),
  sellerUserId: z.string(),
  sellerUsername: z.string(),
}).superRefine((data, ctx) => {
  if ((data.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell')) && data.offeredAmount === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Offer amount is required for sale listings.",
      path: ['offeredAmount'],
    });
  }
  if (data.listingType.split(',').includes('Swap')) {
    // Optionally, ensure titles match IDs length if both are provided
    if (data.proposedSwapItemIds && data.proposedSwapItemTitles && data.proposedSwapItemIds.length !== data.proposedSwapItemTitles.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mismatch between selected swap item IDs and titles count.",
        path: ['proposedSwapItemTitles'], // Or a general form error
      });
    }
  }
});

export const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1, "Message cannot be empty.").max(1000, "Message is too long."),
  senderId: z.string(),
  senderUsername: z.string(),
  // receiverId: z.string(), // Removed
  // receiverUsername: z.string(), // Removed
});

// Schema for submitting a general user rating
export const SubmitGeneralUserRatingSchema = z.object({
  ratedUserId: z.string().min(1, "Rated User ID is required."),
  raterUserId: z.string().min(1, "Rater User ID is required."),
  raterUsername: z.string().min(1, "Rater username is required."),
  raterProfilePictureUrl: z.string().url().nullable().optional(), // URL or null/undefined
  rating: z.number({
    required_error: "Rating is required.",
    invalid_type_error: "Rating must be a number."
  }).int().min(1, "Rating must be at least 1.").max(5, "Rating must be no more than 5."),
  comment: z.string().trim().max(1000, "Comment cannot exceed 1000 characters.").optional(),
});

export type SubmitGeneralUserRatingFormValues = z.infer<typeof SubmitGeneralUserRatingSchema>;

