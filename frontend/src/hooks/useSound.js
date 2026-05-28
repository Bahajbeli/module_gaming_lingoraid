import { useCallback, useRef, useEffect } from 'react';

// Singleton AudioContext to prevent creating too many contexts
let globalAudioCtx = null;

const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      globalAudioCtx = new AudioContext();
    }
  }
  // Resume context if suspended (browser autoplay policy)
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
};

export const useSound = () => {
  // Use a ref to store user interaction so we only try to play after interaction
  const interactedRef = useRef(false);

  useEffect(() => {
    const handleInteraction = () => {
      interactedRef.current = true;
      // Initialize audio context on first interaction to unlock it
      getAudioContext();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const playTone = useCallback((frequency, type, duration, vol = 0.1) => {
    const ctx = getAudioContext();
    if (!ctx || !interactedRef.current) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05); // quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // decay

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playCorrect = useCallback(() => {
    // Pleasant high-pitched chime (Major 3rd)
    playTone(523.25, 'sine', 0.2, 0.2); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.2), 100); // E5
  }, [playTone]);

  const playWrong = useCallback(() => {
    // Low, short buzz
    playTone(150, 'sawtooth', 0.2, 0.1);
    setTimeout(() => playTone(120, 'sawtooth', 0.3, 0.1), 150);
  }, [playTone]);

  const playClick = useCallback(() => {
    // Very short neutral click
    playTone(800, 'sine', 0.05, 0.05);
  }, [playTone]);

  const playFanfare = useCallback(() => {
    // Triumphant arpeggio (C Major)
    playTone(523.25, 'sine', 0.2, 0.15); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.15), 150); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.2, 0.15), 300); // G5
    setTimeout(() => playTone(1046.50, 'sine', 0.6, 0.2), 450); // C6
  }, [playTone]);

  return {
    playCorrect,
    playWrong,
    playClick,
    playFanfare
  };
};
