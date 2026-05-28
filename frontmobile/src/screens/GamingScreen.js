import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import { colors } from '../theme/colors';

export default function GamingScreen({ navigation }) {
  return (
    <Screen>
      <AppButton
        title="← Retour"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.back}
      />

      <Text style={styles.heading}>Gaming Arena</Text>
      <Text style={styles.sub}>Choisissez votre mode</Text>

      <Pressable
        style={styles.modeCard}
        onPress={() => navigation.navigate('SoloMenu')}
      >
        <Text style={styles.modeEmoji}>🎮</Text>
        <Text style={styles.modeTitle}>Mode Solo</Text>
        <Text style={styles.modeDesc}>
          Article quiz, vocabulary quiz, crosswords, bingo, simulation…
        </Text>
      </Pressable>

      <Pressable
        style={[styles.modeCard, styles.modeOnline]}
        onPress={() => navigation.navigate('OnlineMenu')}
      >
        <Text style={styles.modeEmoji}>👥</Text>
        <Text style={styles.modeTitle}>Mode En ligne</Text>
        <Text style={styles.modeDesc}>
          Créer ou rejoindre une salle (quiz, créativité, bingo…)
        </Text>
      </Pressable>
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
  modeCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modeOnline: {
    borderColor: colors.primary,
    backgroundColor: '#eef2ff',
  },
  modeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modeDesc: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
});
