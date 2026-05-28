// Charger les variables d'environnement
const path = require("path");
const envPath = path.resolve(__dirname, ".env");
require("dotenv").config({ path: envPath });
console.log("📄 Fichier .env chargé depuis:", envPath);
console.log("🔑 GROQ_API_KEY présent:", !!process.env.GROQ_API_KEY);

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");

// Routes LingoRaid : auth + jeux uniquement
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const gameRoutes = require("./routes/games");
const crosswordRoutes = require("./routes/crosswords");
const creativityRoutes = require("./routes/creativity");
const simulationRoutes = require("./routes/simulation");
const mistralRoutes = require("./routes/mistral");
const ollamaConversationRoutes = require("./routes/ollama-conversation");
const voiceRoutes = require("./routes/voice");
const roomsRoutes = require("./routes/rooms");
const translateRoutes = require("./routes/translate");
const germanBingoRoutes = require("./routes/german-bingo");
const shadowingRoutes = require("./routes/shadowing");
const vocabQuizRoutes = require("./routes/vocabQuiz");
const adminRoutes = require("./routes/admin");
const { PrismaClient } = require("@prisma/client");
const { ensureDemoUsers } = require("./lib/ensureDemoUsers");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL &&
  process.env.CLIENT_URL.split(",")) || [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://127.0.0.1:3000",
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middlewares de sécurité
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
          ? process.env.CLIENT_URL.split(",")
          : ["https://votre-domaine.com"]
        : allowedOrigins,
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.json({ limit: process.env.MAX_PAYLOAD_LIMIT || "50mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_PAYLOAD_LIMIT || "50mb",
  })
);

app.use("/api/voice", voiceRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/crosswords", crosswordRoutes);
app.use("/api/creativity", creativityRoutes);
app.use("/api/simulation", simulationRoutes);
app.use("/api/mistral", mistralRoutes);
app.use("/api/ollama", ollamaConversationRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/german-bingo", germanBingoRoutes);
app.use("/api/shadowing", shadowingRoutes);
app.use("/api/vocab-quiz", vocabQuizRoutes);
app.use("/api/admin", adminRoutes);

const { setupGameSocket } = require("./socket/gameSocket");
setupGameSocket(io, roomsRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    message: "Serveur LingoRaid opérationnel",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("*", (req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

app.use((error, req, res, next) => {
  console.error("Erreur globale:", error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "Fichier trop volumineux",
      message: "La taille du fichier dépasse la limite autorisée",
    });
  }

  if (error.code === "P2002") {
    return res.status(400).json({
      error: "Conflit de données",
      message: "Une entrée avec ces informations existe déjà",
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      error: "Ressource non trouvée",
      message: "La ressource demandée n'existe pas",
    });
  }

  res.status(500).json({
    error: "Erreur interne du serveur",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Une erreur est survenue",
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    await ensureDemoUsers(prisma);
    console.log("✅ Comptes démo prêts (admin / user)");
  } catch (err) {
    console.error("❌ Erreur base de données au démarrage:", err.message);
    process.exit(1);
  }

  server
    .listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🎮 LingoRaid (jeux) opérationnel`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || "development"}`);
      console.log(`🎮 Socket.IO activé pour les salles de jeu`);
      console.log(`🔗 Clients autorisés: ${allowedOrigins.join(", ")}`);
      console.log(`🔐 Admin: admin@deutsche-lernen.com / admin123`);
      console.log(`🔐 User:  user@deutsche-lernen.com / user123`);
    })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} déjà utilisé.`);
        console.error(
          `   → Arrêtez l'autre processus:  npx kill-port ${PORT}`
        );
        console.error(
          `   → Ou changez PORT dans backend/.env (ex. 5001) et REACT_APP_API_URL côté frontend`
        );
      } else {
        console.error("❌ Erreur lors du démarrage du serveur:", error);
      }
      process.exit(1);
    });
}

startServer();

process.on("SIGTERM", () => {
  console.log("🛑 Arrêt du serveur...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Arrêt du serveur...");
  process.exit(0);
});
