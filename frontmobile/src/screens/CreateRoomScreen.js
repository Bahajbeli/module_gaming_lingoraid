import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { GAME_TYPES, ROUND_OPTIONS, TIMER_OPTIONS } from '../config';
import { colors } from '../theme/colors';

export default function CreateRoomScreen({ navigation }) {
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState('quiz');
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [roundsCount, setRoundsCount] = useState(3);
  const [randomMode, setRandomMode] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showRounds =
    randomMode || gameType === 'creativite' || gameType === 'mots-croises';

  const create = async () => {
    if (!name.trim()) {
      setError('Nom de la salle requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/rooms/create', {
        name: name.trim(),
        isPrivate,
        gameType: randomMode ? 'random' : gameType,
        timerSeconds,
        roundsCount: showRounds ? roundsCount : 1,
        randomMode,
      });
      if (res.data.success) {
        navigation.replace('RoomLobby', { roomId: res.data.room.id });
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Créer une salle</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Nom</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ma salle"
      />

      <View style={styles.row}>
        <Text style={styles.label}>Mode au hasard</Text>
        <Switch value={randomMode} onValueChange={setRandomMode} />
      </View>

      {!randomMode && (
        <>
          <Text style={styles.label}>Jeu</Text>
          <View style={styles.chips}>
            {GAME_TYPES.map((g) => (
              <AppButton
                key={g.id}
                title={`${g.emoji} ${g.label}`}
                variant={gameType === g.id ? 'primary' : 'outline'}
                onPress={() => setGameType(g.id)}
                style={styles.chip}
              />
            ))}
          </View>
        </>
      )}

      {showRounds && (
        <>
          <Text style={styles.label}>Nombre de tours (1–7)</Text>
          <View style={styles.chips}>
            {ROUND_OPTIONS.map((n) => (
              <AppButton
                key={n}
                title={String(n)}
                variant={roundsCount === n ? 'primary' : 'outline'}
                onPress={() => setRoundsCount(n)}
                style={styles.roundChip}
              />
            ))}
          </View>
        </>
      )}

      {(gameType === 'quiz' || randomMode) && (
        <>
          <Text style={styles.label}>Timer quiz (secondes)</Text>
          <View style={styles.chips}>
            {TIMER_OPTIONS.map((t) => (
              <AppButton
                key={t}
                title={`${t}s`}
                variant={timerSeconds === t ? 'primary' : 'outline'}
                onPress={() => setTimerSeconds(t)}
                style={styles.roundChip}
              />
            ))}
          </View>
        </>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Salle privée</Text>
        <Switch value={isPrivate} onValueChange={setIsPrivate} />
      </View>

      <AppButton title="Créer" onPress={create} loading={loading} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  chips: { gap: 8 },
  chip: { marginBottom: 6 },
  roundChip: { marginBottom: 6, alignSelf: 'flex-start' },
  error: { color: colors.error, marginBottom: 8 },
});
