const FOOD_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEEAD',
  '#D4A5A5',
  '#9B59B6',
  '#3498DB'
];

export function generateFood(count: number, mapSize: number) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * mapSize - mapSize/2,
    y: Math.random() * mapSize - mapSize/2,
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)]
  }));
}