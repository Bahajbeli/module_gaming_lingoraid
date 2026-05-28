import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, ArrowRight, Star, Clock, BookOpen } from 'lucide-react';
import ProgressTracker from './ProgressTracker';
import { getAssetUrl } from '../../utils/axios';

const LessonPage = ({ 
  lesson, 
  onComplete, 
  onNext,
  userProgress,
  chapterProgress 
}) => {

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showNextButton, setShowNextButton] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  
  const videoRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    // Simuler la progression de lecture
    const handleScroll = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        setReadingProgress(Math.min(progress, 100));
        
        // Afficher le bouton suivant quand 80% du contenu est lu
        if (progress >= 80 && !showNextButton) {
          setShowNextButton(true);
          setEarnedPoints(lesson.points || 10);
        }
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [showNextButton, lesson.points]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setEarnedPoints(earnedPoints + (lesson.points || 10));
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    onComplete({
      lessonId: lesson.id,
      points: earnedPoints,
      readingProgress,
      videoProgress: (currentTime / duration) * 100
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header de la leçon */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">{lesson.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{lesson.content.duration} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{lesson.points} points</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{earnedPoints}</div>
                  <div className="text-sm text-gray-500">points gagnés</div>
                </div>
              </div>

              {/* Barre de progression de la leçon */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(readingProgress, (currentTime / duration) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>

            {/* Vidéo */}
            {lesson.content.video && (
              <motion.div
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleVideoEnded}
                    onLoadedMetadata={() => setDuration(videoRef.current.duration)}
                  >
                    <source src={getAssetUrl(lesson.content.video)} type="video/mp4" />
                    Votre navigateur ne supporte pas la vidéo.
                  </video>
                  
                  {/* Contrôles vidéo */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={togglePlayPause}
                        className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white" />
                        )}
                      </button>
                      
                      <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-full h-1">
                        <div 
                          className="bg-white h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      
                      <span className="text-white text-sm font-medium">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      
                      <button
                        onClick={toggleMute}
                        className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5 text-white" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Contenu texte */}
            <motion.div
              ref={contentRef}
              className="bg-white rounded-2xl shadow-lg p-6 max-h-96 overflow-y-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">Contenu de la leçon</h3>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {lesson.content.text}
                </p>
              </div>
            </motion.div>

            {/* Bouton suivant */}
            <AnimatePresence>
              {showNextButton && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="text-center"
                >
                  <motion.button
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center space-x-2 mx-auto hover:from-green-600 hover:to-green-700 transition-all duration-200"
                    onClick={handleNext}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar avec progression */}
          <div className="lg:col-span-1">
            <ProgressTracker
              userProgress={userProgress}
              currentChapter={chapterProgress.current}
              totalChapters={chapterProgress.total}
              showDetailed={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPage;

