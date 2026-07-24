import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomState {
  rooms: Room[];
  currentRoomId: string | null;
  loading: boolean;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (roomId: string | null) => void;
  addRoom: (room: Room) => void;
  fetchRooms: (userId: string) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoomId: null,
  loading: false,
  setRooms: (rooms) => set({ rooms, currentRoomId: rooms[0]?.id ?? null }),
  setCurrentRoom: (currentRoomId) => set({ currentRoomId }),
  addRoom: (room) => set((s) => ({ rooms: [...s.rooms, room] })),
  fetchRooms: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('room_members')
      .select('rooms(*)')
      .eq('user_id', userId);
    const rooms = (data ?? []).flatMap((m) => m.rooms ?? []) as Room[];
    set({ rooms, currentRoomId: rooms[0]?.id ?? null, loading: false });
  },
}));

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
    useRoomStore.getState().fetchRooms(session.user.id);
  }
  if (event === 'SIGNED_OUT') {
    useRoomStore.setState({ rooms: [], currentRoomId: null, loading: false });
  }
});
