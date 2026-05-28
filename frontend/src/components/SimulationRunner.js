import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RotateCcw, Trophy, Volume2, Mic, MicOff, Heart } from 'lucide-react';
import api, { getAssetUrl } from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const MAX_HEARTS = 2;

function formatCountdown(isoDate) {
  if (!isoDate) return '';
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'soon';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function HeartsBar({ hearts, maxHearts = MAX_HEARTS, className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`} title="Hearts de vie">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <Heart
          key={i}
          className={`w-6 h-6 ${i < hearts ? 'fill-red-500 text-red-500' : 'fill-gray-200 text-gray-300'}`}
        />
      ))}
    </div>
  );
}

const OFF_TOPIC_WORDS = [
  'essen', 'pizza', 'manger', 'food', 'restaurant', 'kochen', 'cuisine',
  'umwelt', 'environment', 'klima', 'politik', 'sport', 'musik', 'film',
  'arbeit', 'schule', 'wetter', 'geld', 'liebe', 'technologie', 'computer',
];

function isAnimalTheme(theme) {
  return /haustier|tier|animal|pet|chat|chien|katze|hund|tiere|compagnie|vierbein/i.test(theme || '');
}

/** Detection hors sujet cote client (immediate, sans attendre le serveur) */
/** Historique leger pour l'API (role + content uniquement) */
function toApiHistory(messages) {
  return (messages || [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: String(m.content || '') }));
}

function isOffTopicMessage(message, theme) {
  const msg = (message || '').trim().toLowerCase();
  if (!msg) return false;
  if (!OFF_TOPIC_WORDS.some((w) => msg.includes(w))) return false;
  if (isAnimalTheme(theme)) {
    if (/\b(katze|hund|tier|haustier|pet|futter|tierfutter|katzenfutter|hundefutter)\b/i.test(msg)) {
      return false;
    }
    return true;
  }
  return true;
}

const SimulationRunner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [simulations, setSimulations] = useState([]);
  const [heartsStatus, setHeartsStatus] = useState({
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    canPlay: true,
    nextRegenAt: null,
  });
  const [, setCountdownTick] = useState(0);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [conversation, setConversation] = useState([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [showSimulationList, setShowSimulationList] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const [isReadyToSpeak, setIsReadyToSpeak] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const aiAudioRef = useRef(null);
  const audioStreamRef = useRef(null);

  const fetchHearts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/simulation/hearts');
      if (res.data?.success) {
        setHeartsStatus(res.data);
      }
    } catch (e) {
      console.warn('Hearts simulation:', e.response?.data?.error || e.message);
    }
  }, [user]);

  useEffect(() => {
    fetchSimulations();
    if (user) {
      fetchHearts();
    } else {
      setHeartsStatus({
        hearts: 0,
        maxHearts: MAX_HEARTS,
        canPlay: false,
        nextRegenAt: null,
      });
    }
    return () => exitVoiceMode();
  }, [user, fetchHearts]);

  useEffect(() => {
    if (!heartsStatus.nextRegenAt || heartsStatus.canPlay) return undefined;
    const id = setInterval(() => {
      setCountdownTick((t) => t + 1);
      fetchHearts();
    }, 1000);
    return () => clearInterval(id);
  }, [heartsStatus.nextRegenAt, heartsStatus.canPlay, fetchHearts]);

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/simulation/admin');
      setSimulations(response.data);
    } catch (error) {
      console.error('Error loading des simulations:', error);
      setError('Error loading simulations');
    } finally {
      setLoading(false);
    }
  };

  const selectSimulation = (simulation) => {
    if (!heartsStatus.canPlay || heartsStatus.hearts <= 0) {
      setNotice(
        heartsStatus.nextRegenAt
          ? `Plus de hearts. Prochain heart dans ${formatCountdown(heartsStatus.nextRegenAt)}.`
          : 'Sign in or wait for heart regeneration (24h per heart).'
      );
      return;
    }
    setSelectedSimulation(simulation);
    setShowSimulationList(false);
    setNotice('');
  };

  const backToSimulationList = () => {
    setSelectedSimulation(null);
    setShowSimulationList(true);
    setConversation([]);
    setConversationStarted(false);
    setScore(0);
    setGameCompleted(false);
    setGameLost(false);
  };

  const handleGameLose = async () => {
    exitVoiceMode();
    setConversation((prev) => [
      ...prev,
      {
        role: 'system',
        content: 'You lose',
        timestamp: new Date(),
        isLose: true,
      },
    ]);
    try {
      const res = await api.post('/api/simulation/hearts/lose');
      if (res.data?.success) setHeartsStatus(res.data);
    } catch (e) {
      console.warn('Enregistrement perte heart:', e);
    }
    setGameLost(true);
    setIsProcessing(false);
  };

  const startConversation = async () => {
    if (!selectedSimulation) return;
    if (!heartsStatus.canPlay || heartsStatus.hearts <= 0) {
      setNotice(
        heartsStatus.nextRegenAt
          ? `Plus de hearts. Prochain heart dans ${formatCountdown(heartsStatus.nextRegenAt)}.`
          : 'Plus de hearts disponibles. Revenez dans 24 h.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      let metadata = {};
      try {
        if (selectedSimulation.metadata) {
          metadata = JSON.parse(selectedSimulation.metadata);
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }

      const theme = metadata.theme || 'Conversation generale';

      const response = await api.post('/api/voice/conversation', {
        theme,
        imageDescription: selectedSimulation.description || '',
        conversationHistory: [],
      }, { timeout: 30000 });

      if (response.data.success) {
        const aiMessage = response.data.ai_response || 'Willkommen! Wie geht es dir heute?';

        setConversation([{
          role: 'assistant',
          content: aiMessage,
          timestamp: new Date()
        }]);
        setConversationStarted(true);
      }
    } catch (error) {
      console.error('Error while start de la conversation:', error);
      setError('Error while start de la conversation. Please reessayer dans quelques secondes.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !conversationStarted || isProcessing) return;

    setIsProcessing(true);

    const userMessage = {
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      let metadata = {};
      try {
        if (selectedSimulation.metadata) {
          metadata = JSON.parse(selectedSimulation.metadata);
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }

      const theme = metadata.theme || 'Conversation generale';

      if (isOffTopicMessage(userMessage.content, theme)) {
        await handleGameLose();
        return;
      }

      const response = await api.post('/api/voice/conversation', {
        theme,
        imageDescription: selectedSimulation.description || '',
        conversationHistory: toApiHistory([...conversation, userMessage]),
        userMessage: userMessage.content,
      }, { timeout: 30000 });

      if (response.data.game_over || response.data.lose_message) {
        await handleGameLose();
        return;
      }

      if (response.data.success) {
        const aiMessage = response.data.ai_response;

        setConversation(prev => [...prev, {
          role: 'assistant',
          content: aiMessage,
          timestamp: new Date(),
          audioUrl: response.data.audio_url
        }]);

        setScore(prev => prev + 10);
      }
    } catch (error) {
      console.error('Error lors de la communication avec l\'IA:', error);
      const details = error.response?.data?.details || error.response?.data?.message;
      setError(details ? `Error IA: ${details}` : 'Error lors de la communication avec l\'IA');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceMode = async () => {
    if (!isReadyToSpeak) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        setIsReadyToSpeak(true);
      } catch (err) {
        console.error('Error accès microphone:', err);
        alert('Cannot access the microphone. Check your browser permissions.');
      }
    } else if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!audioStreamRef.current) return;

    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'audio/webm';
    const options = mimeType ? { mimeType } : {};

    const mediaRecorder = new MediaRecorder(audioStreamRef.current, options);
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const type = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type });
      await processVoiceMessage(audioBlob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(250);
    setIsRecording(true);
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      try {
        rec.requestData();
      } catch (_) {
        /* ignore */
      }
      rec.stop();
      setIsRecording(false);
    }
  };

  const exitVoiceMode = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsReadyToSpeak(false);
    setIsRecording(false);
    setIsPlayingAI(false);
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64 || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const processVoiceMessage = async (audioBlob) => {
    if (!conversationStarted || isProcessing) return;

    if (!audioBlob || audioBlob.size < 1000) {
      alert('Recording too short. Speak for at least 1 second, then click again to send.');
      return;
    }

    setIsProcessing(true);

    try {
      let metadata = {};
      try {
        if (selectedSimulation.metadata) {
          metadata = JSON.parse(selectedSimulation.metadata);
        }
      } catch (e) {}

      const theme = metadata.theme || 'General conversation';
      const audioBase64 = await blobToBase64(audioBlob);

      const response = await api.post('/api/voice/conversation-audio', {
        audioBase64,
        theme,
        imageDescription: selectedSimulation.description || '',
        conversationHistory: toApiHistory(conversation),
      }, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      });

      const data = response.data;

      if (data.game_over || data.lose_message) {
        await handleGameLose();
        return;
      }

      if (data.success) {
        if (data.user_transcript) {
          setConversation((prev) => [...prev, {
            role: 'user',
            content: data.user_transcript,
            timestamp: new Date(),
            isVoice: true,
          }]);
        }

        setConversation((prev) => [...prev, {
          role: 'assistant',
          content: data.ai_response,
          timestamp: new Date(),
          audioUrl: data.audio_url,
          isVoice: true,
        }]);

        if (data.audio_url) {
          playAIAudio(getAssetUrl(data.audio_url));
        } else if (data.use_browser_tts && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.ai_response);
          utterance.lang = 'de-DE';
          utterance.rate = 0.8;
          const voices = window.speechSynthesis.getVoices();
          const germanVoice = voices.find((v) => v.lang.startsWith('de'));
          if (germanVoice) utterance.voice = germanVoice;
          setIsPlayingAI(true);
          utterance.onend = () => setIsPlayingAI(false);
          utterance.onerror = () => setIsPlayingAI(false);
          window.speechSynthesis.speak(utterance);
        }

        setScore((prev) => prev + 15);
      }
    } catch (err) {
      console.error('Error traitement vocal:', err);
      const apiMsg = err.response?.data?.message;
      const apiCode = err.response?.data?.error;
      if (apiCode === 'TRANSCRIPTION_FAILED') {
        alert(
          apiMsg ||
            'Your mic works, but transcription failed. Check GROQ_API_KEY in LingoRaid/backend/.env and restart the server.'
        );
      } else {
        alert(apiMsg || 'Error processing voice. Try again or use text mode.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAIAudio = () => {
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAI(false);
  };

  const playAIAudio = (audioUrl) => {
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
      aiAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    aiAudioRef.current = audio;

    audio.onplay = () => setIsPlayingAI(true);
    audio.onended = () => setIsPlayingAI(false);
    audio.onerror = () => {
      setIsPlayingAI(false);
      console.error('Error lecture audio AI');
    };

    audio.play().catch(console.error);
  };

  const completeGame = () => {
    setGameCompleted(true);
  };

  const restartGame = () => {
    backToSimulationList();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading simulations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
          <button
            onClick={() => navigate('/games')}
            className="bg-german-600 text-white px-6 py-2 rounded-lg hover:bg-german-700 transition-colors"
          >
            Back to games
          </button>
        </div>
      </div>
    );
  }

  // Affichage de la liste des simulations
  if (showSimulationList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
        {/* Header */}
        <div className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/games')}
                className="flex items-center text-german-600 hover:text-german-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to games
              </button>
              
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  Conversation Simulations
                </h1>
                <p className="text-german-600 mt-2">Pick a simulation to start</p>
              </div>
              
              <div className="flex flex-col items-end min-w-[5rem]">
                <HeartsBar hearts={heartsStatus.hearts} maxHearts={heartsStatus.maxHearts || MAX_HEARTS} />
                {!heartsStatus.canPlay && heartsStatus.nextRegenAt && (
                  <p className="text-xs text-red-600 mt-1 text-right max-w-[10rem]">
                    +1 cœur dans {formatCountdown(heartsStatus.nextRegenAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {(notice || (!heartsStatus.canPlay && heartsStatus.hearts <= 0)) && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg text-sm">
              {notice ||
                (heartsStatus.nextRegenAt
                  ? `Vous avez perdu vos 2 cœurs. Prochain cœur dans ${formatCountdown(heartsStatus.nextRegenAt)} (puis encore 24 h pour le 2ᵉ).`
                  : 'No hearts left. Come back in 24 hours.')}
            </div>
          </div>
        )}

        {/* Liste des simulations */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {simulations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Send className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune simulation disponible
              </h3>
              <p className="text-gray-500 mb-6">
                Aucune simulation conversationnelle n'a ete creee par l'administrateur.
              </p>
              <button
                onClick={() => navigate('/games')}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Back to games
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {simulations.map((simulation) => {
                let metadata = {};
                try {
                  if (simulation.metadata) {
                    metadata = JSON.parse(simulation.metadata);
                  }
                } catch (e) {
                  console.error('Error parsing metadata:', e);
                }

                return (
                  <div 
                    key={simulation.id} 
                    className={`bg-white rounded-xl shadow-lg overflow-hidden transition-shadow ${
                      heartsStatus.canPlay && heartsStatus.hearts > 0
                        ? 'cursor-pointer hover:shadow-xl'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => selectSimulation(simulation)}
                  >
                    {/* Image */}
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      {metadata.imagePath ? (
                        <img
                          src={`https://backend-u6jh.onrender.com${metadata.imagePath}`}
                          alt={simulation.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-500 text-center">
                          <Send className="w-12 h-12 mx-auto mb-2" />
                          <p>No image</p>
                        </div>
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-german-800">
                          {simulation.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          simulation.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {simulation.isActive ? 'Available' : 'Indisponible'}
                        </span>
                      </div>

                      {simulation.description && (
                        <p className="text-gray-600 mb-3">{simulation.description}</p>
                      )}

                      {metadata.theme && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-500 mb-1">Theme:</p>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {metadata.theme}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          simulation.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          simulation.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {simulation.difficulty === 'easy' ? 'Easy' :
                           simulation.difficulty === 'medium' ? 'Medium' : 'Hard'}
                        </span>
                        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                          Start
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  let metadata = {};
  try {
    if (selectedSimulation.metadata) {
      metadata = JSON.parse(selectedSimulation.metadata);
    }
  } catch (e) {
    console.error('Error parsing metadata:', e);
  }

  if (gameLost) {
    const canRetry = heartsStatus.canPlay && heartsStatus.hearts > 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center border-2 border-red-300">
          <div className="flex justify-center mb-4">
            <HeartsBar hearts={heartsStatus.hearts} maxHearts={heartsStatus.maxHearts || MAX_HEARTS} />
          </div>
          <div className="bg-red-600 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-black text-white tracking-wide">✕</span>
          </div>
          <h1 className="text-4xl font-black text-red-600 mb-3">You lose</h1>
          <p className="text-gray-600 mb-2">
            Vous etes sorti du sujet ({metadata.theme || 'conversation'}). La partie est terminee.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {heartsStatus.hearts > 0
              ? `Il vous reste ${heartsStatus.hearts} coeur${heartsStatus.hearts > 1 ? 's' : ''} sur ${MAX_HEARTS}.`
              : heartsStatus.nextRegenAt
                ? `Plus de coeurs. Prochain coeur dans ${formatCountdown(heartsStatus.nextRegenAt)}.`
                : 'Plus de coeurs disponibles.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={backToSimulationList}
              className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to simulations
            </button>
            {canRetry ? (
              <button
                onClick={() => {
                  setGameLost(false);
                  setConversation([]);
                  setConversationStarted(false);
                  setScore(0);
                }}
                className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reessayer
              </button>
            ) : (
              <p className="text-sm text-red-600">
                Reessai impossible. Attendez 24 h par coeur regenere.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-german-800 mb-2">
              Simulation Completede !
            </h1>
            
            <p className="text-german-600 mb-6">
              Felicitations ! Vous avez completed la simulation conversationnelle.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 font-semibold">
                Final score: {score} points
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={backToSimulationList}
                className="w-full bg-german-600 text-white py-3 px-6 rounded-lg hover:bg-german-700 transition-colors"
              >
                Back to simulations
              </button>
              
              <button
                onClick={restartGame}
                className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Play again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={backToSimulationList}
              className="flex items-center text-german-600 hover:text-german-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to simulations
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                {selectedSimulation.title}
              </h1>
              <p className="text-german-600 mt-2">AI conversation simulation</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <HeartsBar hearts={heartsStatus.hearts} maxHearts={heartsStatus.maxHearts || MAX_HEARTS} />
              <div className="text-right">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-2xl font-bold text-orange-600">{score}</p>
              </div>
              <button
                onClick={completeGame}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Completedr
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image et controles */}
          <div className="space-y-6">
            {/* Image de la simulation */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-german-800 mb-4">Visual context</h3>
              {metadata.imagePath ? (
                <img
                  src={`https://backend-u6jh.onrender.com${metadata.imagePath}`}
                  alt={selectedSimulation.title}
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No image</p>
                </div>
              )}
              
              {metadata.theme && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800 font-medium mb-1">Theme de conversation:</p>
                  <p className="text-orange-700">{metadata.theme}</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-german-800 mb-4">Instructions</h3>
              
              {!conversationStarted ? (
                <div className="text-center">
                  <button
                    onClick={startConversation}
                    className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center text-lg font-semibold"
                  >
                    <Send className="w-6 h-6 mr-3" />
                    Start conversation
                  </button>
                  <p className="text-sm text-gray-600 mt-3">
                    Click to start a conversation with the AI in German
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">
                      <strong>Conversation active !</strong>
                      Speak or type in German in the chat on the right.
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Game rules:</strong>
                    </p>
                    <ul className="text-blue-700 text-sm mt-2 space-y-1">
                      <li>Speak or type in German</li>
                      <li>Stay on topic</li>
                      <li>Si vous parlez hors sujet → <strong>You lose</strong></li>
                      <li>AI replies in German (voice or text)</li>
                      <li>Text = 10 pts · Voice = 15 pts</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat conversationnel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-german-800 mb-4">Conversation</h3>
            
            {conversation.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Send className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Click &quot;Start conversation&quot; to begin</p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {conversation.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'system' ? 'justify-center' : message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          message.isLose || message.role === 'system'
                            ? 'bg-red-600 text-white font-bold text-lg text-center'
                            : message.role === 'user'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm flex-1">{message.content}</p>
                          {message.isVoice && (
                            <span className="ml-2 text-xs opacity-75">
                              {message.role === 'user' ? 'ðŸŽ¤' : 'ðŸ”Š'}
                            </span>
                          )}
                        </div>
                        
                        {/* AI audio playback button */}
                        {message.role === 'assistant' && message.audioUrl && (
                          <button
                            onClick={() => playAIAudio(getAssetUrl(message.audioUrl))}
                            className="mt-2 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                          >
                            <Volume2 className="w-3 h-3" />
                            Reecouter
                          </button>
                        )}
                        
                        <p className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-orange-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Input utilisateur */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={toggleVoiceMode}
                      disabled={isProcessing || isPlayingAI}
                      className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium ${
                        isProcessing || isPlayingAI
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : isRecording
                          ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                          : isReadyToSpeak
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-700 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          Stop and send
                        </>
                      ) : isReadyToSpeak ? (
                        <>
                          <Mic className="w-5 h-5" />
                          Click to speak
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          Enable microphone
                        </>
                      )}
                    </button>
                    {isReadyToSpeak && (
                      <p className={`text-xs text-center ${isRecording ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {isRecording
                          ? 'Listening… speak in German, then click « Stop and send ».'
                          : 'Mic active — click to record your message.'}
                      </p>
                    )}
                    {isProcessing && (
                      <p className="text-xs text-orange-600 text-center">Transcribing and generating AI reply…</p>
                    )}
                    {isPlayingAI && (
                      <button
                        type="button"
                        onClick={stopAIAudio}
                        className="text-xs text-orange-600 hover:text-orange-800 text-center"
                      >
                        Stop AI playback
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-gray-200" />
                    <span className="flex-shrink mx-3 text-xs text-gray-400">or text</span>
                    <div className="flex-grow border-t border-gray-200" />
                  </div>

                  {/* Saisie texte */}
                  <div className="flex space-x-2">
                      <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message in German..."
                        className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        rows={2}
                        disabled={isProcessing}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!userInput.trim() || isProcessing}
                        className={`px-4 py-3 rounded-lg transition-colors flex items-center ${
                          !userInput.trim() || isProcessing
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {isProcessing ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                </div>
                
                {isProcessing && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    L'IA reflechit...
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationRunner;
