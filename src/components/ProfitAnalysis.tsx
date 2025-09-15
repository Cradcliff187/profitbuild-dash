import { useMemo } from 'react';
import { Estimate } from '@/types/estimate';
import { Quote } from '@/types/quote';
import { Expense } from '@/types/expense';
import { calculateProfitAnalytics, calculateProjectProfit } from '@/utils/profitCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfitChart from './ProfitChart';
import ProjectProfitTable from './ProjectProfitTable';
import { DollarSign, TrendingUp, Calendar, Target } from 'lucide-react';

interface ProfitAnalysisProps {
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
}

export default function ProfitAnalysis({ estimates, quotes, expenses }: ProfitAnalysisProps) {
  const analytics = useMemo(() => 
    calculateProfitAnalytics(estimates, quotes, expenses), 
    [estimates, quotes, expenses]
  );

  const projectProfits = useMemo(() => 
    estimates.map(estimate => calculateProjectProfit(estimate, quotes, expenses)),
    [estimates, quotes, expenses]
  );

  const summaryCards = [
    {
      title: 'Total Profit',
      value: `$${analytics.totalProfit.toLocaleString()}`,
      description: 'Across all projects',
      icon: DollarSign,
      color: analytics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Average Margin',
      value: `${analytics.averageMargin.toFixed(1)}%`,  
      description: 'Profit margin percentage',
      icon: Target,
      color: analytics.averageMargin >= 20 ? 'text-green-600' : analytics.averageMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
    },
    {
      title: 'Monthly Run Rate',
      value: `$${analytics.quarterlyRunRate.toLocaleString()}`,
      description: 'Average monthly profit',
      icon: Calendar,
      color: 'text-primary'
    },
    {
      title: 'Projected Annual',
      value: `$${analytics.projectedAnnualProfit.toLocaleString()}`,
      description: 'Based on current trends',
      icon: TrendingUp,
      color: 'text-primary'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profit Analysis</h1>
        <p className="text-muted-foreground">
          Track project profitability and financial performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Profit Trends</TabsTrigger>
          <TabsTrigger value="margins">Margin Analysis</TabsTrigger>
          <TabsTrigger value="projects">Project Details</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <ProfitChart
                  data={analytics.monthlyTrends}
                  type="line"
                  dataKey="totalProfit"
                  title="Profit Over Time"
                  height={300}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <ProfitChart
                  data={analytics.monthlyTrends}
                  type="bar"
                  dataKey="totalProfit"
                  title="Monthly Profit Distribution"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="margins" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <ProfitChart
                  data={analytics.monthlyTrends}
                  type="line"
                  dataKey="marginPercentage"
                  title="Profit Margin Trends"
                  height={300}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <ProfitChart
                  data={analytics.monthlyTrends}
                  type="bar"
                  dataKey="marginPercentage"
                  title="Monthly Margin Performance"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <ProjectProfitTable data={projectProfits} />
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      {analytics.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analytics.projectCount}
                </div>
                <div className="text-sm text-muted-foreground">Total Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  ${analytics.totalRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {analytics.monthlyTrends.length}
                </div>
                <div className="text-sm text-muted-foreground">Months of Data</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}