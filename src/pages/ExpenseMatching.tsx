import React from 'react';
import { Target, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { GlobalExpenseAllocation } from "@/components/GlobalExpenseMatching";
import { useNavigate } from "react-router-dom";

const ExpenseMatching = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-hidden space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Target className="h-5 w-5 text-primary" />
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">Match Expenses to Line Items</h1>
              <p className="text-muted-foreground text-sm">Allocate expenses to specific estimate, quote, or change order line items</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm" side="bottom">
                  <div className="space-y-1 text-xs">
                    <p><strong>What is allocation?</strong> Matching expenses to specific line items in your estimates, quotes, or change orders.</p>
                    <p><strong>When to use:</strong> After expenses are assigned to projects, allocate them here to see which line items are over/under budget.</p>
                    <p className="text-muted-foreground"><strong>Note:</strong> Only expenses assigned to real projects can be allocated.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/expenses')} 
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>Back to Expenses</span>
        </Button>
      </div>


      <GlobalExpenseAllocation onClose={() => navigate('/expenses')} />
    </div>
  );
};

export default ExpenseMatching;
