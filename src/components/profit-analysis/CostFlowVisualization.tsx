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
import { Progress } from '@/components/ui/progress';

interface Props {
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  budgetUtilization: number;
}

export function CostFlowVisualization({ 
  estimatedCost, 
  quotedCost, 
  actualCost,
  budgetUtilization 
}: Props) {
  // Ensure all values are numbers, defaulting to 0
  const est = estimatedCost || 0;
  const quoted = quotedCost || 0;
  const actual = actualCost || 0;
  const budget = budgetUtilization || 0;
  
  const estimateToQuoteChange = quoted - est;
  const estimateToQuotePercent = est > 0 
    ? ((estimateToQuoteChange / est) * 100) 
    : 0;
  
  const quoteToActualChange = actual - quoted;
  const quoteToActualPercent = quoted > 0 
    ? ((quoteToActualChange / quoted) * 100) 
    : 0;

  const data = [
    { name: 'Estimate', value: est, fill: '#94a3b8' },  // slate-400
    { name: 'Quotes', value: quoted, fill: '#f97316' },       // orange-500
    { name: 'Actual', value: actual, fill: '#22c55e' },       // green-500
  ];

  return (
    <div className="space-y-4">
      {/* Flow Arrow Display */}
      <div className="flex items-center justify-between text-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase">Estimate</p>
          <p className="text-lg font-bold whitespace-nowrap">{formatCurrency(est)}</p>
        </div>
        
        <div className="px-2 flex-shrink-0">
          <div className={`text-xs font-medium whitespace-nowrap ${estimateToQuoteChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {estimateToQuoteChange >= 0 ? '+' : ''}{estimateToQuotePercent.toFixed(0)}%
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase">Quotes</p>
          <p className="text-lg font-bold whitespace-nowrap">{formatCurrency(quoted)}</p>
        </div>
        
        <div className="px-2 flex-shrink-0">
          <div className={`text-xs font-medium whitespace-nowrap ${quoteToActualChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {quoteToActualChange >= 0 ? '+' : ''}{quoteToActualPercent.toFixed(0)}%
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase">Actual</p>
          <p className="text-lg font-bold whitespace-nowrap">{formatCurrency(actual)}</p>
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
      
      {/* Budget Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Budget Used</span>
          <span>{budget.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(budget, 100)} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {formatCurrency(actual)} of {formatCurrency(quoted)} budget
        </p>
      </div>
    </div>
  );
}

