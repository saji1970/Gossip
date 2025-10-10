// Firebase Auth Service - Simulated for standalone app
// In production, this would connect to Firebase

interface User {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthError {
  code: string;
  message: string;
}

class FirebaseAuthService {
  private currentUser: User | null = null;
  private users: Map<string, { email: string; password: string; displayName: string }> = new Map();

  // Initialize with a test user
  constructor() {
    // Add a default test user
    this.users.set('test@test.com', {
      email: 'test@test.com',
      password: 'test123',
      displayName: 'Test User'
    });
  }

  async signIn(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = this.users.get(email.toLowerCase());
        
        if (!user) {
          reject({
            code: 'auth/user-not-found',
            message: 'No user found with this email address'
          } as AuthError);
          return;
        }

        if (user.password !== password) {
          reject({
            code: 'auth/wrong-password',
            message: 'Incorrect password'
          } as AuthError);
          return;
        }

        this.currentUser = {
          uid: this.generateUID(email),
          email: user.email,
          displayName: user.displayName
        };

        resolve(this.currentUser);
      }, 500);
    });
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.users.has(email.toLowerCase())) {
          reject({
            code: 'auth/email-already-in-use',
            message: 'This email is already registered'
          } as AuthError);
          return;
        }

        if (password.length < 6) {
          reject({
            code: 'auth/weak-password',
            message: 'Password must be at least 6 characters'
          } as AuthError);
          return;
        }

        // Store the new user
        this.users.set(email.toLowerCase(), {
          email: email.toLowerCase(),
          password,
          displayName
        });

        this.currentUser = {
          uid: this.generateUID(email),
          email: email.toLowerCase(),
          displayName
        };

        resolve(this.currentUser);
      }, 500);
    });
  }

  async signOut(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        resolve();
      }, 300);
    });
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async resetPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.users.has(email.toLowerCase())) {
          reject({
            code: 'auth/user-not-found',
            message: 'No user found with this email address'
          } as AuthError);
          return;
        }
        resolve();
      }, 500);
    });
  }

  private generateUID(email: string): string {
    return `user_${email.replace(/[@.]/g, '_')}_${Date.now()}`;
  }

  // Helper method to get all registered users (for testing)
  getAllUsers(): string[] {
    return Array.from(this.users.keys());
  }
}

export const firebaseAuth = new FirebaseAuthService();
export type { User, AuthError };
