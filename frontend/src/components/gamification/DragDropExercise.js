import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, RotateCcw, Star } from 'lucide-react';

const DragDropExercise = ({ 
  exercise, 
  onComplete, 
  onNext,
  points = 0 
}) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [droppedItems, setDroppedItems] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const { title, items, targets, correctMappings } = exercise;

  useEffect(() => {
    // Initialiser les mappings corrects si non fournis
    if (!correctMappings) {
      // Par défaut, associer par index
      const mappings = {};
      items.forEach((item, index) => {
        mappings[index] = index;
      });
      exercise.correctMappings = mappings;
    }
  }, [exercise, items]);

  const handleDragStart = (e, item, index) => {
    setDraggedItem({ item, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    
    if (!draggedItem) return;

    const newDroppedItems = {
      ...droppedItems,
      [targetIndex]: draggedItem
    };
    
    setDroppedItems(newDroppedItems);
    setDraggedItem(null);

    // Vérifier si l'exercice est terminé
    if (Object.keys(newDroppedItems).length === targets.length) {
      checkCompletion(newDroppedItems);
    }
  };

  const checkCompletion = (items) => {
    let correctCount = 0;
    
    Object.entries(items).forEach(([targetIndex, draggedItem]) => {
      const correctItemIndex = exercise.correctMappings[parseInt(targetIndex)];
      if (draggedItem.index === correctItemIndex) {
        correctCount++;
      }
    });

    const isCorrect = correctCount === targets.length;
    setIsCompleted(true);
    setShowFeedback(true);
    
    if (isCorrect) {
      setEarnedPoints(points + (exercise.points || 10));
    }

    setTimeout(() => {
      onComplete({ 
        isCorrect, 
        correctCount, 
        totalItems: targets.length,
        earnedPoints: isCorrect ? earnedPoints + (exercise.points || 10) : 0
      });
    }, 2000);
  };

  const resetExercise = () => {
    setDroppedItems({});
    setDraggedItem(null);
    setIsCompleted(false);
    setShowFeedback(false);
    setEarnedPoints(0);
  };

  const getItemForTarget = (targetIndex) => {
    return droppedItems[targetIndex] || null;
  };

  const isTargetCorrect = (targetIndex) => {
    const droppedItem = droppedItems[targetIndex];
    if (!droppedItem) return null;
    
    const correctItemIndex = exercise.correctMappings[parseInt(targetIndex)];
    return droppedItem.index === correctItemIndex;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600">Glissez les éléments aux bons endroits</p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">{earnedPoints} pts</span>
            </div>
            <button
              onClick={resetExercise}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recommencer</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Zone des éléments à glisser */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Éléments</h3>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, index) => {
                const isDropped = Object.values(droppedItems).some(dropped => dropped.index === index);
                
                return (
                  <motion.div
                    key={index}
                    className={`p-4 rounded-xl border-2 border-dashed text-center cursor-move transition-all duration-200 ${
                      isDropped 
                        ? 'opacity-50 border-gray-300 bg-gray-100' 
                        : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                    }`}
                    draggable={!isDropped}
                    onDragStart={(e) => handleDragStart(e, item, index)}
                    whileHover={!isDropped ? { scale: 1.05 } : {}}
                    whileTap={!isDropped ? { scale: 0.95 } : {}}
                  >
                    <span className="font-medium text-gray-700">{item}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Zone de dépôt */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Zones de dépôt</h3>
            <div className="space-y-3">
              {targets.map((target, index) => {
                const droppedItem = getItemForTarget(index);
                const isCorrect = isTargetCorrect(index);
                
                return (
                  <motion.div
                    key={index}
                    className={`min-h-[60px] p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
                      droppedItem
                        ? isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-600">Zone {index + 1}:</span>
                        <span className="ml-2 font-medium text-gray-800">{target}</span>
                      </div>
                      {droppedItem && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`p-2 rounded-lg ${
                            isCorrect ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          <span className={`font-medium ${
                            isCorrect ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {droppedItem.item}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className={`mt-8 p-4 rounded-xl border ${
                isCompleted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isCompleted ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-medium">
                      Parfait ! +{exercise.points || 10} points
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-red-700 font-medium">
                      Quelques erreurs. Essayez encore !
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DragDropExercise;

