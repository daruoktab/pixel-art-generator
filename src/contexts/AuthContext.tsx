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
import { initDb, getDb, saveDb } from '../database'; // Adjusted path & added saveDb
import { type Database } from 'sql.js';

const auth = getAuth(app);

// Helper function to get current date in YYYY-MM-DD format
const getCurrentDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  // refreshUserQuota: () => Promise<void>; // Commented out, see implementation
  decrementQuota: () => Promise<void>; // Changed to Promise due to async DB ops
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
  const [dbInstance, setDbInstance] = useState<Database | null>(null);
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log("AuthContext: Initializing database...");
        const db = await initDb();
        setDbInstance(db);
        console.log("AuthContext: Database initialized successfully.");
      } catch (e) {
        console.error("AuthContext: Database initialization failed:", e);
        setDbError("Failed to initialize local database.");
        setError("Critical error: Could not connect to local storage. Usage data will not be saved.");
      } finally {
        setDbLoading(false);
      }
    };
    initializeDatabase();
  }, []);

  useEffect(() => {
    if (dbLoading) {
      console.log("AuthContext: Waiting for DB to initialize before subscribing to auth changes.");
      return; // Don't subscribe until DB is ready
    }
    if (dbError) {
      console.error("AuthContext: DB initialization failed. Auth operations might be affected or disabled.");
      // Potentially set loading to false and currentUser to null if DB is critical for auth
      setLoading(false);
      return;
    }
    console.log("AuthContext: DB ready. Mounting and subscribing to onAuthStateChanged.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("AuthContext: onAuthStateChanged triggered. User UID:", firebaseUser?.uid || "null");
      setLoading(true); // Keep this for overall auth loading
      setError(null); // Clear general errors

      if (dbError) {
        console.error("AuthContext: DB error, cannot process user data for quota.");
        setCurrentUser(null); // Or minimal user data without quota
        setLoading(false);
        return;
      }

      if (firebaseUser && dbInstance) {
        console.log("AuthContext: Firebase user detected and DB instance available.");
        const userEmail = firebaseUser.email;
        const currentDate = getCurrentDateString();
        const specialEmail = "daruokta@gmail.com"; // As per requirements
        const specialQuota = 99999;

        if (userEmail === specialEmail) {
          console.log(`AuthContext: Special user ${userEmail} detected. Setting special quota.`);
          setCurrentUser({
            uid: firebaseUser.uid,
            email: userEmail,
            imageQuota: specialQuota,
          });
        } else if (userEmail) {
          try {
            console.log(`AuthContext: Processing regular user ${userEmail}.`);
            const stmt = dbInstance.prepare("SELECT * FROM user_image_usage WHERE email = :email");
            const existingUser = stmt.getAsObject({ ':email': userEmail });
            stmt.free();

            if (existingUser.email) { // User exists in DB
              console.log(`AuthContext: User ${userEmail} found in DB. Last generation: ${existingUser.last_generation_date}, Generated today: ${existingUser.images_generated_today}`);
              let newQuota = DEFAULT_QUOTA;
              if (existingUser.last_generation_date === currentDate) {
                newQuota = DEFAULT_QUOTA - (existingUser.images_generated_today as number);
              } else {
                // Different day, reset usage in DB
                console.log(`AuthContext: Different day for user ${userEmail}. Resetting usage.`);
                dbInstance.run("UPDATE user_image_usage SET images_generated_today = 0, last_generation_date = ? WHERE email = ?", [currentDate, userEmail]);
                await saveDb(dbInstance); // Save DB after update
              }
              setCurrentUser({
                uid: firebaseUser.uid,
                email: userEmail,
                imageQuota: Math.max(0, newQuota),
              });
            } else { // User does not exist in DB
              console.log(`AuthContext: User ${userEmail} not found in DB. Creating new record.`);
              dbInstance.run("INSERT INTO user_image_usage (email, last_generation_date, images_generated_today) VALUES (?, ?, ?)", [userEmail, currentDate, 0]);
              await saveDb(dbInstance); // Save DB after insert
              setCurrentUser({
                uid: firebaseUser.uid,
                email: userEmail,
                imageQuota: DEFAULT_QUOTA,
              });
            }
          } catch (e) {
            console.error("AuthContext: Error accessing user data from DB:", e);
            setError("Failed to load user usage data. Please try refreshing.");
            // Fallback to default quota if DB operations fail for the user
            setCurrentUser({
              uid: firebaseUser.uid,
              email: userEmail,
              imageQuota: DEFAULT_QUOTA,
            });
          }
        } else {
             // Handle cases like anonymous users or users without email if necessary
            console.warn("AuthContext: Firebase user has no email. Cannot process quota.");
            setCurrentUser({
                uid: firebaseUser.uid,
                email: null, // Explicitly set email to null
                imageQuota: 0, // Or some other default for users without email
            });
        }
      } else if (!firebaseUser) {
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
  }, [dbInstance, dbLoading, dbError]); // Add dbInstance, dbLoading, dbError to dependency array

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

  // const refreshUserQuota = async () => {
  //   console.log("AuthContext: refreshUserQuota called.");
  //   // This function's old behavior is incorrect with DB integration.
  //   // It could be updated to re-fetch from DB if needed.
  //   // For now, commenting out to prevent accidental use.
  //   // if (currentUser && dbInstance) {
  //   //   console.log(`AuthContext: Attempting to refresh quota for user ${currentUser.uid} from DB.`);
  //   //   setError(null);
  //   //   setLoading(true);
  //   //   try {
  //   //     const userEmail = currentUser.email;
  //   //     const currentDate = getCurrentDateString();
  //   //     if (userEmail) {
  //   //       const stmt = dbInstance.prepare("SELECT * FROM user_image_usage WHERE email = :email");
  //   //       const existingUser = stmt.getAsObject({ ':email': userEmail });
  //   //       stmt.free();
  //   //       if (existingUser.email) {
  //   //         let newQuota = DEFAULT_QUOTA;
  //   //         if (existingUser.last_generation_date === currentDate) {
  //   //           newQuota = DEFAULT_QUOTA - (existingUser.images_generated_today as number);
  //   //         } else {
  //   //           // This part implies a reset, which might be too aggressive for a simple "refresh"
  //   //           // dbInstance.run("UPDATE user_image_usage SET images_generated_today = 0, last_generation_date = ? WHERE email = ?", [currentDate, userEmail]);
  //   //         }
  //   //         setCurrentUser(prev => prev ? { ...prev, imageQuota: Math.max(0, newQuota) } : null);
  //   //       } else {
  //   //         // User not in DB, reset to default (should be handled by onAuthStateChanged mostly)
  //   //         setCurrentUser(prev => prev ? { ...prev, imageQuota: DEFAULT_QUOTA } : null);
  //   //       }
  //   //     }
  //   //   } catch (e) {
  //   //     console.error("AuthContext: Error refreshing user quota from DB:", e);
  //   //     setError("Failed to refresh usage data.");
  //   //   } finally {
  //   //     setLoading(false);
  //   //   }
  //   // } else {
  //   //   console.warn("AuthContext: refreshUserQuota called but no user/DB or user has no email.");
  //   //   setError("Cannot refresh quota: no user is signed in or DB not ready.");
  //   // }
  // };

  const decrementQuota = async (): Promise<void> => { // Added Promise<void> return type
    console.log("AuthContext: decrementQuota called.");
    if (!currentUser || !dbInstance) {
      console.warn("AuthContext: decrementQuota called but no user or DB instance.");
      setError("Cannot update quota: user not logged in or database not ready.");
      return;
    }
    if (dbError) {
      console.error("AuthContext: DB error, cannot decrement quota.");
      setError("Database error, cannot update quota.");
      return;
    }

    const userEmail = currentUser.email;
    const specialEmail = "daruokta@gmail.com";

    // Optimistically decrement in-memory quota for responsiveness
    // but only if it's not the special user or if the special user's quota is not "infinite"
    // For simplicity, we'll let the special user's quota be managed by onAuthStateChanged primarily.
    // Regular users will see their quota decrement immediately.
    if (userEmail !== specialEmail) {
      if (currentUser.imageQuota <= 0) {
        console.warn(`AuthContext: Quota already 0 for user ${currentUser.uid}. Cannot decrement further.`);
        setError("You have reached your image generation limit for today.");
        return;
      }
      setCurrentUser(prevUser => prevUser ? { ...prevUser, imageQuota: prevUser.imageQuota - 1 } : null);
    }


    if (userEmail && userEmail !== specialEmail) {
      try {
        const currentDate = getCurrentDateString();
        // It's possible the user was created on a previous day and this is their first action today.
        // Ensure the record reflects today's date and then increment.
        // Using an UPSERT-like logic or checking first.
        // For simplicity, we assume onAuthStateChanged has already set up today's record or reset it.
        // So, we directly increment.

        // Check if the user's last generation date is today. If not, reset count before incrementing.
        const userCheckStmt = dbInstance.prepare("SELECT last_generation_date, images_generated_today FROM user_image_usage WHERE email = :email");
        const userUsage = userCheckStmt.getAsObject({ ':email': userEmail });
        userCheckStmt.free();

        if (userUsage.email) { // userUsage.email will be populated if found
            if (userUsage.last_generation_date === currentDate) {
                dbInstance.run("UPDATE user_image_usage SET images_generated_today = images_generated_today + 1, last_generation_date = ? WHERE email = ?", [currentDate, userEmail]);
                console.log(`AuthContext: Incremented images_generated_today for ${userEmail} on ${currentDate}.`);
            } else {
                // First action of a new day for this user
                dbInstance.run("UPDATE user_image_usage SET images_generated_today = 1, last_generation_date = ? WHERE email = ?", [currentDate, userEmail]);
                console.log(`AuthContext: First image for ${userEmail} on new day ${currentDate}. Set images_generated_today to 1.`);
            }
        } else {
            // This case should ideally not happen if onAuthStateChanged ran correctly.
            // But as a fallback, create the record.
            dbInstance.run("INSERT INTO user_image_usage (email, last_generation_date, images_generated_today) VALUES (?, ?, ?)", [userEmail, currentDate, 1]);
            console.warn(`AuthContext: User ${userEmail} not found during decrement. Created new DB record.`);
        }
        await saveDb(dbInstance); // Save DB after successful update/insert
      } catch (e) {
        console.error("AuthContext: Failed to update user quota in DB:", e);
        setError("Failed to save usage data. Your displayed quota might be incorrect.");
        // Potentially revert optimistic update or re-fetch from DB
        // For now, we'll leave the optimistic update and show an error.
      }
    } else if (userEmail === specialEmail) {
      console.log("AuthContext: Special user quota decrement skipped for DB update (or handled differently).");
      // Optionally, still track their usage if desired, without affecting their functional quota
      // For example: dbInstance.run("UPDATE user_image_usage SET images_generated_today = images_generated_today + 1, last_generation_date = ? WHERE email = ?", [getCurrentDateString(), userEmail]);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading: loading || dbLoading, error: error || dbError, logout, signInWithGoogle, /*refreshUserQuota,*/ decrementQuota }}>
      {children}
    </AuthContext.Provider>
  );
};
