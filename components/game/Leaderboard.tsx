'use client';

import { useGameStore } from '@/lib/store';
import { Coins } from 'lucide-react';

export default function Leaderboard() {
  const { players, playerId } = useGameStore();
  
  // Create leaderboard from players map, removing duplicates and sorting by score
  const leaderboard = Array.from(players.values())
    .filter((player, index, self) => 
      index === self.findIndex(p => p.id === player.id)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(player => ({
      id: player.id,
      name: player.name,
      score: player.score,
      tokens: player.tokens
    }));

  return (
    <div className="fixed top-4 right-4 w-72 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg p-4 shadow-lg shadow-blue-500/20">
      <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-4 font-mono">LEADERBOARD</h2>
      <div className="space-y-2">
        {leaderboard.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between ${
              player.id === playerId ? 'text-blue-400' : 'text-white'
            } transition-colors duration-200 p-2 rounded-md ${
              player.id === playerId ? 'bg-blue-500/10' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-blue-500 w-6">
                #{(index + 1).toString().padStart(2, '0')}
              </span>
              <span className="font-medium font-mono truncate">
                {player.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-purple-400">
                {player.score.toLocaleString()}
              </span>
              {player.tokens > 0 && (
                <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-mono text-yellow-400">
                    {player.tokens}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <div className="text-blue-400/60 text-center font-mono">WAITING FOR PLAYERS</div>
        )}
      </div>
    </div>
  );
}