import React from 'react';
import { BookOpen, Gamepad2, Film, Headphones } from 'lucide-react';

const Dashboard = () => {
  const modules = [
    {
      id: 'cours',
      title: 'Cours',
      description: 'Apprenez l\'allemand avec nos cours structurés et progressifs',
      icon: BookOpen,
      gradient: 'from-blue-500 to-blue-600',
      href: '/courses'
    },
    {
      id: 'gaming',
      title: 'Gaming',
      description: 'Jouez et améliorez votre allemand de manière ludique',
      icon: Gamepad2,
      gradient: 'from-green-500 to-green-600',
      href: '/gaming'
    },
    {
      id: 'series-films',
      title: 'Séries & Films',
      description: 'Découvrez la culture allemande à travers le cinéma',
      icon: Film,
      gradient: 'from-purple-500 to-purple-600',
      href: '/media'
    },
    {
      id: 'podcasts',
      title: 'Podcasts',
      description: 'Écoutez et améliorez votre compréhension orale',
      icon: Headphones,
      gradient: 'from-pink-500 to-pink-600',
      href: '/podcasts'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome sur Deutsche Lernen
            </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Votre plateforme complète pour apprendre l'allemand de manière interactive et moderne
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <div
                key={module.id}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
                
                {/* Content */}
                <div className="relative p-8">
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${module.gradient} text-white mb-6 shadow-lg`}>
                    <IconComponent size={32} />
                    </div>

                  {/* Title & Description */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {module.title}
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {module.description}
                  </p>

                  {/* CTA Button */}
                  <a
                    href={module.href}
                    className={`inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r ${module.gradient} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                  >
                    Explorer
                    <svg 
                      className="ml-2 w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </a>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-gray-600">Étudiants actifs</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
            <div className="text-gray-600">Cours disponibles</div>
      </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
            <div className="text-gray-600">Taux de satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
