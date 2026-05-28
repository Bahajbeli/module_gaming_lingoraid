import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { colors } from '../theme/colors';

function parseTheme(metadata) {
  try {
    const m = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    return m?.theme || 'Conversation générale';
  } catch {
    return 'Conversation générale';
  }
}

export default function SoloSimulationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simulations, setSimulations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hearts, setHearts] = useState({ hearts: 2, canPlay: true });
  const [conversation, setConversation] = useState([]);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [simRes, heartsRes] = await Promise.all([
          api.get('/api/simulation/admin'),
          api.get('/api/simulation/hearts'),
        ]);
        setSimulations(simRes.data || []);
        if (heartsRes.data?.success !== false) {
          setHearts(heartsRes.data);
        }
      } catch (e) {
        setError(e.response?.data?.error || 'Impossible de charger les simulations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toHistory = (msgs) =>
    msgs
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

  const startConversation = async (sim) => {
    if (!hearts.canPlay || hearts.hearts <= 0) {
      setError('Plus de cœurs. Revenez dans 24 h.');
      return;
    }
    setSelected(sim);
    setProcessing(true);
    setError('');
    try {
      const theme = parseTheme(sim.metadata);
      const res = await api.post(
        '/api/voice/conversation',
        {
          theme,
          imageDescription: sim.description || '',
          conversationHistory: [],
        },
        { timeout: 45000 }
      );
      if (res.data.success) {
        setConversation([
          {
            role: 'assistant',
            content: res.data.ai_response || 'Willkommen!',
          },
        ]);
        setStarted(true);
      }
    } catch (e) {
      setError(
        e.response?.data?.error ||
          e.response?.data?.details ||
          'Erreur au démarrage de la conversation'
      );
    } finally {
      setProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selected || processing) return;
    const userMsg = { role: 'user', content: input.trim() };
    const nextConvo = [...conversation, userMsg];
    setConversation(nextConvo);
    setInput('');
    setProcessing(true);
    try {
      const theme = parseTheme(selected.metadata);
      const res = await api.post(
        '/api/voice/conversation',
        {
          theme,
          imageDescription: selected.description || '',
          conversationHistory: toHistory(nextConvo),
          userMessage: userMsg.content,
        },
        { timeout: 45000 }
      );
      if (res.data.game_over || res.data.lose_message) {
        await api.post('/api/simulation/hearts/lose');
        const h = await api.get('/api/simulation/hearts');
        if (h.data) setHearts(h.data);
        setConversation((c) => [
          ...c,
          { role: 'system', content: 'Partie perdue — hors sujet ou erreur.' },
        ]);
        setStarted(false);
        return;
      }
      if (res.data.success) {
        setConversation((c) => [
          ...c,
          { role: 'assistant', content: res.data.ai_response },
        ]);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de communication');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (!selected) {
    return (
      <Screen>
        <AppButton title="← Retour" variant="outline" onPress={() => navigation.goBack()} style={styles.back} />
        <Text style={styles.title}>Simulation</Text>
        <Text style={styles.hearts}>
          ❤️ {hearts.hearts ?? 0} / {hearts.maxHearts ?? 2} cœurs
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {simulations.length === 0 ? (
          <Text style={styles.muted}>Aucune simulation disponible</Text>
        ) : (
          simulations.map((sim) => (
            <AppButton
              key={sim.id}
              title={sim.title || 'Simulation'}
              onPress={() => startConversation(sim)}
              style={styles.simBtn}
              loading={processing}
            />
          ))
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppButton
          title="← Scénarios"
          variant="outline"
          onPress={() => {
            setSelected(null);
            setStarted(false);
            setConversation([]);
          }}
          style={styles.back}
        />
        <Text style={styles.title}>{selected.title}</Text>
        <Text style={styles.theme}>Thème : {parseTheme(selected.metadata)}</Text>

        {!started ? (
          <AppButton title="Démarrer" onPress={() => startConversation(selected)} loading={processing} />
        ) : (
          <>
            <FlatList
              data={conversation}
              keyExtractor={(_, i) => String(i)}
              style={styles.chat}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.bubble,
                    item.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                    item.role === 'system' && styles.bubbleSys,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      item.role === 'user' && styles.bubbleTextUser,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              )}
            />
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Message en allemand…"
                multiline
                editable={!processing}
              />
              <AppButton title="→" onPress={sendMessage} loading={processing} style={styles.send} />
            </View>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  theme: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  hearts: { marginBottom: 12, fontWeight: '600' },
  simBtn: { marginBottom: 10 },
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  error: { color: colors.error, marginVertical: 8, textAlign: 'center' },
  chat: { flex: 1, marginBottom: 8 },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleSys: { alignSelf: 'center', backgroundColor: '#fee2e2' },
  bubbleText: { fontSize: 15, color: colors.text },
  bubbleTextUser: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    maxHeight: 100,
    backgroundColor: colors.surface,
  },
  send: { minWidth: 56 },
});
