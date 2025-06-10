import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const auth = getAuth(app);
const db = getFirestore(app);

const isTimestampToday = (timestamp: Timestamp | null): boolean => {
  if (!timestamp) return false;
  const dateFromTimestamp = timestamp.toDate();
  const today = new Date();
  return (
    dateFromTimestamp.getFullYear() === today.getFullYear() &&
    dateFromTimestamp.getMonth() === today.getMonth() &&
    dateFromTimestamp.getDate() === today.getDate()
  );
};

export interface User {
  uid: string;
  email: string | null;
  imageQuota: number;
  lastGeneratedDate: Timestamp | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserQuota: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndSetUser = async (firebaseUser: FirebaseUser, attemptCreation: boolean = false) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    let userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists() && attemptCreation) {
        console.warn(`User document not found for UID: ${firebaseUser.uid}. Creating one.`);
        try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                email: firebaseUser.email,
                imageQuota: 5,
                lastGeneratedDate: null,
            });
            userDocSnap = await getDoc(userDocRef);
        } catch (dbError) {
            console.error("Error creating user document: ", dbError);
            setError("Failed to initialize your user profile. Please try logging out and in, or contact support.");
            setCurrentUser(null);
            // Consider signing out the user if their profile cannot be created, as the app might not function.
            await signOut(auth).catch(e => console.error("Error signing out after profile creation failure:", e));
            return; // Stop further execution for this user
        }
    }

    if (userDocSnap.exists()) {
      let userData = userDocSnap.data() as Omit<User, 'uid'>; // Casting, assuming structure matches
      let currentQuota = userData.imageQuota;
      let lastGenerated = userData.lastGeneratedDate;

      if (lastGenerated && !isTimestampToday(lastGenerated)) {
        console.log(`Resetting quota for user ${firebaseUser.uid}`);
        currentQuota = 5;
        lastGenerated = null;
        try {
            await updateDoc(userDocRef, {
                imageQuota: currentQuota,
                lastGeneratedDate: null
            });
        } catch (updateError) {
            console.error("Error resetting user quota in Firestore:", updateError);
            setError("Failed to update your daily image quota. Functionality may be limited until this resolves. You can try refreshing.");
            // Not returning or signing out, as core auth is fine, but quota might be stale.
        }
      }

      setCurrentUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        imageQuota: currentQuota,
        lastGeneratedDate: lastGenerated,
      });
    } else {
      // This means the document doesn't exist AND (attemptCreation was false OR it failed silently before)
      console.error(`User document for UID ${firebaseUser.uid} does not exist and was not created/found.`);
      setError("Your user profile could not be found or accessed. Please log out and try signing in again. If the problem continues, contact support.");
      setCurrentUser(null);
      await signOut(auth).catch(e => console.error("Error signing out after profile access failure:", e));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); // Set loading true at the start of any auth change
      setError(null);   // Clear previous auth-related errors
      if (firebaseUser) {
        await fetchAndSetUser(firebaseUser, true); // attemptCreation true to ensure profile exists
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUserQuota = async () => {
    if (auth.currentUser) {
        // setLoading(true); // Optional: Manage loading state specifically for refresh if desired
        setError(null); // Clear previous errors before attempting refresh
        try {
            await fetchAndSetUser(auth.currentUser, false); // false: don't attempt creation, user doc should exist
        } catch (e) {
            console.error("Error refreshing user quota:", e);
            setError("Could not refresh your user data at this moment. Please check your connection or try again later.");
        } finally {
            // setLoading(false);
        }
    } else {
        setError("You must be logged in to refresh user data.");
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // userCredential will be available here, but onAuthStateChanged will handle setting user state
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged -> fetchAndSetUser (with attemptCreation=true) will manage user doc and state
    } catch (err: any) {
      console.error("Signup Error:", err);
      // Firebase provides specific error codes, e.g., err.code === 'auth/email-already-in-use'
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please try logging in or use a different email.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. Please choose a stronger password (at least 6 characters).');
      } else {
        setError(err.message || 'Failed to sign up. Please check your details and try again.');
      }
      setLoading(false); // Explicitly set loading false on error, as onAuthStateChanged might not fire as expected
      throw err; // Re-throw for component-level handling if needed
    }
    // setLoading(false) is typically handled by the onAuthStateChanged flow completion
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged -> fetchAndSetUser will manage user doc and state
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(err.message || 'Failed to log in. Please try again.');
      }
      setLoading(false); // Explicitly set loading false on error
      throw err; // Re-throw for component-level handling
    }
    // setLoading(false) is typically handled by the onAuthStateChanged flow completion
  };

  const logout = async () => {
    // setError(null); // Cleared by onAuthStateChanged
    // setLoading(true); // Optional, logout is usually fast
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setCurrentUser(null) and setLoading(false)
    } catch (err: any) {
      console.error("Logout Error:", err);
      setError(err.message || 'Failed to log out. Please try again.');
      // setLoading(false); // If setLoading(true) was used
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    logout,
    refreshUserQuota,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
