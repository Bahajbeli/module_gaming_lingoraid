import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { colors } from '../theme/colors';

export default function JoinRoomsScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/rooms/public');
      setRooms(res.data.rooms || []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const join = async (roomId) => {
    setJoining(roomId);
    try {
      const res = await api.post(`/api/rooms/${roomId}/join`);
      if (res.data.success) {
        navigation.replace('RoomLobby', { roomId });
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Impossible de rejoindre');
    } finally {
      setJoining(null);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <AppButton title="← Retour" variant="outline" onPress={() => navigation.goBack()} />
        <AppButton title="Actualiser" variant="outline" onPress={load} />
      </View>
      <Text style={styles.title}>Salles publiques</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune salle disponible</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => join(item.id)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.gameConfig?.label || 'Partie'} · {item.playersCount}/{item.maxPlayers}
              </Text>
              {joining === item.id ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.join}>Rejoindre →</Text>
              )}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, color: colors.text },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  join: { marginTop: 8, color: colors.primary, fontWeight: '600' },
});
