import { useState, useEffect, useCallback, useRef } from 'react';
import { PERFORMANCE_CONFIG } from '@/lib/constants';

const SAMPLE_SIZE = 60; // 1 second of samples at 60fps
const QUALITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
type QualityLevel = typeof QUALITY_LEVELS[number];

export function usePerformanceMonitor() {
  const [quality, setQuality] = useState<QualityLevel>('HIGH');
  const refs = useRef({
    frameTimes: [] as number[],
    lastUpdate: performance.now()
  });
  const [fps, setFps] = useState(0);
  const [averageFrameTime, setAverageFrameTime] = useState(0);

  const addFrameTime = useCallback((frameTime: number) => {
    refs.current.frameTimes.push(frameTime);
    if (refs.current.frameTimes.length > SAMPLE_SIZE) {
      refs.current.frameTimes.shift();
    }

    const now = performance.now();
    if (now - refs.current.lastUpdate >= 1000) { // Update every second
      const avg = refs.current.frameTimes.reduce((a, b) => a + b, 0) / refs.current.frameTimes.length;
      setAverageFrameTime(avg);
      setFps(Math.round(1000 / avg));

      if (PERFORMANCE_CONFIG.ADAPTIVE_QUALITY) {
        if (avg > PERFORMANCE_CONFIG.FRAME_BUDGET * 1.2) {
          setQuality(prev => {
            const currentIndex = QUALITY_LEVELS.indexOf(prev);
            return currentIndex > 0 ? QUALITY_LEVELS[currentIndex - 1] : prev;
          });
        } else if (avg < PERFORMANCE_CONFIG.FRAME_BUDGET * 0.8) {
          setQuality(prev => {
            const currentIndex = QUALITY_LEVELS.indexOf(prev);
            return currentIndex < QUALITY_LEVELS.length - 1 ? 
              QUALITY_LEVELS[currentIndex + 1] : prev;
          });
        }
      }

      refs.current.lastUpdate = now;
      refs.current.frameTimes = [];
    }
  }, []);

  return {
    quality,
    addFrameTime,
    fps,
    averageFrameTime
  };
}