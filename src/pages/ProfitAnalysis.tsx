import { useEffect, useState } from 'react';
import { Estimate } from '@/types/estimate';
import { Quote } from '@/types/quote';
import { Expense } from '@/types/expense';
import ProfitAnalysis from '@/components/ProfitAnalysis';

export default function ProfitAnalysisPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    // Load data from localStorage
    const loadedEstimates = localStorage.getItem('estimates');
    const loadedQuotes = localStorage.getItem('quotes');
    const loadedExpenses = localStorage.getItem('expenses');

    if (loadedEstimates) {
      const parsedEstimates = JSON.parse(loadedEstimates).map((estimate: any) => ({
        ...estimate,
        date: new Date(estimate.date),
        createdAt: new Date(estimate.createdAt),
      }));
      setEstimates(parsedEstimates);
    }

    if (loadedQuotes) {
      const parsedQuotes = JSON.parse(loadedQuotes).map((quote: any) => ({
        ...quote,
        dateReceived: new Date(quote.dateReceived),
        createdAt: new Date(quote.createdAt),
      }));
      setQuotes(parsedQuotes);
    }

    if (loadedExpenses) {
      const parsedExpenses = JSON.parse(loadedExpenses).map((expense: any) => ({
        ...expense,
        date: new Date(expense.date),
        createdAt: new Date(expense.createdAt),
      }));
      setExpenses(parsedExpenses);
    }
  }, []);

  return (
    <div className="container mx-auto p-6">
      <ProfitAnalysis 
        estimates={estimates}
        quotes={quotes}
        expenses={expenses}
      />
    </div>
  );
}