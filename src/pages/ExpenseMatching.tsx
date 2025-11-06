import React from 'react';
import { Target, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalExpenseAllocation } from "@/components/GlobalExpenseMatching";
import { useNavigate } from "react-router-dom";

const ExpenseMatching = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-hidden space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Target className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Match Expenses</h1>
            <p className="text-muted-foreground">Allocate expenses to estimates, quotes, and change orders</p>
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
