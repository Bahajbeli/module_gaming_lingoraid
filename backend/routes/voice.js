const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const openaiConversation = require('../services/openaiConversationService');
const freeConversation = require('../services/freeConversationService');
const { isMessageOnTopic } = require('../services/topicGuardService');
// node-fetch v3 is ESM-only; use dynamic import wrapper for CJS compatibility
const fetchFn = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Ensure upload directories exist
const uploadsRoot = path.join(__dirname, "..", "uploads");
const ttsDir = path.join(uploadsRoot, "tts");
const debugInDir = path.join(uploadsRoot, "debug-in");
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
if (!fs.existsSync(ttsDir)) fs.mkdirSync(ttsDir, { recursive: true });
if (!fs.existsSync(debugInDir)) fs.mkdirSync(debugInDir, { recursive: true });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Multer in-memory storage; we forward the buffer to APIs (max 25MB for voice)
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });
/** JSON déjà parsé par express.json global ; multipart → multer */
function conversationBodyParser(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return next();
  }
  return upload.single('audio')(req, res, next);
}

function buildTranscriptionForm(audioBuffer, filename, mimeType, model) {
  const form = new FormData();
  form.append("file", audioBuffer, {
    filename: filename || "audio.webm",
    contentType: mimeType || "audio/webm",
  });
  form.append("model", model);
  form.append("language", "de");
  form.append("response_format", "json");
  form.append("temperature", "0");
  return form;
}

/** Groq Whisper (gratuit / quota séparé) — prioritaire si GROQ_API_KEY */
async function transcribeWithGroq(audioBuffer, filename, mimeType) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY non configurée");
  }
  const form = buildTranscriptionForm(
    audioBuffer,
    filename,
    mimeType,
    "whisper-large-v3-turbo"
  );
  const resp = await fetchFn(GROQ_WHISPER_URL, {
    method: "POST",
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: form,
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Groq Whisper ${resp.status}: ${errTxt}`);
  }
  const data = await resp.json();
  return (data.text || "").trim();
}

/** OpenAI Whisper — secours */
async function transcribeWithOpenAI(audioBuffer, filename, mimeType) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY non configurée");
  }
  const form = buildTranscriptionForm(audioBuffer, filename, mimeType, "whisper-1");
  const resp = await fetchFn(`${OPENAI_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`OpenAI Whisper ${resp.status}: ${errTxt}`);
  }
  const data = await resp.json();
  return (data.text || "").trim();
}

