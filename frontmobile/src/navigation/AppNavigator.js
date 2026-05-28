import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import GamingScreen from '../screens/GamingScreen';
import SoloMenuScreen from '../screens/SoloMenuScreen';
import SoloQuizScreen from '../screens/SoloQuizScreen';
import SoloVocabQuizScreen from '../screens/SoloVocabQuizScreen';
import SoloCreativityScreen from '../screens/SoloCreativityScreen';
import SoloCrosswordScreen from '../screens/SoloCrosswordScreen';
import SoloRoadMapScreen from '../screens/SoloRoadMapScreen';
import SoloBingoScreen from '../screens/SoloBingoScreen';
import SoloSimulationScreen from '../screens/SoloSimulationScreen';
import SoloShadowingScreen from '../screens/SoloShadowingScreen';
import OnlineMenuScreen from '../screens/OnlineMenuScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomsScreen from '../screens/JoinRoomsScreen';
import RoomLobbyScreen from '../screens/RoomLobbyScreen';
import MatchPlayScreen from '../screens/MatchPlayScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Gaming" component={GamingScreen} />
      <Stack.Screen name="SoloMenu" component={SoloMenuScreen} />
      <Stack.Screen name="SoloQuiz" component={SoloQuizScreen} />
      <Stack.Screen name="SoloVocabQuiz" component={SoloVocabQuizScreen} />
      <Stack.Screen name="SoloRoadMap" component={SoloRoadMapScreen} />
      <Stack.Screen name="SoloCreativity" component={SoloCreativityScreen} />
      <Stack.Screen name="SoloCrossword" component={SoloCrosswordScreen} />
      <Stack.Screen name="SoloBingo" component={SoloBingoScreen} />
      <Stack.Screen name="SoloSimulation" component={SoloSimulationScreen} />
      <Stack.Screen name="SoloShadowing" component={SoloShadowingScreen} />
      <Stack.Screen name="OnlineMenu" component={OnlineMenuScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
      <Stack.Screen name="JoinRooms" component={JoinRoomsScreen} />
      <Stack.Screen name="RoomLobby" component={RoomLobbyScreen} />
      <Stack.Screen name="MatchPlay" component={MatchPlayScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
