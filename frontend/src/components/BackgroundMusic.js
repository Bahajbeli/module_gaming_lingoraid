import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const BackgroundMusic = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        if (audioRef.current && !isMuted) {
          audioRef.current.play().catch(() => {
            // Autoplay might still be blocked, ignore
          });
        }
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [hasInteracted, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      // Try to play immediately if not muted
      if (!isMuted) {
        audioRef.current.play().catch(() => {
          console.log("Autoplay blocked by browser. Waiting for interaction.");
        });
      }
    }
    localStorage.setItem('lingoraid_bgm_muted', isMuted);
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="https://res.cloudinary.com/dr3ywjd06/video/upload/v1779842133/Sharpen_Your_Focus_Puzzle_Lovers_Playlist_Music_for_Puzzle_Solving-_AudioTrimmer.com_v8kkt1.mp3"
        loop
        preload="auto"
        autoPlay
      />
      <button
        onClick={toggleMute}
        className="fixed bottom-6 right-6 z-50 p-3 bg-white/80 backdrop-blur-md border border-purple-100 rounded-full shadow-lg hover:bg-white hover:scale-110 hover:shadow-xl transition-all duration-300 text-purple-700"
        title={isMuted ? 'Activer la musique' : 'Désactiver la musique'}
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>
    </>
  );
};

export default BackgroundMusic;
