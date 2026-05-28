import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'roadMapProgress_';

export async function loadProgress(gameType) {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${gameType}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { currentStage: 1, completedStages: [] };
}

export async function saveProgress(gameType, progress) {
  await AsyncStorage.setItem(`${KEY_PREFIX}${gameType}`, JSON.stringify(progress));
}

export async function markStageComplete(gameType, stageNumber, totalStages) {
  const current = await loadProgress(gameType);
  const completed = new Set(current.completedStages || []);
  completed.add(stageNumber);
  const nextStage = Math.min(stageNumber + 1, Math.max(1, totalStages));
  const updated = {
    currentStage: Math.max(current.currentStage || 1, nextStage),
    completedStages: Array.from(completed).sort((a, b) => a - b),
  };
  await saveProgress(gameType, updated);
  return updated;
}

export function getStageStatus(stageNumber, currentStage, completedStages) {
  if (completedStages.includes(stageNumber)) return 'completed';
  if (stageNumber === currentStage) return 'current';
  if (stageNumber < currentStage) return 'completed';
  return 'locked';
}
