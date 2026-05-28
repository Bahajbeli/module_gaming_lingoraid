import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import io from "socket.io-client";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Crown,
  CheckCircle,
  Circle,
  Play,
} from "lucide-react";
import api from "../utils/axios";

const OnlineGameLobby = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user, token } = useAuth();

  const [room, setRoom] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const fetchAttemptsRef = useRef(0);

  // État de l'appel vocal
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioUnlockNeeded, setAudioUnlockNeeded] = useState(false);
  const [audioRelayMode, setAudioRelayMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);

  // Refs pour WebRTC
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  // Diagnostics
  const [connState, setConnState] = useState('new');
  const [localLevel, setLocalLevel] = useState(0);
  const [remoteLevel, setRemoteLevel] = useState(0);
  const localAudioCtxRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const localRafRef = useRef(null);
  const remoteAudioCtxRef = useRef(null);
  const remoteAnalyserRef = useRef(null);
  const remoteRafRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  useEffect(() => {
    if (roomId && user) {
      fetchRoomDetails();
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      cleanupWebRTC();
    };
  }, [roomId, user]);

  const fetchRoomDetails = async () => {
    // Éviter les appels répétés si la salle n'existe pas
    if (roomNotFound) {
      return;
    }

    // Limiter le nombre de tentatives
    if (fetchAttemptsRef.current >= 3) {
      setRoomNotFound(true);
      setError("Salle non trouvée. La salle a peut-être été supprimée ou le serveur a redémarré.");
      setLoading(false);
      return;
    }

    try {
      fetchAttemptsRef.current += 1;
      const response = await api.get(`/api/rooms/${roomId}`);
      if (response.data.success) {
        setRoom(response.data.room);
        setRoomNotFound(false);
        fetchAttemptsRef.current = 0; // Réinitialiser le compteur en cas de succès
        const currentPlayer = response.data.room.players.find(
          (p) => p.id === user.id
        );
        setIsReady(currentPlayer?.isReady || false);
        if (response.data.room.status === "in-progress") {
          navigate(`/room/${roomId}/play`);
        }
      }
    } catch (error) {
      console.error("Error lors de la récupération de la salle:", error);
      
      // Si c'est une erreur 404, marquer la salle comme non trouvée
      if (error.response?.status === 404) {
        setRoomNotFound(true);
        setError("Salle non trouvée. La salle a peut-être été supprimée ou le serveur a redémarré.");
      } else if (error.response?.status === 403) {
        setError("Accès interdit à cette salle");
        setRoomNotFound(true);
      } else {
        // Pour les autres erreurs, ne pas marquer comme non trouvée immédiatement
        setError("Error lors de la récupération de la salle");
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = () => {
    const newSocket = io(
      process.env.REACT_APP_SERVER_URL || "http://localhost:5000",
      {
        auth: { token },
      }
    );

    console.log('Emitting join-room for:', roomId);
    newSocket.emit("join-room", { roomId });

    newSocket.on("room-state", (roomState) => {
      console.log('room-state reçu:', roomState);
      setRoom((prev) => {
        const updated = {
          ...prev,
          players: roomState.players,
          gameConfig: roomState.gameConfig,
          simulation: roomState.simulation,
          status: roomState.status,
        };
        console.log('Room mis à jour avec room-state:', updated);
        return updated;
      });
    });

    newSocket.on("player-joined", ({ playerId, playerEmail }) => {
      setRoom((prev) => ({
        ...prev,
        players: [
          ...prev.players,
          {
            id: playerId,
            email: playerEmail,
            isHost: false,
            isReady: false,
          },
        ],
      }));
    });

    newSocket.on("player-left", ({ playerId, playerEmail }) => {
      setRoom((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
      }));
    });

    newSocket.on(
      "player-ready-changed",
      ({ playerId, isReady, allReady, gameStarted }) => {
        console.log('📢 player-ready-changed reçu:', { 
          playerId, 
          isReady, 
          allReady, 
          gameStarted,
          currentRoomPlayers: room?.players?.map(p => ({ id: p.id, email: p.email, isReady: p.isReady }))
        });
        
        setRoom((prev) => {
          if (!prev) {
            console.warn('⚠️ Room est null lors de player-ready-changed');
            return prev;
          }
          
          const updatedPlayers = prev.players.map((p) =>
            p.id === playerId ? { ...p, isReady } : p
          );
          
          const allReadyNow = updatedPlayers.length >= 2 && updatedPlayers.every(p => p.isReady);
          console.log('🔄 Joueurs mis à jour:', {
            players: updatedPlayers.map(p => ({ id: p.id, email: p.email, isReady: p.isReady })),
            allReadyNow,
            readyCount: updatedPlayers.filter(p => p.isReady).length,
            totalCount: updatedPlayers.length
          });
          
          return {
            ...prev,
            players: updatedPlayers,
          };
        });

        if (gameStarted) {
          navigate(`/room/${roomId}/play`);
        }
      }
    );

    newSocket.on("game-started", () => {
      navigate(`/room/${roomId}/play`);
    });

    // WebRTC signaling
    newSocket.on("webrtc-offer", async ({ offer, senderId }) => {
      console.log(`Received WebRTC offer from ${senderId}`);
      await handleWebRTCOffer(offer, senderId);
    });

    newSocket.on("webrtc-answer", async ({ answer, senderId }) => {
      console.log(`Received WebRTC answer from ${senderId}`);
      await handleWebRTCAnswer(answer);
    });

    newSocket.on("webrtc-ice-candidate", async ({ candidate, senderId }) => {
      console.log(`Received ICE candidate from ${senderId}`);
      await handleWebRTCIceCandidate(candidate);
    });

    newSocket.on("host-changed", ({ newHostId, newHostEmail }) => {
      setRoom((prev) => ({
        ...prev,
        players: prev.players.map((p) => ({
          ...p,
          isHost: p.id === newHostId,
        })),
      }));
    });

    // Écouter les messages vocaux relay
    newSocket.on('voice-message-sent', async ({ messageId, audioUrl }) => {
      console.log('Received voice message via relay:', messageId);
      try {
        // Play le message audio reçu
        const audio = new Audio(`http://localhost:5000${audioUrl}`);
        audio.play().then(() => {
          console.log('Playing relayed voice message');
        }).catch(e => {
          console.log('Autoplay blocked for relay message');
          setAudioUnlockNeeded(true);
        });
      } catch (e) {
        console.error('Failed to play relay message:', e);
      }
    });

    setSocket(newSocket);
    socketRef.current = newSocket;
  };

  const toggleReady = async () => {
    try {
      console.log('toggleReady appelé pour roomId:', roomId);
      const response = await api.post(`/api/rooms/${roomId}/ready`);
      console.log('Réponse API ready:', response.data);
      if (response.data.success) {
        const newReadyState = response.data.isReady;
        setIsReady(newReadyState);
        console.log('Statut prêt mis à jour localement:', newReadyState);
        
        // Mettre à jour immédiatement l'état local de la room
        setRoom((prev) => {
          if (!prev) return prev;
          const updatedPlayers = prev.players.map((p) =>
            p.id === user.id ? { ...p, isReady: newReadyState } : p
          );
          console.log('Room mis à jour localement avec nouveau statut:', updatedPlayers);
          return {
            ...prev,
            players: updatedPlayers,
          };
        });
        
        if (socket) {
          console.log('Envoi toggle-ready au socket');
          socket.emit("toggle-ready", { roomId });
        }
        
        // Ne pas rafraîchir si la salle n'existe pas
        if (!roomNotFound) {
          // Rafraîchir les détails de la salle après un court délai pour laisser le socket se synchroniser
          setTimeout(async () => {
            await fetchRoomDetails();
          }, 300);
        }
      }
    } catch (error) {
      console.error("Error while changement de statut:", error);
    }
  };

  const leaveRoom = async () => {
    try {
      if (socket) {
        socket.emit("leave-room", { roomId });
      }
      await api.post(`/api/rooms/${roomId}/leave`);
      navigate("/gaming");
    } catch (error) {
      console.error("Error lors de la sortie de la salle:", error);
      navigate("/gaming");
    }
  };

  const startVoiceCall = async () => {
    try {
      console.log('Requesting microphone access...');
      
      // Vérifier si navigator.mediaDevices existe
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('navigator.mediaDevices.getUserMedia not supported');
      }
      
      // Essayer d'abord avec des contraintes simples
      let stream;
      try {
        console.log('Trying simple audio constraints...');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (simpleError) {
        console.log('Simple constraints failed:', simpleError.name, simpleError.message);
        
        // Essayer avec contraintes encore plus basiques
        try {
          console.log('Trying basic getUserMedia...');
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (basicError) {
          console.log('Basic getUserMedia failed:', basicError.name, basicError.message);
          
          // Dernier essai avec l'ancienne API
          try {
            console.log('Trying legacy getUserMedia...');
            const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (getUserMedia) {
              stream = await new Promise((resolve, reject) => {
                getUserMedia.call(navigator, { audio: true }, resolve, reject);
              });
            } else {
              throw new Error('No getUserMedia API available');
            }
          } catch (legacyError) {
            console.log('Legacy getUserMedia failed:', legacyError.name, legacyError.message);
            throw basicError; // Relancer l'erreur principale
          }
        }
      }
      console.log('Got media stream:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));

      localStreamRef.current = stream;
      setIsCallActive(true);

      const pc = new RTCPeerConnection({
        iceServers: [
          // Utiliser seulement des serveurs TURN publics fiables (pas de STUN direct)
          { urls: ["turn:relay.metered.ca:80"], username: "85d4fae4f588903fb55b2db7", credential: "uBP2XpYMSI7tURu5" },
          { urls: ["turn:relay.metered.ca:443"], username: "85d4fae4f588903fb55b2db7", credential: "uBP2XpYMSI7tURu5" },
          { urls: ["turn:relay.metered.ca:443?transport=tcp"], username: "85d4fae4f588903fb55b2db7", credential: "uBP2XpYMSI7tURu5" }
        ],
        // Forcer l'utilisation exclusive du relay TURN
        iceTransportPolicy: 'relay',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });

      // Ajouter le stream local avec configuration explicite
      stream.getTracks().forEach((track) => {
        console.log(`Adding track: ${track.kind}, enabled: ${track.enabled}`);
        const sender = pc.addTrack(track, stream);
        // Configurer les paramètres d'encodage pour l'audio (version compatible)
        if (track.kind === 'audio' && sender.getParameters) {
          try {
            const params = sender.getParameters();
            if (params && params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 64000; // 64kbps pour l'audio
              sender.setParameters(params).catch(e => console.warn('Failed to set encoding params:', e));
            }
          } catch (e) {
            console.warn('Failed to configure encoding params:', e);
          }
        }
      });
      // Init vumètre local
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        localAudioCtxRef.current = ac;
        localAnalyserRef.current = analyser;
        const data = new Uint8Array(analyser.fftSize);
        const loop = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / data.length);
          setLocalLevel(Math.min(1, rms * 2));
          localRafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {}

      // Gérer le stream distant
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        setRemoteStream(remoteStream);
        if (remoteStreamRef.current) {
          remoteStreamRef.current.srcObject = remoteStream;
          // Essayer de démarrer la lecture (peut être bloqué par la politique d'autoplay)
          const audioEl = remoteStreamRef.current;
          const tryPlay = async () => {
            try {
              await audioEl.play();
              setAudioUnlockNeeded(false);
              console.log('Remote audio playing');
            } catch (e) {
              console.log('Autoplay blocked, need user interaction');
              setAudioUnlockNeeded(true);
            }
          };
          tryPlay();
        }
        // Init vumètre distant
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const src = ac.createMediaStreamSource(remoteStream);
          const analyser = ac.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          remoteAudioCtxRef.current = ac;
          remoteAnalyserRef.current = analyser;
          const data = new Uint8Array(analyser.fftSize);
          const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            setRemoteLevel(Math.min(1, rms * 2));
            remoteRafRef.current = requestAnimationFrame(loop);
          };
          loop();
        } catch {}
      };

      // Gérer les candidats ICE
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-ice-candidate", {
            roomId,
            candidate: event.candidate,
            targetId: null, // Broadcast
          });
        }
      };

      peerConnectionRef.current = pc;
      setConnState(pc.connectionState || 'new');
      pc.onconnectionstatechange = () => {
        setConnState(pc.connectionState);
        console.log(`WebRTC connection state: ${pc.connectionState}`);
      };
      pc.oniceconnectionstatechange = () => {
        console.log(`WebRTC ICE state: ${pc.iceConnectionState}`);
        
        // Si ICE reste en "checking" trop longtemps, redémarrer la négociation
        if (pc.iceConnectionState === 'checking') {
          setTimeout(async () => {
            if (pc.iceConnectionState === 'checking') {
              console.log('ICE stuck in checking, trying complete renegotiation...');
              try {
                // Créer une nouvelle offre pour forcer la renegotiation
                const newOffer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(newOffer);
                if (socket) {
                  socket.emit("webrtc-offer", {
                    roomId,
                    offer: newOffer,
                    targetId: null,
                  });
                  console.log('Sent fresh offer with ICE restart');
                }
              } catch (e) {
                console.error('Failed to restart negotiation:', e);
                pc.restartIce();
              }
            }
          }, 6000);
        }
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.log('ICE failed, attempting restart...');
          setTimeout(() => {
            if (pc.iceConnectionState === 'failed') {
              pc.restartIce();
            }
          }, 2000);
        }
      };

      // Seul le client avec l'ID le plus petit crée l'offre pour éviter le conflit
      console.log(`Starting WebRTC for user ${user.id}, room has ${room?.players?.length} players`);
      console.log('Room data:', room);
      
      // Les DEUX clients créent une offre pour garantir qu'au moins une connexion fonctionne
      console.log(`All player IDs: ${room?.players?.map(p => p.id)}`);
      
      if (room && room.players && room.players.length >= 2) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          });
        await pc.setLocalDescription(offer);
          console.log('Created offer (both clients strategy), sending to peer');

        if (socket) {
            console.log('Emitting webrtc-offer via socket for room:', roomId);
          socket.emit("webrtc-offer", {
            roomId,
            offer,
            targetId: null,
          });
            
            console.log('Socket connected:', socket.connected);
          } else {
            console.error('No socket available to send offer');
        }
        } catch (e) {
          console.error('Failed to create offer:', e);
        }
      } else {
        console.log('Not enough players to create offer');
      }
    } catch (error) {
      console.error("Error while démarrage de l'appel:", error);
      console.error("Error details:", error.name, error.message);
      
      // Messages d'erreur plus spécifiques
      let errorMessage = "Impossible d'accéder au microphone";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Permission microphone refusée. Autorisez l'accès dans les paramètres du navigateur.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Aucun microphone détecté. Vérifiez qu'un microphone est connecté.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Microphone utilisé par une autre application. Fermez les autres apps utilisant le micro.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Contraintes audio non supportées. Essayez avec un autre microphone.";
      }
      
      setError(errorMessage);
    }
  };

  const handleWebRTCOffer = async (offer, senderId) => {
    console.log('Handling WebRTC offer...');
    if (!peerConnectionRef.current) {
      console.log('No peer connection, creating one without full room setup');
      // Créer une connexion WebRTC minimale juste pour répondre
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setIsCallActive(true);

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: ["turn:relay.metered.ca:80"], username: "85d4fae4f588903fb55b2db7", credential: "uBP2XpYMSI7tURu5" },
            { urls: ["turn:relay.metered.ca:443"], username: "85d4fae4f588903fb55b2db7", credential: "uBP2XpYMSI7tURu5" },
            { urls: ["turn:relay.metered.ca:443?transport=tcp"], username: "85d4fae4f588903fb55b2db7", credential: "uBP2XpYMSI7tURu5" }
          ],
          iceTransportPolicy: 'relay',
          iceCandidatePoolSize: 10,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        });

        stream.getTracks().forEach(track => {
          console.log(`Adding track in minimal setup: ${track.kind}, enabled: ${track.enabled}`);
          pc.addTrack(track, stream);
        });
        
        // Init vumètre local pour le setup minimal
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const src = ac.createMediaStreamSource(stream);
          const analyser = ac.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          localAudioCtxRef.current = ac;
          localAnalyserRef.current = analyser;
          const data = new Uint8Array(analyser.fftSize);
          const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            setLocalLevel(Math.min(1, rms * 2));
            localRafRef.current = requestAnimationFrame(loop);
          };
          loop();
        } catch (e) {
          console.warn('Failed to init local audio analyser:', e);
        }
        
        pc.ontrack = (event) => {
          console.log('Received remote track in minimal setup');
          const remoteStream = event.streams[0];
          setRemoteStream(remoteStream);
          if (remoteStreamRef.current) {
            remoteStreamRef.current.srcObject = remoteStream;
            remoteStreamRef.current.volume = 1.0; // Volume max
            remoteStreamRef.current.muted = false; // Pas muet
            remoteStreamRef.current.play().then(() => {
              console.log('Remote audio playing successfully');
              setAudioUnlockNeeded(false);
            }).catch(() => {
              console.log('Autoplay blocked, showing unlock button');
              setAudioUnlockNeeded(true);
            });
          }
          
          // Init vumètre distant pour le setup minimal
          try {
            const ac = new (window.AudioContext || window.webkitAudioContext)();
            const src = ac.createMediaStreamSource(remoteStream);
            const analyser = ac.createAnalyser();
            analyser.fftSize = 512;
            src.connect(analyser);
            remoteAudioCtxRef.current = ac;
            remoteAnalyserRef.current = analyser;
            const data = new Uint8Array(analyser.fftSize);
            const loop = () => {
              analyser.getByteTimeDomainData(data);
              let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
              const rms = Math.sqrt(sum / data.length);
              setRemoteLevel(Math.min(1, rms * 2));
              remoteRafRef.current = requestAnimationFrame(loop);
            };
            loop();
          } catch (e) {
            console.warn('Failed to init remote audio analyser:', e);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit("webrtc-ice-candidate", { roomId, candidate: event.candidate, targetId: null });
          }
        };

        peerConnectionRef.current = pc;
        setConnState(pc.connectionState);
        pc.onconnectionstatechange = () => {
          setConnState(pc.connectionState);
          console.log(`Minimal setup - Connection state: ${pc.connectionState}`);
        };
        pc.oniceconnectionstatechange = () => {
          console.log(`Minimal setup - ICE state: ${pc.iceConnectionState}`);
          
          // Redémarrer si ICE reste bloqué en checking
          if (pc.iceConnectionState === 'checking') {
            setTimeout(async () => {
              if (pc.iceConnectionState === 'checking') {
                console.log('ICE stuck in checking (minimal), trying renegotiation...');
                try {
                  const newAnswer = await pc.createAnswer();
                  await pc.setLocalDescription(newAnswer);
                  if (socket) {
                    socket.emit("webrtc-answer", {
                      roomId,
                      answer: newAnswer,
                      targetId: null,
                    });
                    console.log('Sent fresh answer from minimal setup');
                  }
                } catch (e) {
                  console.error('Failed to restart minimal negotiation:', e);
                  pc.restartIce();
                }
              }
            }, 5000);
          }
          // Redémarrer si la connexion échoue
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('ICE failed in minimal setup, attempting restart...');
            setTimeout(() => {
              if (pc.iceConnectionState === 'failed') {
                pc.restartIce();
              }
            }, 1000);
          }
        };
      } catch (e) {
        console.error('Failed to create minimal WebRTC setup:', e);
        return;
      }
    }

    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('Still no peer connection after startVoiceCall');
      return;
    }
    
    console.log('Setting remote description from offer');
    await pc.setRemoteDescription(offer);

    // Traiter les candidats ICE en attente
    const pending = pendingIceCandidatesRef.current;
    console.log(`Processing ${pending.length} pending ICE candidates`);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn('Failed to add pending ICE candidate:', e);
      }
    }
    pendingIceCandidatesRef.current = [];

    console.log('Creating answer...');
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('Sending answer back');

    if (socket) {
      socket.emit("webrtc-answer", {
        roomId,
        answer,
        targetId: senderId,
      });
    }
  };

  const handleWebRTCAnswer = async (answer) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer);
      
      // Traiter les candidats ICE en attente
      const pending = pendingIceCandidatesRef.current;
      for (const candidate of pending) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (e) {
          console.warn('Failed to add pending ICE candidate:', e);
        }
      }
      pendingIceCandidatesRef.current = [];
    }
  };

  const handleWebRTCIceCandidate = async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    
    // Si pas de description distante, mettre en attente
    if (!pc.remoteDescription) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }
    
    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.warn('Failed to add ICE candidate:', e);
    }
  };

  const endVoiceCall = () => {
    cleanupWebRTC();
    setIsCallActive(false);
    setRemoteStream(null);
    setAudioUnlockNeeded(false);
  };

  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localAudioCtxRef.current) { try { localAudioCtxRef.current.close(); } catch {} localAudioCtxRef.current = null; }
    if (localRafRef.current) { cancelAnimationFrame(localRafRef.current); localRafRef.current = null; }
    if (remoteAudioCtxRef.current) { try { remoteAudioCtxRef.current.close(); } catch {} remoteAudioCtxRef.current = null; }
    if (remoteRafRef.current) { cancelAnimationFrame(remoteRafRef.current); remoteRafRef.current = null; }
    setLocalLevel(0); setRemoteLevel(0);
    pendingIceCandidatesRef.current = [];
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const sendVoiceMessage = async () => {
    if (!recordingStream || isRecording) return;
    
    setIsRecording(true);
    console.log('Starting voice recording...');
    
    try {
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice-message.webm');
        formData.append('roomId', roomId);
        
        try {
          const response = await api.post('/api/voice/relay', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (response.data.success) {
            console.log('Voice message sent via relay');
            // Notifier les autres via socket
            if (socket) {
              socket.emit('voice-message-sent', { roomId, messageId: response.data.messageId });
            }
          }
        } catch (error) {
          console.error('Failed to send voice message:', error);
        }
        
        setIsRecording(false);
      };
      
      mediaRecorder.start();
      
      // Arrêter l'enregistrement après 3 secondes
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to record voice:', error);
      setIsRecording(false);
    }
  };

  // Vérifier si les deux players sont prêts (pour l'affichage dans l'interface)
  const hasTwoPlayers = room?.players && room.players.length >= 2;
  const allReady = hasTwoPlayers && room.players.every((p) => p.isReady);
  
  // Créer une clé unique basée sur l'état des players pour forcer la détection des changements
  // Utiliser JSON.stringify pour s'assurer que tous les changements sont détectés
  const playersReadyKey = room?.players 
    ? JSON.stringify(room.players.map(p => ({ id: p.id, isReady: p.isReady })))
    : '';

  // Start automatiquement l'appel quand 2 players sont présents et prêts
  useEffect(() => {
    // Recalculer les valeurs à l'intérieur du useEffect pour avoir les dernières valeurs
    const playersInfo = room?.players || [];
    const hasTwoPlayersCheck = playersInfo.length >= 2;
    const allReadyCheck = hasTwoPlayersCheck && playersInfo.every((p) => p.isReady);
    
    const readyCount = playersInfo.filter(p => p.isReady).length;
    const totalCount = playersInfo.length;
    
    console.log('🔍 useEffect appel check:', { 
      hasTwoPlayers: hasTwoPlayersCheck, 
      allReady: allReadyCheck, 
      isCallActive, 
      playersCount: totalCount,
      readyCount: readyCount,
      players: playersInfo.map(p => ({ id: p.id, email: p.email, isReady: p.isReady })),
      playersReadyKey
    });
    
    if (false && hasTwoPlayersCheck && allReadyCheck && !isCallActive) {
      console.log('✅ Conditions remplies, démarrage de l\'appel dans 500ms...');
      // Petit délai pour que l'interface se mette à jour
      const timer = setTimeout(() => {
        console.log('🚀 Démarrage de l\'appel maintenant');
        startVoiceCall();
      }, 500);
      return () => {
        console.log('⏹️ Timer annulé');
        clearTimeout(timer);
      };
    } else {
      const reasons = [];
      if (!hasTwoPlayersCheck) reasons.push(`Pas 2 players (${totalCount} présent${totalCount > 1 ? 's' : ''})`);
      if (!allReadyCheck) {
        const notReadyPlayers = playersInfo.filter(p => !p.isReady).map(p => p.email).join(', ');
        reasons.push(`Pas tous prêts (${readyCount}/${totalCount} prêts${notReadyPlayers ? ` - Waiting: ${notReadyPlayers}` : ''})`);
      }
      if (isCallActive) reasons.push('Appel déjà actif');
      
      console.log('❌ Conditions non remplies:', { 
        hasTwoPlayers: hasTwoPlayersCheck, 
        allReady: allReadyCheck, 
        isCallActive,
        readyCount,
        totalCount,
        reason: reasons.join(' | ') || 'Raison inconnue'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallActive, playersReadyKey]);

  useEffect(() => {
    if (room?.status === 'in-progress') {
      navigate(`/room/${roomId}/play`);
    }
  }, [room?.status, roomId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-700 text-lg">Sign in à la salle...</p>
        </div>
      </div>
    );
  }

  if (error && roomNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
            <h2 className="font-bold text-lg mb-2">Salle introuvable</h2>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-red-600">
              Les salles sont stockées en mémoire et peuvent être perdues si le serveur redémarre.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/gaming")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to games
            </button>
            <button
              onClick={() => {
                setRoomNotFound(false);
                setError("");
                fetchAttemptsRef.current = 0;
                setLoading(true);
                fetchRoomDetails();
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !roomNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
          <button
            onClick={() => navigate("/gaming")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={leaveRoom}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Leave la salle
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {room?.name || "Salle de jeu"}
              </h1>
              <p className="text-blue-600 mt-2">
                {room?.gameConfig?.label || 'Online match'}
                {room?.gameConfig?.roundsCount > 1 &&
                  ` · ${room.gameConfig.roundsCount} rounds`}
              </p>
              {room?.isPrivate && room?.inviteCode && (
                <div className="mt-3 bg-blue-50 text-blue-800 px-4 py-2 rounded-xl inline-block border border-blue-200">
                  <span className="text-sm font-semibold mr-2">Code d'invitation :</span>
                  <span className="font-mono font-bold text-lg tracking-widest">{room.inviteCode}</span>
                </div>
              )}
            </div>

            <div className="w-24"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simulation et contrôles */}
          <div className="space-y-6">
            {/* Simulation choisie */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Configuration de la partie
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Mode :</strong> {room?.gameConfig?.label}</p>
                {room?.gameConfig?.roundsCount > 1 && (
                  <p><strong>Tours :</strong> {room.gameConfig.roundsCount}</p>
                )}
                {(room?.gameConfig?.gameType === 'quiz' || room?.gameConfig?.randomMode) && (
                  <p><strong>Timer quiz :</strong> {room?.gameConfig?.timerSeconds || 30} s</p>
                )}
                <p className="text-purple-600 font-medium pt-2">
                  Les deux players doivent être prêts pour démarrer.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <p className="text-gray-700 font-medium">Waiting du départ…</p>
              <p className="text-sm text-gray-500 mt-2">
                Marquez-vous prêt — la partie démarre ensemble.
              </p>
            </div>

            {false && (isCallActive && !audioRelayMode ? (
              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-8 border-2 border-blue-200/50 relative overflow-hidden">
                {/* Effet de glow animé */}
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl opacity-20 blur-xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.2, 0.3, 0.2],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                <div className="relative z-10">
                  {/* En-tête de l'appel */}
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mb-4 shadow-lg"
                    >
                      <Phone className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      Appel en cours
                    </h3>
                    <p className="text-gray-600">Vous êtes connecté avec votre partenaire</p>
                  </div>

                  {/* Avatars des players */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {room?.players?.map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-white/50"
                      >
                        <div className="text-center">
                          {/* Avatar animé */}
                          <motion.div
                            animate={{
                              scale: player.id === user.id && !isMuted ? [1, 1.05, 1] : 1,
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="relative inline-block mb-4"
                          >
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                              {player.email.charAt(0).toUpperCase()}
                            </div>
                            {/* Indicateur de statut */}
                            {player.id === user.id ? (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"
                              />
                            ) : (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-4 border-white"
                              />
                            )}
                          </motion.div>
                          <p className="font-semibold text-gray-800 text-sm mb-1">
                            {player.id === user.id ? "Vous" : player.email}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            {player.id === user.id ? (
                              isMuted ? (
                                <>
                                  <MicOff className="w-4 h-4 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">Micro coupé</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-4 h-4 text-green-500" />
                                  <span className="text-xs text-green-600 font-medium">En train de parler</span>
                                </>
                              )
                            ) : (
                              <>
                                <Phone className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-blue-600 font-medium">En ligne</span>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Indicateurs audio visuels */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Votre micro</span>
                          <span className="text-xs text-gray-500">{Math.round(localLevel * 100)}%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                            animate={{ width: `${Math.round(localLevel * 100)}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Audio partenaire</span>
                          <span className="text-xs text-gray-500">{Math.round(remoteLevel * 100)}%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                            animate={{ width: `${Math.round(remoteLevel * 100)}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contrôles de l'appel */}
                  <div className="flex justify-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleMute}
                      className={`px-6 py-4 rounded-full transition-all flex items-center justify-center shadow-lg ${
                        isMuted
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-white hover:bg-gray-100 text-gray-800 border-2 border-gray-300"
                      }`}
                    >
                      {isMuted ? (
                        <MicOff className="w-6 h-6" />
                      ) : (
                        <Mic className="w-6 h-6" />
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={endVoiceCall}
                      className="px-6 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all flex items-center justify-center shadow-lg"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </motion.button>
                  </div>

                  {/* Statut de connexion */}
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                      />
                      <span className="text-xs font-medium text-gray-700">
                        Sign in: {connState === 'connected' ? 'Établie' : connState}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">
                  Appel vocal
                </h3>

                {!isCallActive && (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mb-4 shadow-lg"
                    >
                      <Phone className="w-10 h-10 text-white" />
                    </motion.div>
                    <p className="text-gray-600 mb-4">
                      {allReady
                        ? "L'appel va démarrer automatiquement..."
                        : "Attendez que les deux players soient prêts"}
                    </p>
                    {allReady && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-green-600 font-semibold"
                      >
                        ⏳ Sign in en cours...
                      </motion.div>
                    )}
                  </div>
                )}

                {audioRelayMode && (
                  <div className="text-center">
                    <p className="text-sm text-purple-600 mb-4">
                      📡 Mode Relay actif
                    </p>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={sendVoiceMessage}
                        disabled={isRecording}
                        className={`px-6 py-3 rounded-lg transition-colors flex items-center ${
                          isRecording
                            ? "bg-red-600 text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        {isRecording ? "Enregistrement..." : "Parler (3s)"}
                      </button>
                      <button
                        onClick={() => {
                          setAudioRelayMode(false);
                          setIsCallActive(false);
                          if (recordingStream) {
                            recordingStream.getTracks().forEach(track => track.stop());
                            setRecordingStream(null);
                          }
                        }}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center"
                      >
                        <PhoneOff className="w-5 h-5 mr-2" />
                        Arrêter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Joueurs et statuts */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-blue-800">
                Joueurs ({room?.players?.length || 0}/2)
              </h3>
              <Users className="w-6 h-6 text-blue-600" />
            </div>

            <div className="space-y-4">
              {room?.players?.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="flex items-center mr-3">
                      {player.isHost && (
                        <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                      )}
                      <span className="font-medium text-gray-800">
                        {player.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {player.isReady ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="ml-2 text-sm text-gray-600">
                      {player.isReady ? "Ready" : "Waiting"}
                    </span>
                  </div>
                </div>
              ))}

              {/* Emplacement vide */}
              {room?.players?.length === 1 && (
                <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <span className="text-gray-500">
                    Waiting d'un autre joueur...
                  </span>
                </div>
              )}
            </div>

            {/* Bouton Ready */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <button
                onClick={toggleReady}
                disabled={room?.players?.length < 2}
                className={`w-full py-3 px-6 rounded-lg transition-colors flex items-center justify-center ${
                  isReady
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {isReady ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {isReady ? "Annuler" : "Je suis prêt !"}
              </button>

              {room?.players?.length < 2 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Attendez qu'un autre joueur rejoigne la salle
                </p>
              )}

              {hasTwoPlayers && !allReady && (
                <motion.p
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-sm text-blue-600 text-center mt-2 font-medium"
                >
                  ⏳ Waiting que l'autre joueur soit prêt...
                </motion.p>
              )}

              {allReady && !isCallActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2"
                >
                  <p className="text-sm text-green-600 text-center font-medium mb-2">
                    ✅ Les deux players sont prêts !
                  </p>
                  <motion.p
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-xs text-green-500 text-center"
                  >
                    L'appel va démarrer automatiquement...
                  </motion.p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio élément pour le stream distant */}
      {remoteStream && (
        <>
          <audio 
            ref={remoteStreamRef} 
            autoPlay 
            playsInline 
            volume={1.0}
            controls
            style={{ display: 'block', width: '200px', height: '40px', margin: '10px auto' }}
          />
          {audioUnlockNeeded && (
            <div className="fixed bottom-6 right-6 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg shadow">
              <p className="mb-2">Cliquez pour activer le son de votre partenaire</p>
              <button
                onClick={() => {
                  const el = remoteStreamRef.current; 
                  if (el) {
                    el.volume = 1.0;
                    el.muted = false;
                    el.play().then(()=>{
                      setAudioUnlockNeeded(false);
                      console.log('Audio unlocked and playing');
                    }).catch((e)=>{
                      console.error('Still blocked:', e);
                    });
                  }
                }}
                className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
              >
                Activer le son
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OnlineGameLobby;
