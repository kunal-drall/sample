'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gamepad2, Sword } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { SkinSelector } from '@/components/game/SkinSelector';
import { ServerSelector } from '@/components/game/ServerSelector';
import { SNAKE_SKINS, SERVERS } from '@/lib/constants';
import { useGameStore } from '@/lib/store';
import type { SnakeSkin } from '@/lib/types';
import { toast } from 'sonner';

interface GameServer {
  id: string;
  name: string;
  region: string;
  url: string;
  ping: number | null;
  players: number;
  maxPlayers: number;
  status: 'online' | 'offline' | 'full';
}

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [selectedSkin, setSelectedSkin] = useState<SnakeSkin>(SNAKE_SKINS[0]);
  const [selectedServer, setSelectedServer] = useState<GameServer | null>(null);
  const router = useRouter();
  const { initializeGame } = useGameStore();
  const [isInitializing, setIsInitializing] = useState(false);

  // Move localStorage access inside useEffect to ensure client-side execution
  useEffect(() => {
    try {
      const lastServerId = localStorage.getItem('lastServer');
      if (lastServerId) {
        const server = SERVERS.find(s => s.id === lastServerId);
        if (server) {
          setSelectedServer(server);
        }
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (!selectedServer) {
      toast.error('Please select a server first');
      return;
    }

    if (selectedServer.status !== 'online') {
      toast.error('Selected server is not available');
      return;
    }

    if (!playerName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsInitializing(true);
    
    const name = playerName || 'Player';
    const params = new URLSearchParams({
      name: name,
      skin: selectedSkin.id,
    });
    
    // Initialize game with selected server
    initializeGame(name, selectedSkin);
    localStorage.setItem('lastServer', selectedServer.id);
    
    router.push(`/game?${params.toString()}`);
  }, [playerName, selectedSkin, router, initializeGame]);

  return (
    <div className="min-h-screen bg-[#0a0a1f] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background with grid dots */}
      {isInitializing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-blue-400 animate-pulse">Initializing Game...</p>
          </div>
        </div>
      )}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          Array.from({ length: 20 }).map((_, j) => (
            <div
              key={`${i}-${j}`}
              className="absolute w-1 h-1 bg-white/5 rounded-full"
              style={{
                left: `${(j + 0.5) * (100 / 20)}%`,
                top: `${(i + 0.5) * (100 / 20)}%`,
                animation: `pulse 4s infinite ${(i + j) * 0.1}s`
              }}
            />
          ))
        ))}
      </div>
      
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>
      
      {/* Border ring effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-500/20 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[610px] h-[610px] border border-purple-500/10 rounded-full animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] border border-cyan-500/5 rounded-full animate-pulse delay-1000" />
      
      <div className="relative text-center space-y-8 max-w-md w-full backdrop-blur-lg bg-black/40 p-8 rounded-2xl border border-white/10">
        <div className="flex justify-center gap-4 items-center">
          <Gamepad2 className="w-12 h-12 text-blue-400 animate-pulse" />
          <Sword className="w-12 h-12 text-purple-400 animate-pulse delay-500" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 animate-text tracking-tight">
            Slith3r
          </h1>
          <p className="text-blue-200/80 text-lg">
            Enter the neon arena and compete for digital supremacy
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <ServerSelector
              selectedServer={selectedServer}
              onSelect={setSelectedServer}
            />
          </div>

          <Input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-white/5 border-blue-500/30 text-white placeholder:text-blue-200/30 focus:border-purple-500/50 transition-colors"
          />
          
          <div className="space-y-2">
            <SkinSelector
              selectedSkin={selectedSkin}
              onSelectSkin={setSelectedSkin}
            />
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 hover:from-blue-600 hover:via-purple-600 hover:to-cyan-600 text-white font-semibold text-lg py-6 shadow-lg shadow-blue-500/25 transition-all hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]" 
            size="lg" 
            onClick={handlePlay}
            disabled={!selectedServer || selectedServer.status !== 'online' || !playerName.trim()}
          >
            {isInitializing ? 'Initializing...' : !selectedServer ? 'Select a Server' :
             selectedServer.status !== 'online' ? 'Server Offline' :
             !playerName.trim() ? 'Enter Name' :
             'Play'}
          </Button>
        </div>
        
        <div className="text-sm text-blue-200/50">
          Use arrow keys or mouse to move • Right click to boost
        </div>
      </div>
    </div>
  );
}