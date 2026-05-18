'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthState, TecUser }                from '../types';
import { getStoredUser }                     from '../client/cookies';
import { loginWithPi, isPiBrowser }          from '../client/pi';
import { logout }                            from '../client/refresh';

export const usePiAuth = (options?: {
  onIncompletePayment?: (payment: unknown) => void;
  onAfterLogin?:        (result: unknown) => Promise<void>;
}) => {
  const [state, setState] = useState<AuthState>({
    user:            null,
    isLoading:       true,
    isAuthenticated: false,
    isNewUser:       false,
    error:           null,
    errorType:       null,
  });

  useEffect(() => {
    const stored = getStoredUser<TecUser>();
    setState(prev => ({
      ...prev,
      user:            stored,
      isAuthenticated: !!stored,
      isLoading:       false,
    }));
  }, []);

  const login = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, errorType: null }));
    try {
      const result = await loginWithPi({
        onIncompletePayment: options?.onIncompletePayment,
        onAfterLogin:        options?.onAfterLogin,
      });
      const user = result.user ?? getStoredUser<TecUser>();
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: !!user,
        isNewUser:       result.isNewUser,
        isLoading:       false,
        error:           null,
        errorType:       null,
      }));
      return result;
    } catch (err: unknown) {
      const message   = err instanceof Error ? err.message : 'Authentication failed';
      const errorType = message.includes('Pi Browser') ? 'not_pi_browser'
                      : message.includes('timed out')  ? 'timeout'
                      : 'auth_failed';
      setState(prev => ({ ...prev, isLoading: false, error: message, errorType }));
      throw err;
    }
  }, [options]);

  const logoutUser = useCallback(async () => {
    await logout();
    setState({
      user: null, isAuthenticated: false,
      isNewUser: false, isLoading: false,
      error: null, errorType: null,
    });
  }, []);

  return { ...state, login, logout: logoutUser, isPiBrowser };
};
