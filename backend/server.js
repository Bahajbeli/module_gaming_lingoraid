require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

// Test de la base de données au démarrage
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Parse JSON, URL-encoded and plain text bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ["text/*"], limit: "1mb" }));

// Gestionnaire d'erreurs pour les erreurs de parsing (JSON invalide)
app.use((err, req, res, next) => {
  if (!err) return next();

  if (err.type === "entity.parse.failed") {
    console.error("Body parse error:", err.message);
    return res
      .status(400)
      .json({ error: "Invalid request body", details: err.message });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Invalid JSON payload:", err.message);
    return res
      .status(400)
      .json({ error: "Invalid JSON payload", details: err.message });
  }

  // Passer à d'autres middlewares d'erreur
  next(err);
});

// Servir les fichiers statiques (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes (aligné avec index.js pour éviter les 404 si ce fichier est utilisé)
const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const progressRoutes = require("./routes/progress");
const gameRoutes = require("./routes/games");
const mediaRoutes = require("./routes/media");
const crosswordRoutes = require("./routes/crosswords");
const creativityRoutes = require("./routes/creativity");
const simulationRoutes = require("./routes/simulation");
const storiesRoutes = require("./routes/stories");
const mistralRoutes = require("./routes/mistral");
const ollamaConversationRoutes = require("./routes/ollama-conversation");
const voiceRoutes = require("./routes/voice");
const roomsRoutes = require("./routes/rooms");
const translateRoutes = require("./routes/translate");
const aiQuizRoutes = require("./routes/ai-quiz");
const progressAnalysisRoutes = require("./routes/progressAnalysis");
const germanBingoRoutes = require("./routes/german-bingo");

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/crosswords", crosswordRoutes);
app.use("/api/creativity", creativityRoutes);
app.use("/api/simulation", simulationRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/mistral", mistralRoutes);
app.use("/api/ollama", ollamaConversationRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/ai-quiz", aiQuizRoutes);
app.use("/api/progress-analysis", progressAnalysisRoutes);
app.use("/api/german-bingo", germanBingoRoutes);

// Socket.IO pour les salles de jeu
const { setupGameSocket } = require("./socket/gameSocket");
setupGameSocket(io, roomsRoutes);

// Route de santé
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    sockets: io.engine.clientsCount,
  });
});

// Gestion des erreurs globales
app.use((error, req, res, next) => {
  console.error("Erreur globale:", error);
  res.status(500).json({
    error: "Erreur interne du serveur",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

// Fonction d'initialisation de la base de données
async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log("✅ Connexion à la base de données réussie");

    // Créer l'utilisateur admin s'il n'existe pas
    const bcrypt = require("bcryptjs");
    const adminExists = await prisma.user.findUnique({
      where: { email: "admin@deutsche-lernen.com" },
    });

    if (!adminExists) {
      const hash = await bcrypt.hash("admin123", 12);
      await prisma.user.create({
        data: {
          email: "admin@deutsche-lernen.com",
          passwordHash: hash,
          role: "ADMIN",
        },
      });
      console.log(
        "👤 Utilisateur admin créé: admin@deutsche-lernen.com / admin123"
      );
    } else {
      console.log("👤 Utilisateur admin existe déjà");
    }

    // Créer un utilisateur test
    const userExists = await prisma.user.findUnique({
      where: { email: "user@deutsche-lernen.com" },
    });

    if (!userExists) {
      const hash = await bcrypt.hash("user123", 12);
      await prisma.user.create({
        data: {
          email: "user@deutsche-lernen.com",
          passwordHash: hash,
          role: "USER",
        },
      });
      console.log(
        "👤 Utilisateur test créé: user@deutsche-lernen.com / user123"
      );
    }
  } catch (error) {
    console.error("❌ Erreur de connexion à la base de données:", error);
    throw error;
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 Base de données: ${process.env.DATABASE_URL}`);
  console.log(`🎮 Socket.IO activé pour les salles de jeu`);
  console.log(
    `🔗 Client autorisé: ${process.env.CLIENT_URL || "http://localhost:3000"}`
  );

  // Initialiser la base de données
  try {
    await initializeDatabase();
    console.log("🎯 Serveur prêt à recevoir des connexions");
  } catch (error) {
    console.error("💥 Échec de l'initialisation, arrêt du serveur");
    process.exit(1);
  }
});

// Gestion des erreurs non capturées
process.on("uncaughtException", (error) => {
  console.error("Erreur non capturée:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promesse rejetée non gérée:", reason);
  process.exit(1);
});
