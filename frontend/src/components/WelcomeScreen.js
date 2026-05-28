import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Mic, Trophy, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const WelcomeScreen = () => {
  const navigate = useNavigate();

  const mainCards = [
    {
      id: 'gaming',
      title: 'Gaming Arena',
      description: 'Play and learn while having fun',
      icon: Gamepad2,
      color: 'from-green-500 to-green-600',
      route: '/gaming',
      stats: 'Quiz, crosswords, bingo…'
    },
    {
      id: 'shadowing',
      title: 'Shadowing',
      description: 'YouTube videos + Whisper transcription',
      icon: Mic,
      color: 'from-indigo-500 to-violet-600',
      route: '/shadowing',
      stats: 'Repeat + AI quiz'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header avec animations */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 pt-8"
        >
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6"
          >
            LingoRaid
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 font-medium mb-8"
          >
            Learn German by playing
          </motion.p>
          
          {/* Stats rapides */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex justify-center gap-8 flex-wrap"
          >
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-gray-700 font-semibold">Quizzes & challenges</span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <Star className="h-5 w-5 text-blue-500" />
              <span className="text-gray-700 font-semibold">Solo & multiplayer</span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <Zap className="h-5 w-5 text-purple-500" />
              <span className="text-gray-700 font-semibold">Progress</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Cartes principales */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto"
        >
          {mainCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="group cursor-pointer"
              onClick={() => navigate(card.route)}
            >
              <div className={`relative bg-gradient-to-br ${card.color} rounded-3xl p-8 h-72 flex flex-col items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
                {/* Overlay pour effet de profondeur */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Contenu */}
                <div className="relative z-10 text-center">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    className="mb-6"
                  >
                    <card.icon className="w-16 h-16 mx-auto" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
                  <p className="text-white/90 mb-4 text-lg">
                    {card.description}
                  </p>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-semibold">
                    {card.stats}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
