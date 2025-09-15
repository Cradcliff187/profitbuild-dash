import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ProfitTrend } from '@/types/profit';

interface ProfitChartProps {
  data: ProfitTrend[];
  type: 'line' | 'bar';
  dataKey: 'totalProfit' | 'marginPercentage';
  title: string;
  height?: number;
}

export default function ProfitChart({ data, type, dataKey, title, height = 300 }: ProfitChartProps) {
  const chartConfig = {
    totalProfit: {
      label: 'Total Profit',
      color: 'hsl(var(--primary))',
    },
    marginPercentage: {
      label: 'Margin %',
      color: 'hsl(var(--secondary))',
    },
  };

  const formatValue = (value: number) => {
    if (dataKey === 'totalProfit') {
      return `$${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            Projects: {data.projectCount}
          </p>
          <p className="text-sm font-medium" style={{ color: payload[0].color }}>
            {payload[0].name}: {formatValue(payload[0].value)}
          </p>
          {dataKey === 'totalProfit' && (
            <p className="text-sm text-muted-foreground">
              Revenue: ${data.totalRevenue?.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatValue}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={chartConfig[dataKey].color}
                strokeWidth={2}
                dot={{ fill: chartConfig[dataKey].color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: chartConfig[dataKey].color, strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatValue}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey={dataKey}
                fill={chartConfig[dataKey].color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}