export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationDate?: string;
  pageCount?: number;
  language?: string;
  coverImageUrl: string;
  description: string;
  price?: number;
  averageRating?: number;
  reviewCount?: number;
  genres?: string[];
  aiHint?: string; // For placeholder images
}

export interface UsedBookListing extends Book {
  listingId: string;
  seller: User;
  sellerId: string;
  sellerUsername?: string;
  sellerProfilePictureUrl?: string;
  condition: 'New' | 'Like New' | 'Very Good' | 'Good' | 'Acceptable';
  coverImageUrl: string;
  photoPath?: string;
  photos?: string[];
  listingType: string; // 'Sell' | 'Swap' | 'Free' (legacy 'Sale'), or comma-joined for multi-type listings
  salePrice?: number;
  swapPreferences?: string;
  preferences?: string;
  listedDate: string;
  status: 'available' | 'sold' | 'swap_agreed' | 'reserved';
  availability?: 'available' | 'not_available' | 'sold' | 'swap_agreed';
  lastUpdated?: any; // Or a more specific Firebase Timestamp type / string
  // New fields for enhanced search
  categories?: string[];
  tags?: string[];
  level?: 'beginner' | 'intermediate' | 'advanced' | 'general';
  searchTerms?: string[]; // For title search
  authorSearchTerms?: string[]; // For author search
  // Relevance scoring for search results
  relevanceScore?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  p2pRating?: number; // Overall P2P transaction rating
  p2pTransactionCount?: number; // Total P2P transactions
  memberSince?: string; // ISO Date
  lastLogin?: string; // Added - ISO Date
  bio?: string;
  favoriteGenres?: string[];
  accountLevel?: 'standard' | 'premium' | 'admin';
  emailVerified?: boolean;
  // New fields for general user ratings
  generalAverageRating?: number;
  generalRatingCount?: number;
}

export type BookListItem = Book | UsedBookListing;

// New types for Order Details
export interface Address {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

export interface PaymentSummary {
  cardLastFour: string;
  cardType: string; // e.g., Visa, MasterCard
  paymentMethod: string; // e.g. "Visa ending in 1234"
}

export interface OrderItem {
  bookId: string; // Link to the Book or UsedBookListing id
  title: string;
  author: string;
  coverImageUrl: string;
  quantity: number;
  pricePerItem?: number; // Undefined for swap items if not relevant
  itemType: 'New Book' | 'Used Book'; // To differentiate between new and marketplace items
}

export interface Order {
  id: string; // Unique ID for the order document itself
  userId: string; // ID of the user this order belongs to (e.g., buyer, or one of the swappers)
  orderNumber: string; // User-friendly order number like "SW-12345"
  date: string; // ISO date string
  items: OrderItem[];
  subTotal: number;
  shippingCost: number;
  taxes: number;
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Completed';
  type: 'Purchase' | 'Swap';
  
  shippingAddress?: Address;
  paymentSummary?: PaymentSummary;

  swapPartner?: User;
  itemsOfferedByCurrentUser?: OrderItem[];
  itemsReceivedByCurrentUser?: OrderItem[];
  swapStatusDetails?: string;
}

// P2P Marketplace Features Types
export interface Offer {
  id: string;
  listingId: string;
  bookTitle: string;
  bookCoverImageUrl?: string;
  listingType: string; // Type of the original listing (may be comma-joined)
  offeredAmount?: number; // For 'Sale' offers if it's a price offer
  messageToSeller?: string; // User's message when making the offer
  offeredByUserId: string;
  offeredByUsername: string;
  sellerUserId: string; // User ID of the book seller
  sellerUsername: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
  dateOffered: string; // ISO date string
  dateResponded?: string; // ISO date string
  // For swap offers, what the offerer is proposing to swap
  proposedSwapItemIds?: string[]; // IDs of books the offerer wants to swap from their listings
  proposedSwapItemTitles?: string[]; // Denormalized titles for quick display
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  receiverId?: string;
  receiverUsername?: string;
  content: string;
  timestamp: string; // ISO date string
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantUsernames: string[];
  participantProfilePictures?: (string | null)[]; // Array of strings or nulls, whole array can be undefined
  participantProfiles?: User[]; // Added for richer participant data
  lastMessage?: Message;
  participantUnreadCount?: { [key: string]: number }; // As used in actions.ts
  unreadCount?: number; // Added
  relatedListingId?: string | null; // Allow null
  relatedListingTitle?: string | null; // Allow null
  createdAt?: any; // serverTimestamp() type. Consider a more specific Firebase Timestamp type if available/imported
  lastActivity?: any; // Added lastActivity
}

// New interface for individual general user ratings
export interface UserGeneralRating {
  id: string; // Unique ID for the rating document itself
  ratedUserId: string; // ID of the user being rated
  raterUserId: string; // ID of the user who gave the rating
  raterUsername: string; // Username of the rater for display
  raterProfilePictureUrl?: string | null; // Profile picture of the rater
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string; // ISO date string for when the rating was created
  updatedAt: string; // ISO date string for when the rating was last updated
}

export type NotificationType = 
  | 'new_offer' 
  | 'offer_accepted' 
  | 'offer_rejected' 
  | 'offer_cancelled'
  | 'new_message' 
  | 'listing_sold'
  | 'swap_agreed'
  | 'feedback_received'
  | 'system_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // e.g., to the offer, message, or listing
  timestamp: string; // ISO date string
  isRead: boolean;
  userId: string; // The user this notification is for
}