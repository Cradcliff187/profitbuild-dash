import { useState } from "react";
import { Plus, TrendingUp, Building, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import WorkOrdersList from "@/components/WorkOrdersList";
import CreateWorkOrderModal from "@/components/CreateWorkOrderModal";

type ProjectStatus = "Estimating" | "In Progress" | "Complete";

interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  profit: number;
  client: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Residential Kitchen Remodel",
      status: "In Progress",
      profit: 15000,
      client: "Smith Family",
    },
    {
      id: "2", 
      name: "Commercial Office Building",
      status: "Estimating",
      profit: 0,
      client: "ABC Corp",
    },
    {
      id: "3",
      name: "Bathroom Renovation",
      status: "Complete",
      profit: 8500,
      client: "Johnson Residence",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCreateWorkOrderModal, setShowCreateWorkOrderModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    status: "Estimating" as ProjectStatus,
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status !== "Complete").length;
  const totalProfit = projects.reduce((sum, p) => sum + p.profit, 0);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "Estimating":
        return "bg-muted text-muted-foreground";
      case "In Progress":
        return "bg-warning text-warning-foreground";
      case "Complete":
        return "bg-success text-success-foreground";
    }
  };

  const handleAddProject = () => {
    if (!newProject.name || !newProject.client) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const project: Project = {
      id: Date.now().toString(),
      name: newProject.name,
      status: newProject.status,
      profit: 0,
      client: newProject.client,
    };

    setProjects(prev => [...prev, project]);
    setNewProject({ name: "", client: "", status: "Estimating" });
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Project added successfully",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your construction projects</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-construction hover:bg-construction/90 text-construction-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <Input
                  id="client"
                  value={newProject.client}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, status: value as ProjectStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Estimating">Estimating</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddProject} className="w-full">
                Add Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Tabs */}
      <Tabs defaultValue="all-projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all-projects">All Projects</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-projects">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{project.name}</h3>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Client: {project.client}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${project.profit.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Profit</div>
                    </div>
                  </div>
                ))}
                
                {projects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects yet. Add your first project to get started!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="work-orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Work Orders</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quick projects with optional estimates
                </p>
              </div>
              <Button onClick={() => setShowCreateWorkOrderModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Work Order
              </Button>
            </CardHeader>
            <CardContent>
              <WorkOrdersList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateWorkOrderModal 
        open={showCreateWorkOrderModal}
        onOpenChange={setShowCreateWorkOrderModal}
      />
    </div>
  );
};

export default Dashboard;