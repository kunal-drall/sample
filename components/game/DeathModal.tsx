'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';

export function DeathModal() {
  const { socket } = useGameStore();
  const router = useRouter();
  
  useEffect(() => {
    const handleDeath = () => {
      if (socket) {
        socket.close();
      }
      
      try {
        localStorage.removeItem('lastServer');
      } catch (error) {
        console.warn('[DeathModal] Failed to clear localStorage:', error);
      }
      
      router.replace('/');
    };

    return () => {
      handleDeath();
    };
  }, [socket, router]);

  return null;
}