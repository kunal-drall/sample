'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wifi, WifiOff, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVERS } from '@/lib/constants';
import type { GameServer } from '@/lib/types';
import { toast } from 'sonner';

interface ServerSelectorProps {
  onSelect: (server: GameServer) => void;
  selectedServer: GameServer | null;
}

export function ServerSelector({ onSelect, selectedServer }: ServerSelectorProps) {
  const [servers, setServers] = useState<GameServer[]>([...SERVERS]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkServers();
    const interval = setInterval(checkServers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServers = async () => {
    setRefreshing(true);
    const updatedServers = await Promise.all(
      SERVERS.map(async (server) => {
        try {
          const startTime = performance.now();
          const ws = new WebSocket(server.url);
          
          const pings: number[] = [];
          let pingCount = 0;
          
          return new Promise<GameServer>((resolve) => {
            const timeout = setTimeout(() => {
              ws.close();
              resolve({
                ...server,
                status: 'offline' as const,
                ping: null
              });
            }, 5000);

            const sendPing = () => {
              if (pingCount < 3) {
                const pingStart = performance.now();
                ws.send('ping');
                pingCount++;
                
                const pongHandler = () => {
                  const pingTime = performance.now() - pingStart;
                  pings.push(pingTime);
                  ws.removeEventListener('message', pongHandler);
                  
                  if (pingCount < 3) {
                    setTimeout(sendPing, 100);
                  } else {
                    const avgPing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
                    clearTimeout(timeout);
                    ws.close();
                    resolve({
                      ...server,
                      status: server.players >= server.maxPlayers ? 'full' as const : 'online' as const,
                      ping: avgPing
                    });
                  }
                };
                
                ws.addEventListener('message', pongHandler);
              }
            };

            ws.onopen = () => {
              sendPing();
            };

            ws.onerror = () => {
              clearTimeout(timeout);
              ws.close();
              resolve({
                ...server,
                status: 'offline' as const,
                ping: null
              });
            };
          });
        } catch (error) {
          console.error(`Failed to check server ${server.name}:`, error);
          return {
            ...server,
            status: 'offline' as const,
            ping: null
          };
        }
      })
    );

    // Find at least one online server
    const onlineServer = updatedServers.find(s => s.status === 'online');
    if (!onlineServer) {
      toast.error('No servers are currently available. Please try again later.');
    }

    setServers(updatedServers);
    setRefreshing(false);
  };

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-blue-200/80">Game Server</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => checkServers()}
          disabled={refreshing}
          className="text-blue-200/60 hover:text-blue-200/80"
        >
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[200px] rounded-md border border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="p-4 space-y-2">
          {servers.map((server) => (
            <button
              key={server.id}
              onClick={() => onSelect(server)}
              disabled={server.status !== 'online'}
              className={cn(
                "w-full p-4 rounded-lg transition-all duration-200",
                "border border-white/10 backdrop-blur-sm",
                "hover:border-blue-500/30 hover:bg-blue-500/5",
                selectedServer?.id === server.id
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-black/20",
                server.status !== 'online' && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <div className="font-medium text-white">{server.name}</div>
                    <div className="text-sm text-blue-200/60">{server.region}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400/60" />
                    <span className="text-sm text-blue-200/60">
                      {server.players}/{server.maxPlayers}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 min-w-[80px] justify-end">
                    {server.status === 'online' ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-blue-200/60">
                          {server.ping}ms
                        </span>
                      </>
                    ) : server.status === 'full' ? (
                      <>
                        <Users className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400">Full</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}