import React, { useState, useEffect } from 'react';
import './StageDisplay.css';

const StageDisplay = ({ 
  stageNumber, 
  stageData, 
  onComplete, 
  onNext, 
  onPrevious,
  isVisible = false,
  onClose 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
      setUserAnswer('');
      setIsCompleted(false);
      setShowHint(false);
    }
  }, [stageNumber, isVisible]);

  const handleComplete = () => {
    setIsCompleted(true);
    if (onComplete) {
      onComplete(stageNumber);
    }
  };

  const handleNext = () => {
    if (currentStep < stageData.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    const currentStepData = stageData.steps[currentStep];
    
    if (currentStepData.type === 'question') {
      const isCorrect = userAnswer.toLowerCase().trim() === currentStepData.correctAnswer.toLowerCase().trim();
      
      if (isCorrect) {
        handleNext();
      } else {
        setShowHint(true);
      }
    } else {
      handleNext();
    }
  };

  if (!isVisible || !stageData) return null;

  const currentStepData = stageData.steps[currentStep];
  const progress = ((currentStep + 1) / stageData.steps.length) * 100;

  return (
    <div className="stage-display-overlay">
      <div className="stage-display-modal">
        {/* En-tête */}
        <div className="stage-header">
          <div className="stage-info">
            <h2>Stage {stageNumber}</h2>
            <p className="stage-title">{stageData.title}</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Barre de progression */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{currentStep + 1} / {stageData.steps.length}</span>
        </div>

        {/* Contenu du stage */}
        <div className="stage-content">
          {currentStepData && (
            <div className="step-content">
              {/* Type de contenu basé sur le type d'étape */}
              {currentStepData.type === 'instruction' && (
                <div className="instruction-step">
                  <div className="instruction-icon">📝</div>
                  <h3>{currentStepData.title}</h3>
                  <p>{currentStepData.content}</p>
                  {currentStepData.image && (
                    <img src={currentStepData.image} alt={currentStepData.title} />
                  )}
                </div>
              )}

              {currentStepData.type === 'question' && (
                <div className="question-step">
                  <div className="question-icon">❓</div>
                  <h3>{currentStepData.question}</h3>
                  <form onSubmit={handleAnswerSubmit}>
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Votre réponse..."
                      className="answer-input"
                    />
                    <button type="submit" className="submit-button">
                      Valider
                    </button>
                  </form>
                  {showHint && (
                    <div className="hint">
                      💡 Indice: {currentStepData.hint}
                    </div>
                  )}
                </div>
              )}

              {currentStepData.type === 'interactive' && (
                <div className="interactive-step">
                  <div className="interactive-icon">🎮</div>
                  <h3>{currentStepData.title}</h3>
                  <p>{currentStepData.description}</p>
                  <div className="interactive-content">
                    {currentStepData.component}
                  </div>
                </div>
              )}

              {currentStepData.type === 'video' && (
                <div className="video-step">
                  <div className="video-icon">🎥</div>
                  <h3>{currentStepData.title}</h3>
                  <p>{currentStepData.description}</p>
                  <div className="video-container">
                    <iframe
                      src={currentStepData.videoUrl}
                      title={currentStepData.title}
                      frameBorder="0"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="stage-actions">
          <button 
            className="action-button previous"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            ← Précédent
          </button>
          
          <div className="stage-status">
            {isCompleted ? (
              <span className="completed-status">✅ Stage terminé !</span>
            ) : (
              <span className="progress-status">Étape {currentStep + 1} sur {stageData.steps.length}</span>
            )}
          </div>
          
          <button 
            className="action-button next"
            onClick={handleNext}
            disabled={currentStep === stageData.steps.length - 1 && !isCompleted}
          >
            {currentStep === stageData.steps.length - 1 ? 'Completedr' : 'Suivant'} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageDisplay;
