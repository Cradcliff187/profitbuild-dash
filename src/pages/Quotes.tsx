import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Quotes = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <p className="text-muted-foreground">Create and manage project quotes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotes Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p>Quotes functionality will be available in the next phase.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotes;