'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { VISUAL_CONFIG, GAME_CONFIG } from '@/lib/constants';
import { AlertCircle, Wifi, WifiOff, Timer } from 'lucide-react';
import { FPSCounter } from './FPSCounter';
import { Token, Vector2D } from '@/lib/types';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refs = useRef({
    lastFrameTime: 0,
    mousePos: { x: 0, y: 0 }
  });
  
  const { 
    players, 
    playerId, 
    food,
    tokens,
    mapSize,
    nextCircleShrink,
    socket,
    updateGame 
  } = useGameStore();
  const connectionStatus = socket?.getStatus();
  const latency = socket?.getLatency() || 0;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      refs.current.mousePos = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) return;

    const drawToken = (token: Token, cameraX: number, cameraY: number, timestamp: number) => {
      const x = token.position.x + cameraX;
      const y = token.position.y + cameraY;
      
      ctx.shadowColor = token.color;
      ctx.shadowBlur = token.collectible ? 20 : 10;
      
      const pulseScale = token.collectible ? 
        1 + Math.sin(timestamp * 0.003) * 0.1 : 
        1;
      
      ctx.fillStyle = token.color;
      ctx.beginPath();
      ctx.arc(x, y, token.size * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      
      const logoSize = token.size * 0.6 * pulseScale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      
      const lineSpacing = logoSize * 0.3;
      const lineLength = logoSize * 0.8;
      const lineWidth = logoSize * 0.15;
      
      for (let i = -1; i <= 1; i++) {
        const yOffset = i * lineSpacing;
        ctx.fillRect(
          -lineLength/2,
          yOffset - lineWidth/2,
          lineLength,
          lineWidth
        );
      }
      
      ctx.restore();
      
      if (token.collectible) {
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = token.color;
        ctx.shadowBlur = 10;
        ctx.fillText(
          `+${token.value}`,
          x,
          y - token.size * 1.5
        );

        ctx.strokeStyle = `${token.color}40`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const drawSnakeEyes = (
      headX: number,
      headY: number,
      direction: Vector2D,
      primaryColor: string,
      isOurPlayer: boolean,
      snakeWidth: number
    ) => {
      const eyeBaseOffset = snakeWidth/2.5;
      const eyeSize = snakeWidth/4;
      
      let eyeAngle: number;
      if (isOurPlayer) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = refs.current.mousePos.x - centerX;
        const dy = refs.current.mousePos.y - centerY;
        eyeAngle = Math.atan2(dy, dx);
      } else {
        eyeAngle = Math.atan2(direction.y, direction.x);
      }
      
      const leftEyeAngle = eyeAngle - 0.5;
      const rightEyeAngle = eyeAngle + 0.5;
      
      const leftEyeX = headX + Math.cos(leftEyeAngle) * eyeBaseOffset;
      const leftEyeY = headY + Math.sin(leftEyeAngle) * eyeBaseOffset;
      const rightEyeX = headX + Math.cos(rightEyeAngle) * eyeBaseOffset;
      const rightEyeY = headY + Math.sin(rightEyeAngle) * eyeBaseOffset;

      ctx.fillStyle = isOurPlayer ? '#00000040' : `${primaryColor}40`;
      ctx.shadowBlur = 0;
      
      [[leftEyeX, leftEyeY], [rightEyeX, rightEyeY]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, eyeSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = isOurPlayer ? 8 : 4;
      
      [[leftEyeX, leftEyeY], [rightEyeX, rightEyeY]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(eyeAngle) * (eyeSize * 0.3),
          y + Math.sin(eyeAngle) * (eyeSize * 0.3),
          eyeSize * 0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(eyeAngle - Math.PI/4) * (eyeSize * 0.3),
          y + Math.sin(eyeAngle - Math.PI/4) * (eyeSize * 0.3),
          eyeSize * 0.25,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    };

    const drawSnake = (player: any, isOurPlayer: boolean, cameraX: number, cameraY: number) => {
      const primaryColor = player.primary_color;
      const secondaryColor = player.secondary_color;
      
      const snakeWidth = Math.min(
        GAME_CONFIG.BASE_SNAKE_WIDTH + (player.score * GAME_CONFIG.WIDTH_GROWTH_FACTOR * 15),
        GAME_CONFIG.MAX_SNAKE_WIDTH
      );
      const shadowWidth = snakeWidth + 6;
      
      ctx.shadowBlur = 0;
      ctx.lineWidth = shadowWidth;
      ctx.strokeStyle = `${primaryColor}40`;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(
        player.segments[0].position.x + cameraX + 2,
        player.segments[0].position.y + cameraY + 2
      );

      for (let i = 1; i < player.segments.length - 1; i++) {
        const xc = (player.segments[i].position.x + player.segments[i + 1].position.x) / 2;
        const yc = (player.segments[i].position.y + player.segments[i + 1].position.y) / 2;
        
        ctx.quadraticCurveTo(
          player.segments[i].position.x + cameraX + 2,
          player.segments[i].position.y + cameraY + 2,
          xc + cameraX + 2,
          yc + cameraY + 2
        );
      }
      ctx.stroke();

      if (player.boosting && player.score > 0) {
        const glowWidth = shadowWidth;
        const glowColor = isOurPlayer ? '#ff0099' : primaryColor;
        
        for (let i = 0; i < 3; i++) {
          ctx.lineWidth = glowWidth - i * 2;
          ctx.strokeStyle = `${glowColor}${Math.floor((0.3 - i * 0.1) * 255).toString(16).padStart(2, '0')}`;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 20;

          ctx.beginPath();
          ctx.moveTo(
            player.segments[0].position.x + cameraX,
            player.segments[0].position.y + cameraY
          );

          for (let j = 1; j < player.segments.length - 1; j++) {
            const xc = (player.segments[j].position.x + player.segments[j + 1].position.x) / 2;
            const yc = (player.segments[j].position.y + player.segments[j + 1].position.y) / 2;
            
            ctx.quadraticCurveTo(
              player.segments[j].position.x + cameraX,
              player.segments[j].position.y + cameraY,
              xc + cameraX,
              yc + cameraY
            );
          }
          ctx.stroke();
        }
      }

      const segmentLength = 4;
      
      for (let i = 0; i < player.segments.length - 1; i += segmentLength) {
        const isSecondaryColor = Math.floor(i / segmentLength) % 2 === 1;
        const currentColor = isSecondaryColor ? secondaryColor : primaryColor;
        const segmentWidth = snakeWidth * (1 - (i / player.segments.length) * 0.4);
        
        ctx.strokeStyle = currentColor;
        ctx.shadowColor = currentColor;
        ctx.shadowBlur = player.boosting ? 15 : 5;
        ctx.lineWidth = segmentWidth;
        
        ctx.beginPath();
        ctx.moveTo(
          player.segments[i].position.x + cameraX,
          player.segments[i].position.y + cameraY
        );

        for (let j = 1; j < segmentLength && (i + j) < player.segments.length - 1; j++) {
          const curr = player.segments[i + j].position;
          const next = player.segments[i + j + 1].position;
          const xc = (curr.x + next.x) / 2;
          const yc = (curr.y + next.y) / 2;
          
          ctx.quadraticCurveTo(
            curr.x + cameraX,
            curr.y + cameraY,
            xc + cameraX,
            yc + cameraY
          );
        }
        ctx.stroke();
      }

      const headX = player.segments[0].position.x + cameraX;
      const headY = player.segments[0].position.y + cameraY;
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = `${primaryColor}40`;
      ctx.beginPath();
      ctx.arc(headX + 2, headY + 2, snakeWidth/2 + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = player.boosting ? 15 : 5;
      ctx.beginPath();
      ctx.arc(headX, headY, snakeWidth/2 + 2, 0, Math.PI * 2);
      ctx.fill();

      drawSnakeEyes(headX, headY, player.direction, primaryColor, isOurPlayer, snakeWidth);

      ctx.font = '16px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      
      const name = player.name;
      const nameWidth = ctx.measureText(name).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(
        headX - nameWidth/2 - 5,
        headY - snakeWidth - 25,
        nameWidth + 10,
        24
      );
      
      ctx.fillStyle = isOurPlayer ? '#ffffff' : '#cccccc';
      ctx.fillText(
        name,
        headX,
        headY - snakeWidth - 8
      );

      if (player.tokens > 0) {
        const tokenText = `${player.tokens} 🪙`;
        const tokenWidth = ctx.measureText(tokenText).width;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(
          headX - tokenWidth/2 - 5,
          headY - snakeWidth - 50,
          tokenWidth + 10,
          24
        );
        
        ctx.fillStyle = '#FFD700';
        ctx.fillText(
          tokenText,
          headX,
          headY - snakeWidth - 33
        );
      }
    };

    const render = (timestamp: number) => {
      updateGame();

      if (!canvas || !ctx || !playerId) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ourPlayer = players.get(playerId);
      if (!ourPlayer || !ourPlayer.segments[0]) return;

      const distanceFromCenter = Math.sqrt(
        ourPlayer.segments[0].position.x * ourPlayer.segments[0].position.x +
        ourPlayer.segments[0].position.y * ourPlayer.segments[0].position.y
      );
      
      const warningDistance = 100;
      const distanceFromEdge = (mapSize / 2) - distanceFromCenter;
      
      if (distanceFromEdge < warningDistance) {
        const opacity = Math.max(0.1, Math.min(0.3, 1 - (distanceFromEdge / warningDistance)));
        ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const cameraX = canvas.width / 2 - ourPlayer.segments[0].position.x;
      const cameraY = canvas.height / 2 - ourPlayer.segments[0].position.y;

      const radius = GAME_CONFIG.MAP_SIZE / 2;
      const bgGradient = ctx.createRadialGradient(
        cameraX, cameraY, 0,
        cameraX, cameraY, radius
      );
      bgGradient.addColorStop(0, '#0a0a2e');
      bgGradient.addColorStop(1, '#050510');
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const currentRadius = mapSize / 2;
      
      const pulseIntensity = Math.sin(timestamp * 0.002) * 0.1 + 0.3;
      const dangerZoneWidth = 100;
      
      const outerGlow = ctx.createRadialGradient(
        cameraX, cameraY, currentRadius - dangerZoneWidth,
        cameraX, cameraY, currentRadius + 20
      );
      outerGlow.addColorStop(0, 'rgba(255, 0, 0, 0)');
      outerGlow.addColorStop(0.5, `rgba(255, 0, 0, ${pulseIntensity * 0.3})`);
      outerGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(cameraX, cameraY, currentRadius + 20, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(cameraX, cameraY, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 + pulseIntensity})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 10]);
      ctx.lineDashOffset = -timestamp * 0.05;
      ctx.stroke();
      ctx.setLineDash([]);
      
      const dangerZone = ctx.createRadialGradient(
        cameraX, cameraY, currentRadius - dangerZoneWidth,
        cameraX, cameraY, currentRadius
      );
      dangerZone.addColorStop(0, 'rgba(255, 0, 0, 0)');
      dangerZone.addColorStop(1, `rgba(255, 0, 0, ${0.2 + pulseIntensity * 0.2})`);
      
      ctx.beginPath();
      ctx.arc(cameraX, cameraY, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = dangerZone;
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      const gridSize = 100;
      const gridOffset = {
        x: Math.floor(cameraX % gridSize),
        y: Math.floor(cameraY % gridSize)
      };

      for (let x = gridOffset.x; x < canvas.width; x += gridSize) {
        for (let y = gridOffset.y; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cameraX, cameraY, radius - i * 2, 0, Math.PI * 2);
        
        const borderGradient = ctx.createLinearGradient(
          cameraX - radius, cameraY,
          cameraX + radius, cameraY
        );
        
        if (i === 0) {
          borderGradient.addColorStop(0, 'rgba(0, 255, 135, 0.3)');
          borderGradient.addColorStop(0.5, 'rgba(0, 255, 234, 0.3)');
          borderGradient.addColorStop(1, 'rgba(0, 255, 135, 0.3)');
        } else if (i === 1) {
          borderGradient.addColorStop(0, 'rgba(255, 0, 255, 0.2)');
          borderGradient.addColorStop(0.5, 'rgba(255, 0, 153, 0.2)');
          borderGradient.addColorStop(1, 'rgba(255, 0, 255, 0.2)');
        } else {
          borderGradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
          borderGradient.addColorStop(0.5, 'rgba(11, 255, 0, 0.1)');
          borderGradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
        }
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      food.forEach((f) => {
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 15;
        
        const pulseSize = f.size + Math.sin(timestamp * VISUAL_CONFIG.FOOD_PULSE_SPEED) * 
                         VISUAL_CONFIG.FOOD_PULSE_RANGE;
        
        const x = f.position.x + cameraX;
        const y = f.position.y + cameraY;
        
        const gradientSize = pulseSize * 1.2;
        const gradient = ctx.createLinearGradient(
          x - gradientSize, y - gradientSize,
          x + gradientSize, y + gradientSize
        );
        gradient.addColorStop(0, '#DC1FFF');
        gradient.addColorStop(0.5, '#00FFA3');
        gradient.addColorStop(1, '#03E1FF');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        const lineSpacing = pulseSize * 0.3;
        const lineLength = pulseSize * 0.8;
        const lineWidth = pulseSize * 0.15;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);

        for (let i = -1; i <= 1; i++) {
          const yOffset = i * lineSpacing;
          ctx.fillRect(-lineLength/2, yOffset - lineWidth/2, lineLength, lineWidth);
        }

        ctx.restore();
        
        ctx.shadowBlur = 0;
      });

      tokens.forEach(token => {
        drawToken(token, cameraX, cameraY, timestamp);
      });

      const sortedPlayers = Array.from(players.values())
        .sort((a, b) => a.score - b.score);

      sortedPlayers.forEach((player) => {
        if (!player || player.segments.length < 2) return;
        const isOurPlayer = player.id === playerId;
        drawSnake(player, isOurPlayer, cameraX, cameraY);
      });

      refs.current.lastFrameTime = timestamp;
      animationFrameId = requestAnimationFrame(render);
    };

    let animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [playerId, players, food, tokens, updateGame]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 touch-none"
        style={{ backgroundColor: '#0a0a1f' }}
      />
      <div className="fixed top-4 left-4 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg p-3 text-white flex items-center gap-2 shadow-lg shadow-blue-500/20">
        {connectionStatus === 'connected' ? (
          <>
            <Wifi className={`w-4 h-4 ${latency > 150 ? 'text-yellow-400' : 'text-green-400'}`} />
            <span className="font-mono">CONNECTED [{latency}ms]</span>
          </>
        ) : connectionStatus === 'connecting' ? (
          <>
            <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="font-mono">CONNECTING...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="font-mono">OFFLINE</span>
            {connectionStatus === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
          </>
        )}
      </div>
      
      {nextCircleShrink && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-lg p-3 text-white flex items-center gap-2 shadow-lg shadow-red-500/20">
          <Timer className="w-4 h-4 text-red-400" />
          <span className="font-mono flex items-center gap-2">
            <span>Circle shrinks in</span>
            <span className="text-red-400 tabular-nums min-w-[3ch] inline-block">
              {Math.max(0, Math.ceil((nextCircleShrink - Date.now()) / 1000))}
            </span>
            <span>s</span>
          </span>
          <span className="font-mono text-red-400 border-l border-red-500/30 pl-2 ml-2">
            [{Math.round(mapSize)}×{Math.round(mapSize)}]
          </span>
        </div>
      )}
      
      <FPSCounter />
    </>
  );
}