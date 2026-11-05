
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

// Converts common Firebase errors into understandable messages.
const getFirebaseErrorMessage = (error: unknown): string => {
  const firebaseError = error as { code?: string };

  switch (firebaseError?.code) {
    case 'permission-denied':
      return 'You do not have permission to submit this report. Please contact support if the problem continues.';

    case 'unauthenticated':
      return 'Your session has expired. Please log in again.';

    case 'unavailable':
    case 'deadline-exceeded':
    case 'network-request-failed':
      return 'Unable to connect to the server. Please check your internet connection and try again.';

    case 'resource-exhausted':
      return 'The service is temporarily busy. Please try again later.';

    default:
      return error instanceof Error
        ? error.message
        : 'Something went wrong while submitting your report. Please try again.';
  }
};

// Submit a report to Firestore.
export const submitReport = async (report: ReportData) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please log in before submitting a report.');
  }

  // Validate required fields again before saving.
  const category = report.category.trim();
  const title = report.title.trim();
  const description = report.description.trim();
  const location = report.location.trim();

  if (!category || !title || !description || !location) {
    throw new Error('Please complete all required report fields.');
  }

  try {
    const reportRef = doc(collection(db, 'reports'));

    await setDoc(reportRef, {
      id: reportRef.id,
      userId: user.uid,
      userEmail: user.email ?? '',

      category,
      title,
      description,
      location,

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
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Upload a report image to Cloudinary.
export const uploadReportImage = async (
  uri: string,
  _fileName?: string | null,
  _mimeType?: string | null
): Promise<string> => {
  const cloudName =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured correctly. Please check the app configuration.'
    );
  }

  if (!uri || !uri.trim()) {
    throw new Error('Please select a valid photo to upload.');
  }

  const file = new File(uri);
  const formData = new FormData();

  formData.append('file', file as unknown as Blob);
  formData.append('upload_preset', uploadPreset);

  let response: Response;

  // Handle internet or connection failures.
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  } catch {
    throw new Error(
      'Unable to upload your photo. Please check your internet connection and try again.'
    );
  }

  // Safely read Cloudinary's response.
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const cloudinaryMessage =
      result?.error?.message;

    throw new Error(
      cloudinaryMessage ||
      'Photo upload failed. Please try again.'
    );
  }

  // Make sure Cloudinary returned a usable image URL.
  if (!result?.secure_url) {
    throw new Error(
      'The photo was uploaded, but its image URL could not be retrieved. Please try again.'
    );
  }

  return result.secure_url as string;
};
