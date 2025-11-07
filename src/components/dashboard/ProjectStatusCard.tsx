import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectStatusCount {
  status: string;
  count: number;
  label: string;
}

interface ProjectStatusCardProps {
  statusCounts: ProjectStatusCount[];
}

export function ProjectStatusCard({ statusCounts }: ProjectStatusCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        {statusCounts.map((item) => (
          <button
            key={item.status}
            onClick={() => navigate(`/projects?status=${item.status}`)}
            className="flex items-center justify-between w-full p-2 rounded hover:bg-muted text-left transition-colors h-8"
          >
            <span className="text-sm">{item.label}</span>
            <span className="text-sm font-semibold">{item.count}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
