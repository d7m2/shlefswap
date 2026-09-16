import { NextResponse } from 'next/server';
import { dbAdmin as db, admin } from '@/lib/firebase/server'; // Assuming you have a firebase admin initialized instance
import type { Notification } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const userId = (await params).userId;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json([]);
  }

  try {
    const notificationsRef = db.collection('notifications');
    const q = notificationsRef
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    const querySnapshot = await q.get();
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      let isoTimestamp: string;

      // Check if createdAt is an admin.firestore.Timestamp
      if (data.createdAt && data.createdAt instanceof admin.firestore.Timestamp) {
        isoTimestamp = data.createdAt.toDate().toISOString();
      } else {
        console.warn(`Notification with id ${doc.id} for user ${userId} has missing or invalid createdAt. Using current time as fallback.`);
        isoTimestamp = new Date().toISOString(); 
      }

      notifications.push({
        id: doc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        timestamp: isoTimestamp, // Use the processed timestamp
        isRead: data.isRead,
        userId: data.userId,
      } as Notification);
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications for user:', userId, error);
    // Log the specific error for more details
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Caught non-Error object:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch notifications', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 