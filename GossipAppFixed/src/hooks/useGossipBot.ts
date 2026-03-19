import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { gossipBot } from '../modules/gossip/GossipBot';
import { GossipContext, GossipResponse } from '../modules/gossip/types';
import { Group } from '../utils/GroupStorage';

export function useGossipBot() {
  const { user, groups } = useApp();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      gossipBot.initialize();
      initializedRef.current = true;
    }
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
      return gossipBot.processInput(text, context);
    },
    [user, groups],
  );

  const reset = useCallback(() => {
    gossipBot.reset();
  }, []);

  return { processInput, reset };
}
