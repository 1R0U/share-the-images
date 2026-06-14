import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useRoomStore } from '../../../src/stores/roomStore';

export default function RoomListScreen() {
  const { rooms, currentRoomId, setCurrentRoom } = useRoomStore();

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TouchableOpacity style={styles.createBtn} onPress={() => router.replace('/(main)/room/create')}>
            <Text style={styles.createBtnText}>+ 新しいルームを作成</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, item.id === currentRoomId && styles.activeRow]}
            onPress={() => { setCurrentRoom(item.id); router.back(); }}
          >
            <Text style={styles.roomName}>{item.name}</Text>
            {item.id === currentRoomId && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.joinBtn} onPress={() => router.replace('/(main)/room/join')}>
            <Text style={styles.joinBtnText}>招待URLで参加</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  createBtn: { margin: 16, padding: 14, backgroundColor: '#222', borderRadius: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  activeRow: { backgroundColor: '#f8f8f8' },
  roomName: { fontSize: 16 },
  check: { color: '#4285F4', fontWeight: '700', fontSize: 18 },
  joinBtn: { margin: 16, padding: 14, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center' },
  joinBtnText: { color: '#555', fontWeight: '500', fontSize: 15 },
});
