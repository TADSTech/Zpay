import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { setTokenProvider, apiPost } from '../lib/api';

export interface ZPayUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  initial: string;
  isMock: boolean;
}

interface AuthContextValue {
  user: ZPayUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsMock: () => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USER: ZPayUser = {
  uid: 'mock_uid_tola',
  displayName: 'Tola Shofola',
  email: 'tola@thriftandsoles.com',
  initial: 'T',
  photoURL: null,
  isMock: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ZPayUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async (): Promise<string> => {
    if (user?.isMock) return 'mock_token_tola';
    const currentUser = auth.currentUser;
    if (currentUser) return currentUser.getIdToken();
    return '';
  }, [user]);

  // Register the token provider for the API wrapper
  useEffect(() => {
    setTokenProvider(getToken);
  }, [getToken]);

  // Listen to Firebase auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (fbUser) {
        const zpayUser: ZPayUser = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || 'User',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL,
          initial: (fbUser.displayName || 'U').charAt(0).toUpperCase(),
          isMock: false,
        };
        setUser(zpayUser);

        // Provision merchant profile in Firestore for fresh accounts
        try {
          await apiPost('/api/init-merchant', {});
        } catch (e) {
          console.warn('init-merchant call failed (non-critical):', e);
        }
      } else {
        // Don't clear mock user on Firebase sign-out event
        setUser(prev => (prev?.isMock ? prev : null));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in failed:', err);
      throw err;
    }
  };

  const loginAsMock = () => {
    setUser(MOCK_USER);
    setLoading(false);
  };

  const logout = async () => {
    if (!user?.isMock) {
      await signOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginAsMock, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
