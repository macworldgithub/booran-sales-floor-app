import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser } from '../types';
import {
  authApi,
  leadApi,
  inventoryApi,
  initApiService,
  setOnUnauthorized,
  setApiBaseUrl,
  getApiBaseUrl,
} from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  locations: string[];
  locationsError: string | null;
  selectedRooftop: string;
  setSelectedRooftop: (rooftop: string) => void;
  reloadLocations: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiUrl: string;
  updateApiUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [selectedRooftop, setSelectedRooftop] = useState<string>('All Locations');
  const [apiUrl, setApiUrlState] = useState<string>(getApiBaseUrl());

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setAuthError(null);
  }, []);

  const fetchLocations = useCallback(async (currentUser: AuthUser) => {
    setLocationsError(null);
    try {
      const [crmRes, invRes] = await Promise.allSettled([
        leadApi.getCrmRooftops(),
        inventoryApi.getInventoryRooftops(),
      ]);

      const names: string[] = [];
      if (crmRes.status === 'fulfilled' && crmRes.value.success && crmRes.value.data) {
        crmRes.value.data.forEach((r) => r.name && names.push(r.name));
      }
      if (invRes.status === 'fulfilled' && invRes.value.success && invRes.value.data) {
        invRes.value.data.forEach((r) => r.name && names.push(r.name));
      }

      const unique = Array.from(new Set(names)).sort();
      if (unique.length > 0) {
        setLocations(unique);
      } else {
        // Fallback default authorised dealerships for South Morang
        if (currentUser.role === 'super_admin') {
          setLocations([
            'BYD South Morang',
            'Chery South Morang',
            'Dandenong Hyundai',
            'Hyundai South Morang',
            'Kia South Morang',
            'Mornington Holden',
          ]);
        } else {
          setLocations([
            'BYD South Morang',
            'Chery South Morang',
            'Hyundai South Morang',
            'Kia South Morang',
          ]);
        }
      }
    } catch (err: any) {
      console.warn('Locations load error:', err);
      setLocationsError('Unable to load dealership list.');
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(handleUnauthorized);

    initApiService().then(async ({ url, token, user: storedUser }) => {
      setApiUrlState(url);
      if (storedUser) {
        setUser(storedUser);
        fetchLocations(storedUser);
      }
      if (token) {
        try {
          const res = await authApi.me();
          if (res.success && res.data) {
            setUser(res.data);
            fetchLocations(res.data);
          }
        } catch {
          // If offline or token expired, keep storedUser if available
        }
      }
      setIsLoading(false);
    });
  }, [handleUnauthorized, fetchLocations]);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await authApi.login(email.trim().toLowerCase(), password);
      if (res.success && res.data?.user) {
        const loggedUser = res.data.user;
        setUser(loggedUser);
        setSelectedRooftop('All Locations');
        try {
          await fetchLocations(loggedUser);
        } catch (locErr) {
          console.warn('Dealership locations load warning:', locErr);
        }
      } else {
        throw new Error(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      const msg = err.message || 'Unable to sign in. Check network connection.';
      setAuthError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setUser(null);
      setLocations([]);
      setIsLoading(false);
    }
  };

  const reloadLocations = async () => {
    if (user) {
      await fetchLocations(user);
    }
  };

  const updateApiUrl = async (url: string) => {
    await setApiBaseUrl(url);
    setApiUrlState(getApiBaseUrl());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        authError,
        locations,
        locationsError,
        selectedRooftop,
        setSelectedRooftop,
        reloadLocations,
        login,
        logout,
        apiUrl,
        updateApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

