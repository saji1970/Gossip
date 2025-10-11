/**
 * Deep Link Service
 * Handles deep links for group invites and other app features
 */

import { Linking } from 'react-native';
import InviteService from './InviteService';

export type DeepLinkAction = 
  | { type: 'invite'; inviteId: string }
  | { type: 'group'; groupId: string }
  | { type: 'unknown' };

class DeepLinkService {
  private listeners: ((action: DeepLinkAction) => void)[] = [];

  /**
   * Initialize deep link handling
   */
  initialize() {
    // Handle initial URL (app was opened with deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleDeepLink(url);
      }
    });

    // Handle deep links when app is already open
    Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });
  }

  /**
   * Parse and handle deep link URL
   */
  private handleDeepLink(url: string) {
    try {
      const action = this.parseDeepLink(url);
      this.notifyListeners(action);
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  /**
   * Parse deep link URL into action
   */
  parseDeepLink(url: string): DeepLinkAction {
    try {
      // Handle gossipin:// scheme
      if (url.startsWith('gossipin://')) {
        const path = url.replace('gossipin://', '');
        const [action, ...params] = path.split('/');

        switch (action) {
          case 'invite':
            if (params[0]) {
              return { type: 'invite', inviteId: params[0] };
            }
            break;
          case 'group':
            if (params[0]) {
              return { type: 'group', groupId: params[0] };
            }
            break;
        }
      }

      // Handle https:// scheme (universal links)
      if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;

        if (path.startsWith('/invite/')) {
          const inviteId = path.split('/invite/')[1];
          if (inviteId) {
            return { type: 'invite', inviteId };
          }
        }

        if (path.startsWith('/group/')) {
          const groupId = path.split('/group/')[1];
          if (groupId) {
            return { type: 'group', groupId };
          }
        }
      }

      return { type: 'unknown' };
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return { type: 'unknown' };
    }
  }

  /**
   * Add listener for deep link actions
   */
  addListener(callback: (action: DeepLinkAction) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  /**
   * Notify all listeners of deep link action
   */
  private notifyListeners(action: DeepLinkAction) {
    this.listeners.forEach((listener) => {
      try {
        listener(action);
      } catch (error) {
        console.error('Error in deep link listener:', error);
      }
    });
  }

  /**
   * Handle invite deep link
   */
  async handleInviteLink(inviteId: string): Promise<void> {
    try {
      await InviteService.acceptInvite(inviteId);
    } catch (error) {
      console.error('Error accepting invite from deep link:', error);
      throw error;
    }
  }
}

export default new DeepLinkService();

