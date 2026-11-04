
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { auth } from './firebaseConfig';

// Register a new user
export const registerUser = async (
  fullName: string,
  email: string,
  password: string
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

    await updateProfile(userCredential.user, {
    displayName: fullName.trim(),
  });

  // Sign out after registration so the user can log in manually
  await signOut(auth);

  return userCredential.user;
};

// Login an existing user
export const loginUser = async (
  email: string,
  password: string
) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  return userCredential.user;
};

// Logout
export const logoutUser = async () => {
  await signOut(auth);
};

// Send password reset email
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email.trim());
};