/** Transcription : Groq d'abord, puis OpenAI */
async function transcribeAudio(audioBuffer, filename, mimeType) {
  const providers = [];
  if (GROQ_API_KEY) providers.push({ name: "groq", fn: transcribeWithGroq });
  if (OPENAI_API_KEY) providers.push({ name: "openai", fn: transcribeWithOpenAI });
  if (providers.length === 0) {
    throw new Error(
      "Aucune clé API pour la transcription (GROQ_API_KEY ou OPENAI_API_KEY)"
    );
  }

  let lastError;
  for (const { name, fn } of providers) {
    try {
      const text = await fn(audioBuffer, filename, mimeType);
      if (text) {
        console.log(`[voice] Transcription OK (${name}):`, text);
        return text;
      }
    } catch (err) {
      console.warn(`[voice] Transcription ${name} échouée:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("Transcription vide");
}

// Helper: appel Groq avec thème + historique (même format qu'OpenAI)
async function generateWithGroq(userText, conversationHistory = [], systemPrompt = '') {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY non configurée');
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
  }
  messages.push({ role: 'user', content: userText });

  const resp = await fetchFn(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 200,
      temperature: 0.8,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Groq ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq empty response');
  return text;
}

// Helper: Groq en priorité pour la conversation, OpenAI en secours
async function generateAIResponse(userText, conversationHistory = [], systemPrompt = '') {
  if (!userText || userText.trim() === '') {
    return "Entschuldigung, ich habe Sie nicht verstanden. Könnten Sie das bitte wiederholen?";
  }

  console.log('Generating AI response with:', {
    userText,
    conversationHistoryLength: conversationHistory.length,
    systemPrompt: systemPrompt ? 'YES' : 'NO'
  });

  // 1) Groq en priorité (thème + historique)
  try {
    const response = await generateWithGroq(userText, conversationHistory, systemPrompt);
    console.log('Generated response (Groq):', response);
    return response;
  } catch (groqError) {
    console.warn('Groq failed, trying fallback:', groqError.message);
  }

  // 2) freeConversation (autres APIs gratuites)
  try {
    const response = await freeConversation.generateConversationResponse(
      userText,
      conversationHistory,
      systemPrompt
    );
    console.log('Generated response (fallback):', response);
    return response;
  } catch (fallbackError) {
    console.warn('Fallback failed, trying OpenAI:', fallbackError.message);
  }

  // 3) OpenAI en secours
  try {
    const response = await openaiConversation.generateConversationResponse(
      userText,
      conversationHistory,
      systemPrompt
    );
    console.log('Generated response (OpenAI):', response);
    return response;
  } catch (openaiError) {
    console.error('OpenAI failed:', openaiError.message);
    throw openaiError;
  }
}

// Helper: create TTS mp3 from text via OpenAI
async function synthesizeTTS(text) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY not configured. Veuillez configurer votre clé API OpenAI dans le fichier .env du serveur"
    );
  }

  const resp = await fetchFn(`${OPENAI_API_BASE}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "alloy",
      input: text,
      format: "mp3",
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`TTS error ${resp.status}: ${errTxt}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `tts-${Date.now()}.mp3`;
  const filePath = path.join(ttsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

// POST /api/voice/conversation : Real-time voice conversation for simulation
// Handles both voice (with audio file) and text (with userMessage) conversations
router.post("/conversation", conversationBodyParser, async (req, res) => {
  try {
    const body = req.body || {};
    console.log("POST /api/voice/conversation headers:", req.headers);
    console.log("POST /api/voice/conversation body:", body);

    // Extract parameters from request
    let theme = body.theme || req.query?.theme;
    let imageDescription = body.imageDescription || '';
    let userMessage = body.userMessage; // Text message from user
    let conversationHistory = [];
    
    // Parse conversation history if provided
    if (body.conversationHistory) {
      try {
        conversationHistory = typeof body.conversationHistory === 'string'
          ? JSON.parse(body.conversationHistory)
          : body.conversationHistory;
      } catch (e) {
        console.warn('Failed to parse conversationHistory:', e.message);
      }
    }

    // If no theme provided, use default
    if (!theme) {
      theme = "Conversation générale";
    }

    console.log('Conversation params:', { theme, userMessage, hasAudio: !!req.file });

    // Prepare system prompt
    const systemPrompt = `Tu es un assistant conversationnel germanophone.
Règles:
- Parle poliment et de façon engageante en allemand.
- Réponds en 2 à 3 phrases maximum.
- Réponds de manière contextuelle à ce que dit l'utilisateur.
- Pose des questions pour faire participer l'utilisateur.
- Corrige gentiment les erreurs de grammaire si nécessaire.
- Sujet de conversation: ${theme}`;

    let transcript = "";
    let responseText = "";
    let audioFile = null;

    // CASE 1: Voice conversation (audio file provided)
    if (req.file && req.file.buffer) {
      console.log('[voice] Processing voice conversation...', 'size=', req.file.size, 'mimetype=', req.file.mimetype);
      
      // 1) Save debug copy
      try {
        const dbgName = `in-${Date.now()}-${(req.file.originalname || "audio").replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
        const dbgPath = path.join(debugInDir, dbgName);
        fs.writeFileSync(dbgPath, req.file.buffer);
        console.log(`[voice] Saved debug input: ${dbgPath}`);
      } catch (dbgErr) {
        console.warn("Could not save debug input:", dbgErr.message);
      }

      // 2) Transcribe with Whisper
      try {
        console.log(`[voice] Attempting Whisper transcription, mimetype=${req.file.mimetype}, size=${req.file.size} bytes`);
        transcript = await transcribeAudio(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      } catch (whisperError) {
        console.error('[voice] Transcription failed:', whisperError.message);
        transcript = "";
      }

      // 3) Vérifier le thème (simulation)
      if (transcript && transcript.trim().length > 0) {
        const onTopic = await isMessageOnTopic(transcript, theme, { imageDescription });
        if (!onTopic) {
          return res.json({
            success: true,
            game_over: true,
            off_topic: true,
            lose_message: 'You lose',
            user_transcript: transcript,
          });
        }
      }

      // 4) Generate response
      if (transcript && transcript.trim().length > 0) {
        responseText = await generateAIResponse(
          transcript,
          conversationHistory,
          systemPrompt
        );
      } else {
        return res.status(503).json({
          success: false,
          error: "TRANSCRIPTION_FAILED",
          message:
            "Impossible de transcrire votre voix. Vérifiez GROQ_API_KEY ou OPENAI_API_KEY dans server/.env.",
        });
      }

      // 4) Synthesize TTS
      try {
        audioFile = await synthesizeTTS(responseText);
      } catch (ttsError) {
        console.error("[voice] TTS failed:", ttsError.message);
      }

      return res.json({
        success: true,
        ai_response: responseText,
        user_transcript: transcript,
        audio_url: audioFile ? `/uploads/tts/${audioFile}` : null,
        use_browser_tts: !audioFile,
      });
    }
    // CASE 2: Text conversation (userMessage provided)
    else if (userMessage && userMessage.trim().length > 0) {
      console.log('[text] Processing text conversation...');
      console.log('[text] User message:', userMessage);

      const onTopic = await isMessageOnTopic(userMessage, theme, { imageDescription });
      if (!onTopic) {
        console.log('[text] OFF_TOPIC — game over', { theme, userMessage });
        return res.json({
          success: true,
          game_over: true,
          off_topic: true,
          lose_message: 'You lose',
        });
      }
      
      try {
        // Generate response using AI APIs (will throw if all fail)
        responseText = await generateAIResponse(
          userMessage,
          conversationHistory,
          systemPrompt
        );

        console.log('[text] AI response:', responseText);

        return res.json({
          success: true,
          ai_response: responseText,
          conversationId: body.conversationId || `conv-${Date.now()}`,
        });
      } catch (aiError) {
        console.error('[text] All AI APIs failed:', aiError.message);
        return res.status(503).json({
          success: false,
          error: 'AI_UNAVAILABLE',
          message: aiError.message || 'Les services d\'IA sont temporairement indisponibles. Veuillez réessayer dans quelques secondes.'
        });
      }
    }
    // CASE 3: Starting conversation (no user input)
    else {
      console.log('[conversation] Starting new conversation...');
      
      // Generate initial greeting
      responseText = await generateAIResponse(
        `Begrüße den Benutzer freundlich auf Deutsch und lade ihn ein, über das Thema "${theme}" zu sprechen. Halte es kurz und natürlich.`,
        [],
        systemPrompt
      );

      return res.json({
        success: true,
        ai_response: responseText,
        conversationId: body.conversationId || `conv-${Date.now()}`,
      });
    }
  } catch (error) {
    console.error('Error in /conversation endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process conversation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Helper: process voice (transcribe + AI + TTS) from an audio buffer
async function processVoiceBuffer(audioBuffer, conversationHistory, systemPrompt, theme, originalname, mimeType, imageDescription = '') {
  let transcript = "";
  try {
    transcript = await transcribeAudio(
      audioBuffer,
      originalname || "audio.webm",
      mimeType || "audio/webm"
    );
  } catch (whisperError) {
    console.error("[voice] Transcription failed:", whisperError.message);
    return {
      transcript: "",
      responseText: null,
      audioFile: null,
      gameOver: false,
      transcriptionFailed: true,
    };
  }

  let responseText = "";
  if (transcript && transcript.trim().length > 0) {
    const onTopic = await isMessageOnTopic(transcript, theme, { imageDescription });
    if (!onTopic) {
      return { transcript, responseText: null, audioFile: null, gameOver: true };
    }
    responseText = await generateAIResponse(transcript, conversationHistory, systemPrompt);
  } else {
    return {
      transcript: "",
      responseText: null,
      audioFile: null,
      gameOver: false,
      transcriptionFailed: true,
    };
  }

  let audioFile = null;
  try {
    audioFile = await synthesizeTTS(responseText);
  } catch (ttsError) {
    console.error("[voice] TTS failed:", ttsError.message);
  }

  return { transcript, responseText, audioFile };
}

// POST /api/voice/conversation-audio : Voice via JSON (audio in base64) - évite les soucis multipart
router.post("/conversation-audio", express.json({ limit: "30mb" }), async (req, res) => {
  try {
    const { audioBase64, theme, conversationHistory: history, imageDescription } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({
        success: false,
        error: "audioBase64 requis (chaîne base64)",
      });
    }

    let conversationHistory = [];
    if (history) {
      conversationHistory = typeof history === "string" ? JSON.parse(history) : history;
    }
    const themeVal = theme || "Conversation générale";
    const systemPrompt = `Tu es un assistant conversationnel germanophone.
Règles:
- Parle poliment et de façon engageante en allemand.
- Réponds en 2 à 3 phrases maximum.
- Réponds de manière contextuelle à ce que dit l'utilisateur.
- Pose des questions pour faire participer l'utilisateur.
- Corrige gentiment les erreurs de grammaire si nécessaire.
- Sujet de conversation: ${themeVal}`;

    const audioBuffer = Buffer.from(audioBase64, "base64");
    if (audioBuffer.length < 500) {
      return res.status(400).json({
        success: false,
        error: "Audio trop court",
      });
    }

    console.log("[voice] conversation-audio: size=", audioBuffer.length);
    const { transcript, responseText, audioFile, gameOver, transcriptionFailed } =
      await processVoiceBuffer(
        audioBuffer,
        conversationHistory,
        systemPrompt,
        themeVal,
        "voice.webm",
        "audio/webm",
        imageDescription || ""
      );

    if (transcriptionFailed) {
      return res.status(503).json({
        success: false,
        error: "TRANSCRIPTION_FAILED",
        message:
          "Votre micro fonctionne, mais la transcription a échoué. Ajoutez GROQ_API_KEY dans LingoRaid/backend/.env (recommandé).",
      });
    }

    if (gameOver) {
      return res.json({
        success: true,
        game_over: true,
        off_topic: true,
        lose_message: 'You lose',
        user_transcript: transcript,
      });
    }

    return res.json({
      success: true,
      ai_response: responseText,
      user_transcript: transcript,
      audio_url: audioFile ? `/uploads/tts/${audioFile}` : null,
      use_browser_tts: !audioFile,
    });
  } catch (error) {
    console.error("Error in /conversation-audio:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process voice",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Voice relay endpoint for when WebRTC fails
router.post("/relay", upload.single("audio"), async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "Fichier audio manquant" });
    }

    if (!roomId) {
      return res.status(400).json({ error: "Room ID manquant" });
    }

    // Sauvegarder le fichier audio temporairement
    const messageId = `voice_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const fileName = `${messageId}.webm`;
    const filePath = path.join(uploadsRoot, fileName);

    fs.writeFileSync(filePath, req.file.buffer);
    console.log(`[voice-relay] Saved voice message: ${filePath}`);

    // Répondre avec l'ID du message
    res.json({
      success: true,
      messageId,
      audioUrl: `/uploads/${fileName}`,
      roomId,
    });
  } catch (error) {
    console.error("Voice relay error:", error);
    res.status(500).json({
      error: "Erreur lors du traitement du message vocal",
      details: error.message,
    });
  }
});

// POST /api/voice/conversation-text : messages texte simulation (JSON fiable, sans multer)
router.post('/conversation-text', async (req, res) => {
  try {
    const body = req.body || {};
    const theme = body.theme || 'Conversation générale';
    const imageDescription = body.imageDescription || '';
    const userMessage = body.userMessage;
    let conversationHistory = body.conversationHistory || [];

    if (typeof conversationHistory === 'string') {
      try {
        conversationHistory = JSON.parse(conversationHistory);
      } catch {
        conversationHistory = [];
      }
    }

    if (!userMessage || !String(userMessage).trim()) {
      return res.status(400).json({ success: false, error: 'userMessage requis' });
    }

    console.log('[conversation-text]', { theme, userMessage });

    const systemPrompt = `Tu es un assistant conversationnel germanophone.
Règles:
- Parle poliment et de façon engageante en allemand.
- Réponds en 2 à 3 phrases maximum.
- Réponds de manière contextuelle à ce que dit l'utilisateur.
- Pose des questions pour faire participer l'utilisateur.
- Corrige gentiment les erreurs de grammaire si nécessaire.
- Reste STRICTEMENT sur le sujet: ${theme}
- Si le joueur change de sujet, ne le suis pas.`;

    const onTopic = await isMessageOnTopic(userMessage, theme, { imageDescription });
    if (!onTopic) {
      console.log('[conversation-text] OFF_TOPIC — game over', { theme, userMessage });
      return res.json({
        success: true,
        game_over: true,
        off_topic: true,
        lose_message: 'You lose',
      });
    }

    const responseText = await generateAIResponse(
      userMessage,
      conversationHistory,
      systemPrompt
    );

    return res.json({
      success: true,
      ai_response: responseText,
      conversationId: body.conversationId || `conv-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error in /conversation-text:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process conversation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
