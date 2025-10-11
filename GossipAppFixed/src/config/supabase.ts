import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase project credentials
const SUPABASE_URL = 'https://izbwquyuajlqpvpjfkoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YndxdXl1YWpscXB2cGpma296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDMwNzYsImV4cCI6MjA3NTc3OTA3Nn0.UOtQym5PIeNZths33gh3pquS9C7xDvLO_7ceKxNsAmU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  USERS: 'users',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'group_members',
  MESSAGES: 'messages',
  USERNAME_MAP: 'username_map',
} as const;

