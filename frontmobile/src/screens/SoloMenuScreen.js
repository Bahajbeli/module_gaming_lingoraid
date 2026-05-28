import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import { SOLO_GAMES } from '../config';
import { colors } from '../theme/colors';

export default function SoloMenuScreen({ navigation }) {
  return (
    <Screen>
      <AppButton
        title="← Retour"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.back}
      />

      <Text style={styles.heading}>Mode Solo</Text>
      <Text style={styles.sub}>Choisissez un jeu d’entraînement</Text>

      {SOLO_GAMES.map((game) => (
        <Pressable
          key={game.id}
          style={[styles.card, { borderColor: game.color }]}
          onPress={() =>
            navigation.navigate(game.screen, game.params || undefined)
          }
        >
          <Text style={styles.emoji}>{game.emoji}</Text>
          <View style={styles.cardText}>
            <Text style={styles.title}>{game.title}</Text>
            <Text style={styles.desc}>{game.description}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  emoji: { fontSize: 36, marginRight: 14 },
  cardText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
