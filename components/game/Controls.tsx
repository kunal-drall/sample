'use client';

import { useEffect, useRef } from 'react';
import { isMobile } from 'react-device-detect';
import { useGameStore } from '@/lib/store';
import { TOUCH_CONFIG } from '@/lib/constants';

interface Props {
  onDirectionChange: (direction: { x: number; y: number }) => void;
}

interface TouchControls {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

export default function Controls({ onDirectionChange }: Props) {
  const { setBoosting, playerId } = useGameStore();
  const touchControls = useRef<TouchControls>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    active: false
  });
  const joystickRef = useRef<HTMLDivElement>(null);
  const refs = useRef({
    lastUpdate: 0,
    mousePos: { x: 0, y: 0 }
  });

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (!playerId || now - refs.current.lastUpdate < 16) return; // Cap at ~60fps
      refs.current.lastUpdate = now;

      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas.parentElement) return;

      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;

      // Send normalized direction vector
      onDirectionChange({
        x: dx / length,
        y: dy / length
      });
      refs.current.mousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => { 
      if (e.button === 0 || e.button === 2) { // Both left and right click for boost
        e.preventDefault();
        setBoosting(true);
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => { 
      if (e.button === 0 || e.button === 2) { // Both left and right click for boost
        e.preventDefault();
        setBoosting(false);
        window.removeEventListener('mouseup', handleMouseUp);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onDirectionChange, setBoosting, playerId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setBoosting(true);
    
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    touchControls.current = {
      startX: centerX,
      startY: centerY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      active: true
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchControls.current.active) return;
    
    const now = performance.now();
    if (now - refs.current.lastUpdate < TOUCH_CONFIG.UPDATE_INTERVAL) return;
    refs.current.lastUpdate = now;

    const touch = e.touches[0]; 
    touchControls.current.currentX = touch.clientX;
    touchControls.current.currentY = touch.clientY;

    const dx = touch.clientX - touchControls.current.startX;
    const dy = touch.clientY - touchControls.current.startY;

    // Add minimum movement threshold for touch controls
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < TOUCH_CONFIG.DEADZONE || distance < 1) return;

    onDirectionChange({
      x: dx / distance,
      y: dy / distance
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setBoosting(false);
    touchControls.current.active = false;
  };

  if (isMobile) {
    const maxOffset = TOUCH_CONFIG.MAX_JOYSTICK_OFFSET;
    const dx = touchControls.current.active ? touchControls.current.currentX - touchControls.current.startX : 0;
    const dy = touchControls.current.active ? touchControls.current.currentY - touchControls.current.startY : 0;
    const distance = Math.sqrt(dx * dx + dy * dy); 
    const scale = distance > maxOffset ? maxOffset / distance : 1;
    
    const joystickStyle = {
      transform: touchControls.current.active
        ? `translate(${dx * scale}px, ${dy * scale}px) scale(${touchControls.current.active ? 0.9 : 1})`
        : 'translate(0, 0)'
    };

    return (
      <>
        <div
          ref={joystickRef}
          className="fixed bottom-10 left-10 w-40 h-40 rounded-full bg-black/20 backdrop-blur-md border border-white/20 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
          <div
            className="w-20 h-20 rounded-full bg-white/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out shadow-lg shadow-black/25 border border-white/20"
            style={joystickStyle}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          {touchControls.current.active && (
            <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse" />
          )}
        </div>
        <div className="fixed bottom-10 right-10 text-white/60 font-medium text-sm">
          {touchControls.current.active ? 'BOOSTING' : 'TOUCH TO BOOST'}
        </div>
      </>
    );
  }

  return null;
}