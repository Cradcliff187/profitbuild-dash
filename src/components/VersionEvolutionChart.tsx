import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { TrendingUp } from "lucide-react";

interface VersionEvolutionChartProps {
  data: Array<{
    month: string;
    versionsCreated: number;
    approvalRate: number;
  }>;
}

export const VersionEvolutionChart: React.FC<VersionEvolutionChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-primary">
            Versions Created: {payload[0]?.value || 0}
          </p>
          <p className="text-sm text-secondary">
            Approval Rate: {payload[1]?.value ? `${Math.round(payload[1].value)}%` : '0%'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Version Creation & Approval Trends</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="fill-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                yAxisId="left"
                className="fill-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                className="fill-muted-foreground"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                yAxisId="left"
                dataKey="versionsCreated" 
                fill="hsl(var(--primary))"
                opacity={0.7}
                radius={[2, 2, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="approvalRate" 
                stroke="hsl(var(--secondary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--secondary))" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};