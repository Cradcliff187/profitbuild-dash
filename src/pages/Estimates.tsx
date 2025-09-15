import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Estimates = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estimates</h1>
          <p className="text-muted-foreground">Manage project estimates and calculations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimates Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p>Estimates functionality will be available in the next phase.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Estimates;