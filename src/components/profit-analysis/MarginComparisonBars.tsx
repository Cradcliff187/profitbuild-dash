import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Cell,
  LabelList
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Props {
  originalMargin: number;
  projectedMargin: number;
  currentMargin: number;
  contractedAmount: number;
}

export function MarginComparisonBars({ 
  originalMargin, 
  projectedMargin, 
  currentMargin,
  contractedAmount 
}: Props) {
  // Ensure all values are numbers, defaulting to 0
  const original = originalMargin || 0;
  const projected = projectedMargin || 0;
  const current = currentMargin || 0;
  const contracted = contractedAmount || 0;
  
  const originalPercent = contracted > 0 ? (original / contracted) * 100 : 0;
  const projectedPercent = contracted > 0 ? (projected / contracted) * 100 : 0;
  const currentPercent = contracted > 0 ? (current / contracted) * 100 : 0;
  
  const marginChange = current - original;
  const estimatedToProjectedChange = projected - original;
  const projectedToActualChange = current - projected;
  
  const estimatedToProjectedPercent = original > 0 
    ? ((estimatedToProjectedChange / original) * 100) 
    : 0;
  const projectedToActualPercent = projected > 0 
    ? ((projectedToActualChange / projected) * 100) 
    : 0;

  const data = [
    { name: 'Estimated', value: original, fill: '#94a3b8' },  // slate-400
    { name: 'Projected', value: projected, fill: '#f97316' },  // orange-500
    { name: 'Actual', value: current, fill: '#22c55e' },       // green-500
  ];

  return (
    <div className="space-y-4">
      {/* Flow Arrow Display */}
      <div className="flex items-center justify-between text-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase">Estimated</p>
          <p className="text-lg font-bold whitespace-nowrap">{formatCurrency(original)}</p>
          <p className="text-xs text-muted-foreground">({originalPercent.toFixed(1)}%)</p>
        </div>
        
        <div className="px-2 flex-shrink-0">
          <div className={`text-xs font-medium whitespace-nowrap ${estimatedToProjectedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {estimatedToProjectedChange >= 0 ? '+' : ''}{estimatedToProjectedPercent.toFixed(0)}%
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase">Projected</p>
          <p className="text-lg font-bold whitespace-nowrap">{formatCurrency(projected)}</p>
          <p className="text-xs text-muted-foreground">({projectedPercent.toFixed(1)}%)</p>
        </div>
        
        <div className="px-2 flex-shrink-0">
          <div className={`text-xs font-medium whitespace-nowrap ${projectedToActualChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {projectedToActualChange >= 0 ? '+' : ''}{projectedToActualPercent.toFixed(0)}%
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase">Actual</p>
          <p className="text-lg font-bold whitespace-nowrap">{formatCurrency(current)}</p>
          <p className="text-xs text-muted-foreground">({currentPercent.toFixed(1)}%)</p>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div className="h-[120px] pr-24">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical" margin={{ right: 100, left: 0, top: 5, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                formatter={(value: number) => formatCurrency(value, { showCents: false })}
                style={{ fontSize: 12, fontWeight: 500 }}
                offset={15}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Margin Change Summary */}
      <div className="pt-2 border-t">
        <div className="flex justify-between text-sm">
          <span>Margin Change from Estimate</span>
          <span className={`font-semibold ${marginChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {marginChange >= 0 ? '+' : ''}{formatCurrency(marginChange)}
          </span>
        </div>
      </div>
    </div>
  );
}

