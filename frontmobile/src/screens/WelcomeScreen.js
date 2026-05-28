import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export default function WelcomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>LingoRaid</Text>
        <Text style={styles.tagline}>Apprenez l&apos;allemand en jouant</Text>
        {user?.email && (
          <Text style={styles.email}>Connecté : {user.email}</Text>
        )}
      </View>

      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🎮</Text>
          <Text style={styles.cardTitle}>Gaming Arena</Text>
          <Text style={styles.cardDesc}>
            Quiz, créativité, mots croisés, bingo et parties en ligne
          </Text>
          <AppButton
            title="Jouer"
            onPress={() => navigation.navigate('Gaming')}
            style={styles.cardBtn}
          />
        </View>
      </View>

      <AppButton
        title="Se déconnecter"
        variant="outline"
        onPress={logout}
        style={styles.logout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 12,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    fontSize: 17,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  email: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textMuted,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  cardBtn: {
    marginTop: 4,
  },
  logout: {
    marginTop: 24,
  },
});
