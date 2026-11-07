import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthUser } from '../types';
import { disablePush } from '../services/devicePush';
import {
  authApi,
  leadApi,
  inventoryApi,
  initApiService,
  setOnUnauthorized,
  setApiBaseUrl,
  getApiBaseUrl,
  setSessionToken,
  setStoredUser,
  normalizeApiBaseUrl,
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
  const locationsVersion = useRef(0);

  const handleUnauthorized = useCallback(() => {
    locationsVersion.current++;
    setUser(null);
    setLocations([]);
    setSelectedRooftop('All Locations');
    setAuthError(null);
    void Promise.all([setSessionToken(null), setStoredUser(null)]).catch(() => {});
  }, []);

  const fetchLocations = useCallback(async (currentUser: AuthUser) => {
    const version = ++locationsVersion.current;
    setLocationsError(null);
    try {
      const [crmRes, invRes] = await Promise.allSettled([
        leadApi.getCrmRooftops(),
        inventoryApi.getInventoryRooftops(),
      ]);
      if (version !== locationsVersion.current) return;

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
        setLocations(currentUser.allowedSites.filter(site => !['*', 'All Locations', 'South Morang'].includes(site)));
        if (crmRes.status === 'rejected' && invRes.status === 'rejected') setLocationsError('Unable to load dealership list.');
      }
    } catch (err: any) {
      console.warn('Locations load error:', err);
      setLocationsError('Unable to load dealership list.');
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(handleUnauthorized);

    initApiService().then(async ({ url, token }) => {
      setApiUrlState(url);
      if (token) {
        try {
          const res = await authApi.me();
          if (res.success && res.data) {
            setUser(res.data);
            await fetchLocations(res.data);
          }
        } catch {
          setUser(null);
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
      await disablePush().catch(() => {});
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      locationsVersion.current++;
      setUser(null);
      setLocations([]);
      setSelectedRooftop('All Locations');
      setIsLoading(false);
    }
  };

  const reloadLocations = async () => {
    if (user) {
      await fetchLocations(user);
    }
  };

  const updateApiUrl = async (url: string) => {
    const normalized = normalizeApiBaseUrl(url);
    if (normalized === getApiBaseUrl()) return;
    if (user) await logout();
    await setApiBaseUrl(normalized);
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

