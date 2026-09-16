'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Notification } from '@/types';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCheck, Trash2 } from 'lucide-react';


interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function normalizeNotification(docSnap: QueryDocumentSnapshot<DocumentData>): Notification {
  const data = docSnap.data();
  const timestampValue = data.timestamp as unknown;
  const timestamp =
    timestampValue && typeof (timestampValue as any).toDate === 'function'
      ? (timestampValue as any).toDate().toISOString()
      : (data.timestamp as string);
  return {
    id: docSnap.id,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    timestamp,
    isRead: data.isRead ?? false,
  } as Notification;
}

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    try {
      const notificationsRef = collection(db, `users/${currentUser.id}/notifications`);
      const q = query(notificationsRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      setNotifications(querySnapshot.docs.map(normalizeNotification));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isLoggedIn, currentUser?.id, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser?.id) return;
    updateDoc(doc(db, `users/${currentUser.id}/notifications`, notificationId), { isRead: true })
      .catch((error) => console.error("Error marking notification as read:", error));
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, [currentUser?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id || unreadCount === 0) return;
    try {
      const notificationsRef = collection(db, `users/${currentUser.id}/notifications`);
      const q = query(notificationsRef, where('isRead', '==', false));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.update(doc(db, `users/${currentUser.id}/notifications`, docSnap.id), { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast({
      title: "All Read",
      description: "All notifications marked as read.",
      icon: <CheckCheck className="h-5 w-5 text-primary" />
    });
  }, [currentUser?.id, unreadCount, toast]);

  const clearNotification = useCallback(async (notificationId: string) => {
    if (!currentUser?.id) return;
    deleteDoc(doc(db, `users/${currentUser.id}/notifications`, notificationId))
      .catch((error) => console.error("Error clearing notification:", error));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    toast({
      title: "Notification Cleared",
      variant: "default",
      icon: <Trash2 className="h-5 w-5" />
    });
  }, [currentUser?.id, toast]);

  const clearAllNotifications = useCallback(async () => {
    if (!currentUser?.id || notifications.length === 0) return;
    try {
      const notificationsRef = collection(db, `users/${currentUser.id}/notifications`);
      const querySnapshot = await getDocs(notificationsRef);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(doc(db, `users/${currentUser.id}/notifications`, docSnap.id));
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
    setNotifications([]);
    toast({
      title: "All Notifications Cleared",
      variant: "default",
      icon: <Trash2 className="h-5 w-5" />
    });
  }, [currentUser?.id, notifications.length, toast]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  }), [
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};