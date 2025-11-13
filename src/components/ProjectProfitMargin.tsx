import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getMarginThresholdStatus, getThresholdStatusColor, getThresholdStatusLabel, formatContingencyRemaining } from "@/utils/thresholdUtils";
import { ProjectMargin, formatMarginCurrency, getMarginStatusLevel } from "@/types/margin";
import { formatCurrency } from "@/lib/utils";

interface ProjectProfitMarginProps {
  contractAmount: number;
  actualCosts: number;
  projectName: string;
  project?: {
    contracted_amount?: number | null;
    current_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
    contingency_remaining?: number | null;
    minimum_margin_threshold?: number | null;
    target_margin?: number | null;
  };
  marginData?: ProjectMargin;
}

export const ProjectProfitMargin = ({ 
  contractAmount, 
  actualCosts, 
  projectName,
  project,
  marginData
}: ProjectProfitMarginProps) => {
  // Use marginData if provided, otherwise fallback to existing logic
  if (marginData) {
    const isProfit = marginData.current_margin >= 0;
    const thresholdStatus = getMarginStatusLevel(marginData);
    const thresholdColor = getThresholdStatusColor(thresholdStatus);
    const thresholdLabel = getThresholdStatusLabel(thresholdStatus);

    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Profit Margin
            <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
              Margin Data
            </Badge>
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
                {formatMarginCurrency(Math.abs(marginData.current_margin))}
              </div>
              <div className={`text-lg font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {marginData.margin_percentage.toFixed(1)}% margin
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  className={`${
                    isProfit 
                      ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                      : 'bg-red-100 text-red-800 hover:bg-red-100'
                  }`}
                >
                  {isProfit ? 'Profitable' : 'Loss'}
                </Badge>
              <Badge 
                style={{ 
                  backgroundColor: thresholdColor,
                  color: 'white'
                }}
                className="flex items-center gap-1"
              >
                <Target className="h-3 w-3" />
                {thresholdLabel}
              </Badge>
            </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contract Amount:</span>
                <span className="font-medium">{formatMarginCurrency(marginData.contracted_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actual Costs:</span>
                <span className="font-medium">{formatMarginCurrency(marginData.contracted_amount - marginData.current_margin)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contingency Remaining:</span>
                <span className="font-medium">{formatMarginCurrency(marginData.contingency_remaining)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Net Profit/Loss:</span>
                <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  {isProfit ? '+' : '-'}{formatMarginCurrency(Math.abs(marginData.current_margin))}
                </span>
              </div>
            </div>
            
            {/* Threshold Information */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Minimum Threshold:</span>
                  <div className="font-medium">{marginData.minimum_threshold}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Margin:</span>
                  <div className="font-medium">{marginData.target_margin}%</div>
                </div>
              </div>
              {thresholdStatus === 'critical' && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 text-xs font-medium">
                    Margin below minimum threshold
                  </span>
                </div>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cost Efficiency</span>
                <span>{(((marginData.contracted_amount - marginData.current_margin) / marginData.contracted_amount) * 100).toFixed(1)}% of contract</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    marginData.current_margin >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(((marginData.contracted_amount - marginData.current_margin) / marginData.contracted_amount) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback to existing logic when marginData is not provided
  const storedMargin = project?.current_margin;
  const storedMarginPercentage = project?.margin_percentage;
  const storedContractAmount = project?.contracted_amount;
  const contingencyRemaining = project?.contingency_remaining;
  const minimumThreshold = project?.minimum_margin_threshold || 10.0;
  const targetThreshold = project?.target_margin || 20.0;
  
  const displayContractAmount = storedContractAmount ?? contractAmount;
  const calculatedProfit = displayContractAmount - actualCosts;
  const calculatedProfitPercentage = displayContractAmount > 0 ? (calculatedProfit / displayContractAmount) * 100 : 0;
  
  const profit = storedMargin ?? calculatedProfit;
  const profitPercentage = storedMarginPercentage ?? calculatedProfitPercentage;
  const isProfit = profit >= 0;
  
  const isUsingStoredData = storedMargin !== null && storedMargin !== undefined;
  
  const thresholdStatus = getMarginThresholdStatus(profitPercentage, minimumThreshold, targetThreshold);
  const thresholdColor = getThresholdStatusColor(thresholdStatus);
  const thresholdLabel = getThresholdStatusLabel(thresholdStatus);

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
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                className={`${
                  isProfit 
                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                }`}
              >
                {isProfit ? 'Profitable' : 'Loss'}
              </Badge>
              <Badge 
                style={{ 
                  backgroundColor: thresholdColor,
                  color: 'white'
                }}
                className="flex items-center gap-1"
              >
                <Target className="h-3 w-3" />
                {thresholdLabel}
              </Badge>
            </div>
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
            {contingencyRemaining !== null && contingencyRemaining !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contingency Remaining:</span>
                <span className="font-medium">{formatContingencyRemaining(contingencyRemaining)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Net Profit/Loss:</span>
              <span className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : '-'}{formatCurrency(Math.abs(profit))}
              </span>
            </div>
          </div>
          
          {/* Threshold Information */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Minimum Threshold:</span>
                <div className="font-medium">{minimumThreshold}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Target Margin:</span>
                <div className="font-medium">{targetThreshold}%</div>
              </div>
            </div>
            {thresholdStatus === 'critical' && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-red-800 text-xs font-medium">
                  Margin below minimum threshold
                </span>
              </div>
            )}
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