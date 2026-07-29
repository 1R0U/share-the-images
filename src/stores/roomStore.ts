import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Room = Database['public']['Tables']['rooms']['Row'];

const ACTIVE_ROOM_STORAGE_KEY = 'active-room-id';

interface RoomState {
  rooms: Room[];
  currentRoomId: string | null;
  loading: boolean;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (roomId: string | null) => void;
  addRoom: (room: Room) => void;
  fetchRooms: (userId: string) => Promise<void>;
}

let fetchGeneration = 0;

const persistActiveRoomId = (roomId: string | null) => {
  const write = roomId
    ? AsyncStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, roomId)
    : AsyncStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
  write.catch(() => {});
};

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoomId: null,
  loading: false,
  setRooms: (rooms) => set({ rooms, currentRoomId: rooms[0]?.id ?? null }),
  setCurrentRoom: (currentRoomId) => {
    persistActiveRoomId(currentRoomId);
    set({ currentRoomId });
  },
  addRoom: (room) => set((s) => ({ rooms: [...s.rooms, room] })),
  fetchRooms: async (userId) => {
    const generation = ++fetchGeneration;
    set({ loading: true });
    try {
      const [{ data, error }, savedRoomId] = await Promise.all([
        supabase.from('room_members').select('rooms(*)').eq('user_id', userId),
        AsyncStorage.getItem(ACTIVE_ROOM_STORAGE_KEY).catch(() => null),
      ]);
      if (error) throw error;
      if (generation !== fetchGeneration) return;
      const rooms = (data ?? []).flatMap((m) => m.rooms ?? []) as Room[];
      const currentRoomId = rooms.find((r) => r.id === savedRoomId)?.id ?? rooms[0]?.id ?? null;
      set({ rooms, currentRoomId, loading: false });
    } catch {
      if (generation !== fetchGeneration) return;
      set({ loading: false });
    }
  },
}));

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
    useRoomStore.getState().fetchRooms(session.user.id);
  }
  if (event === 'SIGNED_OUT') {
    fetchGeneration++;
    persistActiveRoomId(null);
    useRoomStore.setState({ rooms: [], currentRoomId: null, loading: false });
  }
});
