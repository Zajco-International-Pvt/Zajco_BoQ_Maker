import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UserProfile } from '../types';
import { logAuditEvent } from '../services/auditService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, company?: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserProfile = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        // Update last login
        await updateDoc(userRef, { lastLogin: new Date().toISOString() });
        setUserProfile({ ...data, lastLogin: new Date().toISOString() });
      } else {
        // If user logged in via auth but document does not exist yet (or first user seed)
        const isFirstAdmin = user.email?.toLowerCase().includes('admin') || false;
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: isFirstAdmin ? 'ADMIN' : 'USER',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await fetchUserProfile(res.user);
      await logAuditEvent(res.user.uid, res.user.displayName || email, email, 'USER_LOGIN', 'User logged in');
    }
  };

  const register = async (name: string, email: string, pass: string, company = 'ZAJCO', phone = '') => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      // Check if admin email or setup
      const isFirstAdmin = email.toLowerCase().includes('admin');
      const newProfile: UserProfile = {
        uid: res.user.uid,
        name,
        email,
        phone,
        company,
        role: isFirstAdmin ? 'ADMIN' : 'USER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', res.user.uid), newProfile);
      setUserProfile(newProfile);
      await logAuditEvent(res.user.uid, name, email, 'USER_REGISTER', `User registered with role ${newProfile.role}`);
    }
  };

  const logout = async () => {
    if (userProfile) {
      await logAuditEvent(userProfile.uid, userProfile.name, userProfile.email, 'USER_LOGOUT', 'User logged out');
    }
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  const isAdmin = userProfile?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        login,
        register,
        logout,
        resetPassword,
        refreshProfile
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
