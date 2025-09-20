import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target } from "lucide-react";

interface EstimateAccuracyChartProps {
  data: Array<{
    projectName: string;
    accuracy: number;
    versions: number;
  }>;
}

export const EstimateAccuracyChart: React.FC<EstimateAccuracyChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    name: item.projectName.length > 15 ? item.projectName.substring(0, 15) + '...' : item.projectName,
    accuracy: Math.round(item.accuracy),
    versions: item.versions,
    fullName: item.projectName
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Accuracy: {data.accuracy}%
          </p>
          <p className="text-sm text-muted-foreground">
            Versions: {data.versions}
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
          <Target className="h-5 w-5" />
          <span>Estimate Accuracy by Project</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                className="fill-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]}
                className="fill-muted-foreground"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="accuracy" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};