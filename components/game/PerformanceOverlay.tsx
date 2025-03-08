import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

export function PerformanceOverlay() {
  const { fps, quality, averageFrameTime } = usePerformanceMonitor();

  return (
    <div className="fixed bottom-4 right-4 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg p-3 text-white font-mono space-y-1 shadow-lg shadow-blue-500/20">
      <div className="flex items-center gap-2">
        <span className="text-blue-400">FPS:</span>
        <span className={`${fps >= 60 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
          {fps}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-blue-400">Frame Time:</span>
        <span>{averageFrameTime.toFixed(2)}ms</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-blue-400">Quality:</span>
        <span className={`
          ${quality === 'HIGH' ? 'text-green-400' : 
            quality === 'MEDIUM' ? 'text-yellow-400' : 
            'text-red-400'}
        `}>
          {quality}
        </span>
      </div>
    </div>
  );
}