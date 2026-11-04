
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from 'firebase/firestore';

import { auth, db } from './firebaseConfig';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  reportId: string;
  status: string;
  isRead: boolean;
  timestamp: any;
};

export const listenToNotifications = (
  callback: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
) => {
  const user = auth.currentUser;

  if (!user) {
    callback([]);
    return () => {};
  }

  const notificationsRef = collection(
    db,
    'users',
    user.uid,
    'notifications'
  );

  const notificationsQuery = query(
    notificationsRef,
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as AppNotification[];

      callback(notifications);
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const markNotificationAsRead = async (
  notificationId: string
) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please log in to view notifications.');
  }

  const notificationRef = doc(
    db,
    'users',
    user.uid,
    'notifications',
    notificationId
  );

  await updateDoc(notificationRef, {
    isRead: true,
  });
};
