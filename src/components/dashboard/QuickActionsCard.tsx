import { Plus, Clock, Camera, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export function QuickActionsCard() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <Button
          onClick={() => navigate('/projects')}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
        
        <Button
          onClick={() => navigate('/time-tracker')}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <Clock className="h-4 w-4" />
          Time Entry
        </Button>
        
        <Button
          onClick={() => navigate('/time-tracker')}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <Camera className="h-4 w-4" />
          Upload Receipt
        </Button>
        
        <Button
          onClick={() => navigate('/expenses')}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Add Expense
        </Button>
      </CardContent>
    </Card>
  );
}
