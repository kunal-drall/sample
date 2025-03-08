'use client';

import { useEffect, useCallback, useState, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GameCanvas } from '@/components/game/GameCanvas';
import Controls from '@/components/game/Controls';
import Leaderboard from '@/components/game/Leaderboard';
import { useGameStore } from '@/lib/store';
import { normalizeVector } from '@/lib/utils';
import { SNAKE_SKINS, SERVERS } from '@/lib/constants';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Game() {
  const { initializeGame, updateGame, setDirection } = useGameStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const animationFrameId = useRef<number>();
  const connectionTimeout = useRef<NodeJS.Timeout>();
  const initialized = useRef(false);
  const mounted = useRef(false);

  // Handle initial mount
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    // Prevent double initialization
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    // Validate URL parameters
    const playerName = searchParams.get('name') || 'Player';
    const skinId = searchParams.get('skin') || SNAKE_SKINS[0].id;
    const skin = SNAKE_SKINS.find(s => s.id === skinId) || SNAKE_SKINS[0];

    if (!playerName || !skinId) {
      router.replace('/');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(false);
    
    // Set a connection timeout
    connectionTimeout.current = setTimeout(() => {
      if (isActive) setConnectionError(true);
      setIsConnecting(false);
      toast.error('Failed to connect to game server');
    }, 10000); // 10 second timeout
    
    // Get the last selected server from localStorage
    let serverUrl;
    try {
      const lastServerId = localStorage.getItem('lastServer');
      serverUrl = lastServerId ? 
        SERVERS.find(s => s.id === lastServerId)?.url : 
        SERVERS[0].url;
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      serverUrl = SERVERS[0].url;
    }
    
    // Initialize game with connection callback
    initializeGame(playerName, skin, () => {
      if (isActive && mounted.current) {
        setIsConnecting(false);
      }
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
      }
      animationFrameId.current = requestAnimationFrame(gameLoop);
    });

    function gameLoop() {
      updateGame();
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      isActive = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
        connectionTimeout.current = undefined;
      }
      initialized.current = false;
    };
  }, [initializeGame, updateGame, searchParams]);

  const handleDirectionChange = useCallback((direction: { x: number; y: number }) => {
    const normalized = normalizeVector(direction);
    setDirection(normalized);
  }, [setDirection]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {(isConnecting || connectionError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center space-y-4">
            {connectionError ? (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-red-400 text-lg">
                  Failed to connect to game server
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Return to Menu
                </button>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  <p className="text-blue-400 animate-pulse text-lg">
                    Connecting to server...
                  </p>
                  <p className="text-blue-400/60 text-sm">
                    Please wait while we establish connection
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {!connectionError && (
        <>
          <GameCanvas />
          <Controls onDirectionChange={handleDirectionChange} />
          <Leaderboard />
        </>
      )}
    </main>
  );
}