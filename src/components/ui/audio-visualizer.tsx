import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  level: number; // 0-100
  className?: string;
  barCount?: number;
  compact?: boolean;
}

export function AudioVisualizer({ 
  level, 
  className, 
  barCount = 5,
  compact = false 
}: AudioVisualizerProps) {
  // Generate heights for each bar based on audio level
  // Create a wave pattern with the middle bar being tallest
  const bars = Array.from({ length: barCount }, (_, i) => {
    const centerIndex = Math.floor(barCount / 2);
    const distanceFromCenter = Math.abs(i - centerIndex);
    const baseMultiplier = 1 - (distanceFromCenter * 0.2);
    const randomVariation = Math.random() * 0.2 + 0.9; // 0.9-1.1 range
    const height = Math.max(10, (level * baseMultiplier * randomVariation));
    return Math.min(100, height);
  });

  const maxHeight = compact ? 24 : 40;
  const barWidth = compact ? 3 : 4;
  const gap = compact ? 1.5 : 2;

  return (
    <div 
      className={cn(
        "flex items-end justify-center gap-0.5",
        className
      )}
      style={{ gap: `${gap}px` }}
    >
      {bars.map((height, i) => (
        <div
          key={i}
          className="bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 rounded-t transition-all duration-150 ease-out"
          style={{
            width: `${barWidth}px`,
            height: `${(height / 100) * maxHeight}px`,
            minHeight: '4px'
          }}
        />
      ))}
    </div>
  );
}
