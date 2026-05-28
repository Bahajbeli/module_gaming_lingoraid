import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { io } from 'socket.io-client';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { colors } from '../theme/colors';

export default function RoomLobbyScreen({ route, navigation }) {
  const { roomId } = route.params;
  const { user, token } = useAuth();
  const socketRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/api/rooms/${roomId}`);
      if (res.data.success) {
        setRoom(res.data.room);
        const me = res.data.room.players.find((p) => p.id === user?.id);
        setIsReady(me?.isReady || false);
        if (res.data.room.status === 'in-progress') {
          navigation.replace('MatchPlay', { roomId });
        }
      }
    } catch {
      alert('Salle introuvable');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRoom();
    }, [roomId])
  );

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit('join-room', { roomId });

    socket.on('player-ready-changed', () => fetchRoom());
    socket.on('player-joined', () => fetchRoom());
    socket.on('player-left', () => fetchRoom());
    socket.on('game-started', () => {
      navigation.replace('MatchPlay', { roomId });
    });

    return () => socket.disconnect();
  }, [token, roomId, navigation]);

  const toggleReady = async () => {
    try {
      const res = await api.post(`/api/rooms/${roomId}/ready`);
      if (res.data.success) {
        setIsReady(res.data.isReady);
        socketRef.current?.emit('toggle-ready', { roomId });
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur');
    }
  };

  const leave = async () => {
    socketRef.current?.emit('leave-room', { roomId });
    try {
      await api.post(`/api/rooms/${roomId}/leave`);
    } catch {
      /* ignore */
    }
    navigation.navigate('OnlineMenu');
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  const allReady =
    room?.players?.length >= 2 && room.players.every((p) => p.isReady);

  return (
    <Screen>
      <Text style={styles.title}>{room?.name}</Text>
      <Text style={styles.config}>{room?.gameConfig?.label}</Text>
      {room?.gameConfig?.roundsCount > 1 && (
        <Text style={styles.config}>{room.gameConfig.roundsCount} tours</Text>
      )}

      <View style={styles.players}>
        <Text style={styles.section}>Joueurs ({room?.players?.length || 0}/2)</Text>
        {room?.players?.map((p) => (
          <View key={p.id} style={styles.playerRow}>
            <Text style={styles.playerEmail}>
              {p.id === user?.id ? 'Vous' : p.email}
              {p.isHost ? ' (hôte)' : ''}
            </Text>
            <Text style={p.isReady ? styles.ready : styles.wait}>
              {p.isReady ? 'Prêt' : 'En attente'}
            </Text>
          </View>
        ))}
      </View>

      {allReady && (
        <Text style={styles.hint}>Démarrage de la partie…</Text>
      )}

      <AppButton
        title={isReady ? 'Annuler prêt' : 'Je suis prêt'}
        onPress={toggleReady}
        disabled={room?.players?.length < 2}
        style={{ marginTop: 16 }}
      />
      <AppButton title="Quitter la salle" variant="outline" onPress={leave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  config: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  players: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerEmail: { fontSize: 14, flex: 1 },
  ready: { color: colors.success, fontWeight: '600' },
  wait: { color: colors.textMuted },
  hint: { textAlign: 'center', color: colors.primary, marginTop: 16, fontWeight: '600' },
});
