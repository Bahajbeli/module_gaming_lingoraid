import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { API_URL } from '../config';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const result = isRegister
      ? await register({ email, password, firstName, lastName, region })
      : await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>LingoRaid</Text>
        <Text style={styles.subtitle}>
          {isRegister ? 'Créer un compte' : 'Connexion'}
        </Text>
        <Text style={styles.apiHint}>API : {API_URL}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isRegister && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Région (optionnel)"
              value={region}
              onChangeText={setRegion}
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <AppButton
          title={isRegister ? "S'inscrire" : 'Se connecter'}
          onPress={handleSubmit}
          loading={loading}
        />

        <AppButton
          title={
            isRegister
              ? 'Déjà un compte ? Se connecter'
              : 'Pas de compte ? S\'inscrire'
          }
          variant="outline"
          onPress={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          style={styles.switch}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  apiHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  error: {
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  switch: {
    marginTop: 12,
  },
});
