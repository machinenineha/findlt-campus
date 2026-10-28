/**
 * RouteReady Campus - Authentication & Session Management
 * Coordinates with Supabase Auth and provides role-based navigation guards.
 */

import { CONFIG } from './config.js';

class AuthService {
  constructor() {
    this.sessionKey = 'rr_session';
    this.supabase = null;
    this.initSupabase();
  }

  initSupabase() {
    // If Supabase JS SDK is loaded and credentials are provided
    if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
      try {
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      } catch (err) {
        console.warn('Could not initialize Supabase browser client:', err);
      }
    }
  }

  getSession() {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(this.sessionKey);
      return null;
    }
  }

  getUser() {
    const session = this.getSession();
    return session?.user || null;
  }

  isLoggedIn() {
    return !!this.getSession();
  }

  isAdmin() {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  async signIn(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if Supabase client is available
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      if (error) throw error;

      // Fetch user profile from Supabase
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('id, full_name, role, college_id')
        .eq('id', data.user.id)
        .single();

      const sessionData = {
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: profile?.full_name || data.user.user_metadata?.full_name || 'Student',
          role: profile?.role || 'student',
          college_id: profile?.college_id || CONFIG.DEFAULT_COLLEGE_ID
        }
      };

      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      return sessionData;
    }

    // 2. Demo Mode Authentication (Offline evaluation)
    if (normalizedEmail.includes('admin') || password === 'AdminPassword123!') {
      const adminSession = {
        token: 'demo-token-admin',
        user: {
          id: 'usr-admin-001',
          email: normalizedEmail || 'admin@demo.edu',
          full_name: 'Dr. Ramesh Kumar (Transport In-Charge)',
          role: 'admin',
          college_id: CONFIG.DEFAULT_COLLEGE_ID
        }
      };
      localStorage.setItem(this.sessionKey, JSON.stringify(adminSession));
      return adminSession;
    }

    // Default to student demo user
    const studentSession = {
      token: 'demo-token-student',
      user: {
        id: 'usr-student-001',
        email: normalizedEmail || 'student@demo.edu',
        full_name: 'Priya Sharma (Student)',
        role: 'student',
        college_id: CONFIG.DEFAULT_COLLEGE_ID
      }
    };
    localStorage.setItem(this.sessionKey, JSON.stringify(studentSession));
    return studentSession;
  }

  async signUp(email, password, fullName) {
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            college_id: CONFIG.DEFAULT_COLLEGE_ID
            // Note: Never allow role specification in signup metadata!
          }
        }
      });
      if (error) throw error;
      return data;
    }

    // Demo signup
    return this.signIn(email, password);
  }

  async resetPassword(email) {
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login.html?type=recovery`
      });
      if (error) throw error;
      return data;
    }
    return { success: true, message: 'Password recovery instructions sent (demo simulation)' };
  }

  signOut() {
    if (this.supabase) {
      this.supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem(this.sessionKey);
    window.location.href = '/login.html';
  }

  requireAuth(redirectUrl = '/login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  requireAdmin(redirectUrl = '/dashboard.html') {
    if (!this.requireAuth('/login.html')) return false;
    if (!this.isAdmin()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }
}

export const auth = new AuthService();

