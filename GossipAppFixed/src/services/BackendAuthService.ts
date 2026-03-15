import * as api from './api';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
}

class BackendAuthService {
  async signUp(
    email: string,
    password: string,
    displayName: string,
    username?: string,
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const result = await api.register(
        email,
        password,
        displayName,
        username || email.split('@')[0],
      );

      if (!result.success || !result.user) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      if (result.token) {
        await api.setToken(result.token);
      }

      return { success: true, user: result.user };
    } catch (error: any) {
      const msg = error.message || 'Registration failed';
      try {
        const parsed = JSON.parse(msg.replace(/^API \d+: /, ''));
        return { success: false, error: parsed.detail || msg };
      } catch {
        return { success: false, error: msg };
      }
    }
  }

  async signIn(
    usernameOrEmail: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const result = await api.login(usernameOrEmail, password);

      if (!result.success || !result.user) {
        return { success: false, error: result.error || 'Login failed' };
      }

      if (result.token) {
        await api.setToken(result.token);
      }

      return { success: true, user: result.user };
    } catch (error: any) {
      const msg = error.message || 'Login failed';
      try {
        const parsed = JSON.parse(msg.replace(/^API \d+: /, ''));
        return { success: false, error: parsed.detail || msg };
      } catch {
        return { success: false, error: msg };
      }
    }
  }

  async signOut(): Promise<void> {
    await api.logout();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const result = await api.getMe();
      return result.user || null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await api.getToken();
    return !!token;
  }
}

export const backendAuth = new BackendAuthService();
