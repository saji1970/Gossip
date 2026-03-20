import { useEffect, useRef, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';
import { gossipBot } from '../modules/gossip/GossipBot';
import { GossipContext, GossipResponse } from '../modules/gossip/types';
import { Group } from '../utils/GroupStorage';
import * as api from '../services/api';

export function useGossipBot() {
  const { user, groups, refreshGroups } = useApp();
  const initializedRef = useRef(false);
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    if (!initializedRef.current) {
      gossipBot.initialize();
      initializedRef.current = true;
    }
    // Check backend availability on mount
    api.healthCheck().then(setBackendAvailable).catch(() => setBackendAvailable(false));
  }, []);

  const processInput = useCallback(
    async (
      text: string,
      currentScreen: string,
      currentGroup?: Group,
    ): Promise<GossipResponse> => {
      const context: GossipContext = {
        user: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
        groups,
        currentScreen,
        currentGroup,
      };
      const response = await gossipBot.processInput(text, context);

      // Refresh groups after successful create/add actions so the UI stays in sync
      if (
        response.type === 'clarify' || response.type === 'info'
      ) {
        const msg = response.message.toLowerCase();
        if (
          msg.includes('created!') ||
          msg.includes('added') ||
          msg.includes('invite')
        ) {
          // Debounced refresh — don't block the response
          setTimeout(() => refreshGroups(), 500);
        }
      }

      return response;
    },
    [user, groups, refreshGroups],
  );

  const reset = useCallback(() => {
    gossipBot.reset();
  }, []);

  return { processInput, reset, backendAvailable };
}
