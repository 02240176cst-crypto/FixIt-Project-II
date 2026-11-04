
import { File } from 'expo-file-system';

import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from './firebaseConfig';

export type IssuePriority = 'Low' | 'Medium' | 'High';

export type ReportData = {
  category: string;
  title: string;
  description: string;
  location: string;
  priority?: IssuePriority;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export const submitReport = async (report: ReportData) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please log in before submitting a report.');
  }

  const reportRef = doc(collection(db, 'reports'));

  await setDoc(reportRef, {
    id: reportRef.id,
    userId: user.uid,
    userEmail: user.email ?? '',
    category: report.category,
    title: report.title.trim(),
    description: report.description.trim(),
    location: report.location.trim(),
    imageUrl: report.imageUrl ?? null,

    // Map coordinates
    latitude: report.latitude ?? null,
    longitude: report.longitude ?? null,

    // Issue priority
    priority: report.priority ?? 'Medium',

    status: 'Pending',
    timestamp: serverTimestamp(),
  });

  return reportRef.id;
};

export const uploadReportImage = async (
  uri: string,
  fileName?: string | null,
  mimeType?: string | null
) => {
  const cloudName =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured correctly.');
  }

  const file = new File(uri);
  const formData = new FormData();

  formData.append('file', file as unknown as Blob);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.log('Cloudinary error:', result);

    throw new Error(
      result.error?.message || 'Photo upload failed.'
    );
  }

  return result.secure_url as string;
};
