'use client';
import { api, type Role, type User } from './api';

const TOKEN_KEY = 'vtoken';
const USER_KEY = 'vuser';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === 'object' && u.id ? (u as User) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getRole(): Role {
  return getUser()?.role ?? 'owner';
}

/** Where "home" is depends on who you are — a mechanic landing on /dashboard
 *  just gets bounced back, which is what the hardcoded link used to do. */
export function homeHref(role: Role = getRole()): string {
  if (role === 'mechanic') return '/mechanic';
  if (role === 'seller') return '/seller';
  return '/dashboard';
}

/**
 * Re-reads the profile from the server and refreshes the cached copy.
 * The cached user is written at login and then never updated, so anything that
 * changes server-side (workshop coordinates, role, name) would otherwise stay
 * stale until the next login. Falls back to the cached copy when offline.
 */
export async function refreshUser(): Promise<User | null> {
  try {
    const user = await api.auth.me();
    saveUser(user);
    return user;
  } catch {
    return getUser();
  }
}
