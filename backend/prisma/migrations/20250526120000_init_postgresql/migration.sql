-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_hearts" (
    "userId" TEXT NOT NULL,
    "losses" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_hearts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "imagePath" TEXT,
    "videoUrl" TEXT,
    "order" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "pdfPath" TEXT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'Allemand',
    "languageLevel" TEXT NOT NULL DEFAULT 'A1',
    "subtitles" TEXT,
    "duration" TEXT,
    "rating" DOUBLE PRECISION,
    "viewers" TEXT,
    "imageUrl" TEXT,
    "mediaFileUrl" TEXT,
    "streamingUrl" TEXT,
    "platform" TEXT,
    "director" TEXT,
    "cast" TEXT,
    "year" INTEGER,
    "genre" TEXT,
    "season" INTEGER,
    "episodes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crosswords" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "width" INTEGER NOT NULL DEFAULT 15,
    "height" INTEGER NOT NULL DEFAULT 15,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "crosswords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crossword_entries" (
    "id" TEXT NOT NULL,
    "crosswordId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "clue" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "crossword_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "pdfUrl" TEXT,
    "audioUrl" TEXT,
    "language" TEXT NOT NULL DEFAULT 'Allemand',
    "languageLevel" TEXT NOT NULL DEFAULT 'A1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "german_bingo_classes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "german_bingo_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "german_bingo_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "german_bingo_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "german_bingo_word_classes" (
    "wordId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "german_bingo_word_classes_pkey" PRIMARY KEY ("wordId","classId")
);

-- CreateTable
CREATE TABLE "shadowing_videos" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "title" TEXT,
    "durationSec" INTEGER,
    "segmentsJson" TEXT NOT NULL,
    "fullText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shadowing_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadowing_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "quizJson" TEXT,
    "quizScore" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shadowing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "progress_userId_courseId_key" ON "progress"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "media_categories_name_key" ON "media_categories"("name");

-- CreateIndex
CREATE INDEX "crossword_entries_crosswordId_idx" ON "crossword_entries"("crosswordId");

-- CreateIndex
CREATE UNIQUE INDEX "shadowing_videos_youtubeId_key" ON "shadowing_videos"("youtubeId");

-- CreateIndex
CREATE UNIQUE INDEX "shadowing_sessions_userId_videoId_key" ON "shadowing_sessions"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "simulation_hearts" ADD CONSTRAINT "simulation_hearts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "media_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crosswords" ADD CONSTRAINT "crosswords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crossword_entries" ADD CONSTRAINT "crossword_entries_crosswordId_fkey" FOREIGN KEY ("crosswordId") REFERENCES "crosswords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "german_bingo_word_classes" ADD CONSTRAINT "german_bingo_word_classes_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "german_bingo_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "german_bingo_word_classes" ADD CONSTRAINT "german_bingo_word_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "german_bingo_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shadowing_sessions" ADD CONSTRAINT "shadowing_sessions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "shadowing_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
