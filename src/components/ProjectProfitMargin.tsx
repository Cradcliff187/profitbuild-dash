import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectProfitMarginProps {
  contractAmount: number;
  actualCosts: number;
  projectName: string;
  project?: {
    contracted_amount?: number | null;
    current_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  };
}

export const ProjectProfitMargin = ({ 
  contractAmount, 
  actualCosts, 
  projectName,
  project 
}: ProjectProfitMarginProps) => {
  // Use stored margin data if available, otherwise calculate
  const storedMargin = project?.current_margin;
  const storedMarginPercentage = project?.margin_percentage;
  const storedContractAmount = project?.contracted_amount;
  
  const displayContractAmount = storedContractAmount ?? contractAmount;
  const calculatedProfit = displayContractAmount - actualCosts;
  const calculatedProfitPercentage = displayContractAmount > 0 ? (calculatedProfit / displayContractAmount) * 100 : 0;
  
  // Use stored values if available, otherwise use calculated
  const profit = storedMargin ?? calculatedProfit;
  const profitPercentage = storedMarginPercentage ?? calculatedProfitPercentage;
  const isProfit = profit >= 0;
  
  const isUsingStoredData = storedMargin !== null && storedMargin !== undefined;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Profit Margin
          {isUsingStoredData && (
            <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
              Live Data
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center space-x-1">
          {isProfit ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Profit Display */}
          <div className="text-center">
            <div className={`text-3xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(profit))}
            </div>
            <div className={`text-lg font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {profitPercentage.toFixed(1)}% margin
            </div>
            <Badge 
              className={`mt-2 ${
                isProfit 
                  ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                  : 'bg-red-100 text-red-800 hover:bg-red-100'
              }`}
            >
              {isProfit ? 'Profitable' : 'Loss'}
            </Badge>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contract Amount:</span>
              <span className="font-medium">{formatCurrency(displayContractAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual Costs:</span>
              <span className="font-medium">{formatCurrency(actualCosts)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Net Profit/Loss:</span>
              <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : '-'}{formatCurrency(Math.abs(profit))}
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Cost Efficiency</span>
              <span>{((actualCosts / displayContractAmount) * 100).toFixed(1)}% of contract</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  actualCosts <= displayContractAmount ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min((actualCosts / displayContractAmount) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};