import React from 'react';
import { Target, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-sm text-xs" side="bottom" align="start">
                <div className="space-y-2">
                  <div>
                    <strong>What is allocation?</strong>
                    <p className="text-muted-foreground mt-0.5">Matching expenses to specific line items in your estimates, quotes, or change orders.</p>
                  </div>
                  <div>
                    <strong>When to use:</strong>
                    <p className="text-muted-foreground mt-0.5">After expenses are assigned to projects, allocate them here to see which line items are over/under budget.</p>
                  </div>
                  <div>
                    <strong>Note:</strong>
                    <p className="text-muted-foreground mt-0.5">Only expenses assigned to real projects can be allocated.</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
