import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  FirebaseError
} from 'firebase/auth';
import { app } from '../firebaseConfig.ts';

const auth = getAuth(app);

export interface User {
  uid: string;
  email: string | null;
  imageQuota: number;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshUserQuota: () => Promise<void>; // Will reset quota in memory
  decrementQuota: () => void; // Added to manage quota
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

const DEFAULT_QUOTA = 5;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("AuthContext: Mounting and subscribing to onAuthStateChanged.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("AuthContext: onAuthStateChanged triggered. User UID:", firebaseUser?.uid || "null");
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        console.log("AuthContext: Firebase user detected. Creating in-memory user object.");
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          imageQuota: DEFAULT_QUOTA, // Initialize with default quota
        });
        console.log(`AuthContext: In-memory user object created for UID: ${firebaseUser.uid}`);
      } else {
        console.log("AuthContext: No Firebase user. Setting currentUser to null.");
        setCurrentUser(null);
      }
      setLoading(false);
      console.log("AuthContext: onAuthStateChanged finished. Loading state set to false.");
    });

    return () => {
      console.log("AuthContext: Unmounting and unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setCurrentUser(null);
      console.log("Logout successful.");
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Error during logout:", firebaseError.code, firebaseError.message);
      setError("Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log("Google Sign-In successful via signInWithPopup. onAuthStateChanged will handle user setup.");
    } catch (e) {
      const firebaseError = e as FirebaseError;
      console.error("Error during Google Sign-In:", firebaseError.code, firebaseError.message);
      let friendlyMessage = "Failed to sign in with Google. Please try again.";
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        friendlyMessage = "Google Sign-In cancelled.";
      } else if (firebaseError.code === 'auth/account-exists-with-different-credential') {
        friendlyMessage = "An account already exists with this email using a different sign-in method.";
      } else if (firebaseError.code === 'auth/cancelled-popup-request' || firebaseError.code === 'auth/popup-blocked') {
        friendlyMessage = "Google Sign-In pop-up was cancelled or blocked. Please ensure pop-ups are enabled.";
      } else if (firebaseError.code === 'auth/configuration-not-found') {
        friendlyMessage = "Firebase configuration for Google Sign-In is missing or incorrect. (auth/configuration-not-found)";
         console.error("Firebase (auth/configuration-not-found): Ensure Google Sign-In is enabled in your Firebase project's Authentication settings and that your firebaseConfig.ts is correct and initialized properly.");
      }
      setError(friendlyMessage);
      setCurrentUser(null); // Ensure no partial state on error
    } finally {
      setLoading(false);
    }
  };

  const refreshUserQuota = async () => {
    console.log("AuthContext: refreshUserQuota called.");
    if (currentUser) {
      console.log(`AuthContext: Resetting quota for user ${currentUser.uid} to default: ${DEFAULT_QUOTA}`);
      setCurrentUser(prevUser => prevUser ? { ...prevUser, imageQuota: DEFAULT_QUOTA } : null);
      setError(null); // Clear any previous errors
    } else {
      console.warn("AuthContext: refreshUserQuota called but no user is signed in.");
      setError("Cannot refresh quota: no user is signed in.");
    }
  };

  const decrementQuota = () => {
    console.log("AuthContext: decrementQuota called.");
    setCurrentUser(prevUser => {
      if (prevUser && prevUser.imageQuota > 0) {
        console.log(`AuthContext: Decrementing quota for user ${prevUser.uid}. Old quota: ${prevUser.imageQuota}`);
        return { ...prevUser, imageQuota: prevUser.imageQuota - 1 };
      }
      if (prevUser && prevUser.imageQuota <= 0) {
        console.warn(`AuthContext: Quota already 0 for user ${prevUser.uid}. Cannot decrement further.`);
        setError("You have reached your image generation limit for this session.");
      }
      return prevUser;
    });
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, error, logout, signInWithGoogle, refreshUserQuota, decrementQuota }}>
      {children}
    </AuthContext.Provider>
  );
};
