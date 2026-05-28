import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import { colors } from '../theme/colors';

export default function OnlineMenuScreen({ navigation }) {
  return (
    <Screen>
      <AppButton
        title="← Retour"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.back}
      />
      <Text style={styles.title}>Mode En ligne</Text>
      <Text style={styles.sub}>Jouez à deux sur le même réseau que le serveur</Text>

      <AppButton
        title="Créer une salle"
        onPress={() => navigation.navigate('CreateRoom')}
        style={styles.btn}
      />
      <AppButton
        title="Rejoindre une salle"
        variant="outline"
        onPress={() => navigation.navigate('JoinRooms')}
        style={styles.btn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
  btn: { marginBottom: 12 },
});
