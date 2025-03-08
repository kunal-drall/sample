'use client';

import { useEffect, useState } from 'react';

export function FPSCounter() {
  const [fps, setFps] = useState(0);
  const [frames, setFrames] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const updateFPS = (currentTime: number) => {
      setFrames(prev => prev + 1);
      
      const delta = currentTime - lastTime;
      if (delta >= 1000) { // Update every second
        setFps(Math.round((frames * 1000) / delta));
        setFrames(0);
        setLastTime(currentTime);
      }
      
      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [lastTime, frames]);

  return (
    <div className="fixed top-4 right-4 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg px-3 py-2 text-white font-mono shadow-lg shadow-blue-500/20 z-50">
      {fps} FPS
    </div>
  );
}