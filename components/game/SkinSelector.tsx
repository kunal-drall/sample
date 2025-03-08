'use client';

import { SNAKE_SKINS } from '@/lib/constants';
import { SnakeSkin } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SkinSelectorProps {
  selectedSkin: SnakeSkin;
  onSelectSkin: (skin: SnakeSkin) => void;
}

export function SkinSelector({ selectedSkin, onSelectSkin }: SkinSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-blue-200/80">
        Snake Skin
      </label>
    <div className="grid grid-cols-3 gap-4 w-full">
      {SNAKE_SKINS.map((skin) => (
        <button
          key={skin.id}
          onClick={() => onSelectSkin(skin)}
          className={cn(
            "relative group h-24 rounded-xl border-2 transition-all duration-300 hover:scale-105",
            selectedSkin.id === skin.id
              ? "border-white shadow-lg shadow-white/20"
              : "border-white/20 hover:border-white/40"
          )}
        >
          {/* Preview snake pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-4 flex">
              <div 
                className="w-1/2 h-full rounded-l-full" 
                style={{ backgroundColor: skin.primaryColor }}
              />
              <div 
                className="w-1/2 h-full rounded-r-full" 
                style={{ backgroundColor: skin.secondaryColor }}
              />
            </div>
          </div>
          
          {/* Skin name */}
          <div className="absolute bottom-0 inset-x-0 p-2 bg-black/50 rounded-b-lg">
            <p className="text-center text-sm font-medium text-white">
              {skin.name}
            </p>
          </div>
          
          {/* Selection indicator */}
          {selectedSkin.id === skin.id && (
            <div className="absolute -inset-px rounded-xl bg-white/10 pointer-events-none" />
          )}
        </button>
      ))}
    </div>
    </div>
  );
}