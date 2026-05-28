import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axios';

// Import des composants de gamification
import LessonPage from './LessonPage';
import QuizPage from './QuizPage';
import DragDropExercise from './DragDropExercise';
import RewardPage from './RewardPage';
import ProgressTracker from './ProgressTracker';

const LearningFlow = ({ courseId, chapterId, lessonId }) => {
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState('lesson');
  const [currentLesson, setCurrentLesson] = useState(null);
  const [userProgress, setUserProgress] = useState({
    totalPoints: 0,
    streak: 0,
    badges: [],
    overallProgress: 0
  });
  const [chapterProgress, setChapterProgress] = useState({
    current: 1,
    total: 5
  });
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState(null);

  useEffect(() => {
    loadLesson();
    loadUserProgress();
  }, [courseId, chapterId, lessonId]);

  const loadLesson = async () => {
    try {
      // Simuler le chargement d'une leçon
      const mockLesson = {
        id: lessonId,
        title: 'Les lettres A-M',
        type: 'lesson',
        content: {
          text: `Welcome dans votre première leçon d'allemand !

Dans cette leçon, nous allons apprendre les premières lettres de l'alphabet allemand : A, B, C, D, E, F, G, H, I, J, K, L, M.

L'alphabet allemand est très similaire à l'alphabet français, mais il y a quelques différences importantes :

• La lettre "ß" (Eszett) qui n'existe qu'en allemand
• La prononciation de certaines lettres
• L'ordre alphabétique

Commençons par les premières lettres :

A - comme "Apfel" (pomme)
B - comme "Brot" (pain)
C - comme "Computer" (ordinateur)
D - comme "Deutsch" (allemand)
E - comme "Elefant" (éléphant)
F - comme "Fisch" (poisson)
G - comme "Garten" (jardin)
H - comme "Haus" (maison)
I - comme "Insel" (île)
J - comme "Jahr" (année)
K - comme "Katze" (chat)
L - comme "Löwe" (lion)
M - comme "Mond" (lune)

Pratiquez la prononciation de chaque lettre en répétant les mots d'exemple.`,
          video: '/uploads/alphabet-a-m.mp4',
          duration: 5
        },
        points: 10,
        nextStep: {
          type: 'quiz',
          questions: [
            {
              id: 'q1',
              question: 'Quelle est la première lettre de l\'alphabet allemand?',
              options: ['A', 'B', 'C', 'D'],
              correct: 0,
              points: 5
            },
            {
              id: 'q2',
              question: 'Comment se prononce la lettre "H" en allemand?',
              options: ['Ha', 'Hé', 'H', 'Ache'],
              correct: 2,
              points: 5
            },
            {
              id: 'q3',
              question: 'Quel mot allemand commence par la lettre "M"?',
              options: ['Mond', 'Mutter', 'Maus', 'Tous les trois'],
              correct: 3,
              points: 10
            }
          ]
        }
      };
      
      setCurrentLesson(mockLesson);
    } catch (error) {
      console.error('Error while chargement de la leçon:', error);
    }
  };

  const loadUserProgress = async () => {
    try {
      // Simuler le chargement des progrès utilisateur
      const mockProgress = {
        totalPoints: 150,
        streak: 7,
        badges: [
          { id: 'first-lesson', name: 'Premier Pas', icon: '👶' },
          { id: '3-day-streak', name: 'Débutant', icon: '🔥' }
        ],
        overallProgress: 25
      };
      
      setUserProgress(mockProgress);
    } catch (error) {
      console.error('Error while chargement des progrès:', error);
    }
  };

  const handleLessonComplete = (result) => {
    setEarnedPoints(earnedPoints + result.points);
    setCurrentStep('exercise');
  };

  const handleExerciseComplete = (result) => {
    setEarnedPoints(earnedPoints + result.earnedPoints);
    
    // Vérifier si c'est la fin du chapitre
    if (chapterProgress.current === chapterProgress.total) {
      showChapterReward();
    } else {
      setCurrentStep('next-lesson');
    }
  };

  const showChapterReward = () => {
    const mockReward = {
      badge: {
        id: 'alphabet-master',
        name: 'Maître de l\'Alphabet',
        description: 'Vous connaissez parfaitement l\'alphabet allemand!',
        icon: '🔤',
        points: 50
      },
      points: 50,
      chapter: 'L\'Alphabet',
      nextChapter: chapterProgress.current < chapterProgress.total ? 'Les Salutations' : null
    };
    
    setReward(mockReward);
    setShowReward(true);
    setCurrentStep('reward');
  };

  const handleRewardContinue = () => {
    setShowReward(false);
    setCurrentStep('next-chapter');
  };

  const handleNextChapter = () => {
    setChapterProgress(prev => ({
      ...prev,
      current: prev.current + 1
    }));
    setCurrentStep('lesson');
    setEarnedPoints(0);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'lesson':
        return (
          <LessonPage
            lesson={currentLesson}
            onComplete={handleLessonComplete}
            userProgress={userProgress}
            chapterProgress={chapterProgress}
          />
        );
      
      case 'exercise':
        if (currentLesson?.nextStep?.type === 'quiz') {
          return (
            <QuizPage
              questions={currentLesson.nextStep.questions}
              onComplete={handleExerciseComplete}
              points={earnedPoints}
            />
          );
        } else if (currentLesson?.nextStep?.type === 'drag-drop') {
          return (
            <DragDropExercise
              exercise={currentLesson.nextStep.exercise}
              onComplete={handleExerciseComplete}
              points={earnedPoints}
            />
          );
        }
        break;
      
      case 'reward':
        return (
          <RewardPage
            reward={reward}
            onContinue={handleRewardContinue}
            onNextChapter={handleNextChapter}
            userProgress={{
              ...userProgress,
              totalPoints: userProgress.totalPoints + earnedPoints
            }}
          />
        );
      
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h2>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LearningFlow;

