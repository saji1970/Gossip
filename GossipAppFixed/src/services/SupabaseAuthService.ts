import { supabase, TABLES } from '../config/supabase';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
}

interface StoredUser {
  id: string;
  email: string;
  display_name: string;
  username: string;
  created_at: string;
}

class SupabaseAuthService {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, displayName: string, username?: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      console.log('📝 Signing up user:', { email, displayName, username });

      // Check if username already exists
      if (username) {
        const { data: existingUsername } = await supabase
          .from(TABLES.USERNAME_MAP)
          .select('username')
          .eq('username', username.toLowerCase())
          .single();

        if (existingUsername) {
          return { success: false, error: 'Username already taken' };
        }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('Auth signup error:', authError);
        return { success: false, error: authError?.message || 'Failed to create account' };
      }

      // Create user profile
      const userId = authData.user.id;
      const userProfile: StoredUser = {
        id: userId,
        email,
        display_name: displayName,
        username: username || email.split('@')[0],
        created_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from(TABLES.USERS)
        .insert(userProfile);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { success: false, error: 'Failed to create user profile' };
      }

      // Store username mapping if provided
      if (username) {
        await supabase
          .from(TABLES.USERNAME_MAP)
          .insert({ username: username.toLowerCase(), user_id: userId });
      }

      const user: User = {
        uid: userId,
        email,
        displayName,
        username: username || email.split('@')[0],
      };

      console.log('✅ User signed up successfully:', user);
      return { success: true, user };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  /**
   * Sign in user with email/username and password
   */
  async signIn(usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      console.log('🔐 Signing in:', usernameOrEmail);

      let email = usernameOrEmail;

      // If it's a username (no @), look up the email
      if (!usernameOrEmail.includes('@')) {
        const { data: usernameData } = await supabase
          .from(TABLES.USERNAME_MAP)
          .select('user_id')
          .eq('username', usernameOrEmail.toLowerCase())
          .single();

        if (!usernameData) {
          return { success: false, error: 'Username not found' };
        }

        // Get email from user profile
        const { data: userData } = await supabase
          .from(TABLES.USERS)
          .select('email')
          .eq('id', usernameData.user_id)
          .single();

        if (!userData) {
          return { success: false, error: 'User not found' };
        }

        email = userData.email;
      }

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('Sign in error:', authError);
        return { success: false, error: 'Invalid credentials' };
      }

      // Get user profile
      const { data: profile } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'User profile not found' };
      }

      const user: User = {
        uid: authData.user.id,
        email: profile.email,
        displayName: profile.display_name,
        username: profile.username,
      };

      console.log('✅ User signed in successfully:', user);
      return { success: true, user };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Failed to sign in' };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      console.log('✅ User signed out');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        return null;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        return null;
      }

      return {
        uid: authUser.id,
        email: profile.email,
        displayName: profile.display_name,
        username: profile.username,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }
}

export const supabaseAuth = new SupabaseAuthService();

