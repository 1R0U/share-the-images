import { create } from 'zustand';
import type { Database } from '../types/database';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomState {
  rooms: Room[];
  currentRoomId: string | null;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (roomId: string | null) => void;
  addRoom: (room: Room) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoomId: null,
  setRooms: (rooms) => set({ rooms, currentRoomId: rooms[0]?.id ?? null }),
  setCurrentRoom: (currentRoomId) => set({ currentRoomId }),
  addRoom: (room) => set((s) => ({ rooms: [...s.rooms, room] })),
}));
