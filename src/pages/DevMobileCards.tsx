import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import {
  MobileListCard,
  type MobileListCardMetric,
  type MobileListCardAction,
} from "@/components/ui/mobile-list-card";

// ---------------------------------------------------------------------------
// Sample data (matches task spec)
// ---------------------------------------------------------------------------

const sampleProject = {
  title: "Smith Kitchen Renovation",
  subtitle: "PRJ-2024-0847 • Smith, John",
  badge: { label: "IN PROGRESS", className: "bg-blue-100 text-blue-700" },
  metrics: [
    { label: "Contract", value: "$45,200" },
    { label: "Margin", value: "$8,400 (18.6%)" },
  ] as MobileListCardMetric[],
};

const sampleWorkOrder = {
  title: "Johnson HVAC Repair",
  subtitle: "WO-2024-0123 • Johnson, Mike",
  badge: { label: "ESTIMATING", className: "bg-amber-100 text-amber-700" },
  metrics: [
    { label: "DNE", value: "$2,500" },
    { label: "Spent", value: "$0" },
  ] as MobileListCardMetric[],
  attention: { message: "Needs estimate", variant: "warning" as const },
};

// ---------------------------------------------------------------------------
// Demo page
// ---------------------------------------------------------------------------

export default function DevMobileCards() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleTap = () => {
    console.log("Card tapped");
  };

  const viewAction: MobileListCardAction = {
    icon: Eye,
    label: "View",
    onClick: (e) => {
      e.stopPropagation();
      console.log("View");
    },
  };
  const editAction: MobileListCardAction = {
    icon: Pencil,
    label: "Edit",
    onClick: (e) => {
      e.stopPropagation();
      console.log("Edit");
    },
  };
  const deleteAction: MobileListCardAction = {
    icon: Trash2,
    label: "Delete",
    variant: "destructive",
    onClick: (e) => {
      e.stopPropagation();
      console.log("Delete");
    },
  };

  return (
    <MobilePageWrapper>
      <div className="max-w-md mx-auto space-y-8 pb-8">
        <div>
          <h1 className="text-lg font-semibold mb-1">MobileListCard Demo</h1>
          <p className="text-sm text-muted-foreground">
            Visual test harness for all card configurations before migrating real components.
          </p>
        </div>

        {/* 1. Basic Card */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            1. Basic Card — title, subtitle, badge, 2 metrics, onTap
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title={sampleProject.title}
              subtitle={sampleProject.subtitle}
              badge={sampleProject.badge}
              metrics={sampleProject.metrics}
              onTap={handleTap}
            />
          </div>
        </section>

        {/* 2. With Attention Indicator */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            2. With Attention Indicator — warning and error
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title={sampleWorkOrder.title}
              subtitle={sampleWorkOrder.subtitle}
              badge={sampleWorkOrder.badge}
              metrics={sampleWorkOrder.metrics}
              attention={sampleWorkOrder.attention}
            />
            <MobileListCard
              title="Overdue Project"
              subtitle="PRJ-2024-0001"
              badge={{ label: "OVERDUE", className: "bg-destructive/10 text-destructive" }}
              metrics={[{ label: "Due", value: "Jan 15" }]}
              attention={{ message: "Past due date", variant: "error" }}
            />
            <MobileListCard
              title="Info Example"
              subtitle="PRJ-2024-0999"
              badge={{ label: "DRAFT", className: "bg-muted text-muted-foreground" }}
              metrics={[]}
              attention={{ message: "Draft — not yet submitted", variant: "info" }}
            />
          </div>
        </section>

        {/* 3. With 3-Column Metrics */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            3. With 3-Column Metrics — metricsColumns=3
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title="Three-Column Metrics"
              subtitle="PRJ-2024-0847"
              badge={{ label: "ACTIVE", className: "bg-green-100 text-green-700" }}
              metrics={[
                { label: "Contract", value: "$45,200" },
                { label: "Costs", value: "$36,800" },
                { label: "Margin", value: "18.6%" },
              ]}
              metricsColumns={3}
            />
          </div>
        </section>

        {/* 4. Expandable Card */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            4. Expandable Card — expandable, expandedContent, expandTriggerLabel
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title={sampleProject.title}
              subtitle={sampleProject.subtitle}
              badge={sampleProject.badge}
              metrics={sampleProject.metrics}
              expandable
              expandTriggerLabel="View project details"
              expandedContent={
                <div className="p-2 space-y-2 text-sm">
                  <p><strong>Address:</strong> 123 Main St</p>
                  <p><strong>Superintendent:</strong> Jane Doe</p>
                  <p><strong>Start:</strong> Jan 15, 2024</p>
                </div>
              }
            />
          </div>
        </section>

        {/* 5. Selectable Card */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            5. Selectable Card — selectable, selected, onSelectChange
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title={sampleProject.title}
              subtitle={sampleProject.subtitle}
              badge={sampleProject.badge}
              metrics={sampleProject.metrics}
              selectable
              selected={selectedId === "select-1"}
              onSelectChange={(checked) => setSelectedId(checked ? "select-1" : null)}
            />
            <MobileListCard
              title={sampleWorkOrder.title}
              subtitle={sampleWorkOrder.subtitle}
              badge={sampleWorkOrder.badge}
              metrics={sampleWorkOrder.metrics}
              selectable
              selected={selectedId === "select-2"}
              onSelectChange={(checked) => setSelectedId(checked ? "select-2" : null)}
            />
          </div>
        </section>

        {/* 6. With Actions Menu */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            6. With Actions Menu — View, Edit, Delete
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title={sampleProject.title}
              subtitle={sampleProject.subtitle}
              badge={sampleProject.badge}
              metrics={sampleProject.metrics}
              actions={[viewAction, editAction, deleteAction]}
            />
          </div>
        </section>

        {/* 7. Full Featured */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            7. Full Featured — all props combined
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title={sampleProject.title}
              subtitle={sampleProject.subtitle}
              badge={sampleProject.badge}
              secondaryBadge={{ label: "WORK ORDER", className: "" }}
              metrics={[
                { label: "Contract", value: "$45,200", subtext: " (estimate)" },
                { label: "Margin", value: "$8,400" },
              ]}
              metricsColumns={2}
              attention={{ message: "Change order pending approval", variant: "warning" }}
              onTap={handleTap}
              actions={[viewAction, editAction, deleteAction]}
              expandable
              expandTriggerLabel="View details"
              expandedContent={
                <div className="p-2 text-sm text-muted-foreground">
                  Full featured expanded content area.
                </div>
              }
              selectable
              selected={selectedId === "full"}
              onSelectChange={(checked) => setSelectedId(checked ? "full" : null)}
            />
          </div>
        </section>

        {/* 8. Edge Cases */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            8. Edge Cases — long title, no subtitle, no metrics, empty badge
          </h2>
          <div className="space-y-2">
            <MobileListCard
              title="Very long project name that should truncate with ellipsis when it exceeds the available width in the card layout"
              subtitle="PRJ-2024-0847 • Smith, John"
              badge={{ label: "IN PROGRESS", className: "bg-blue-100 text-blue-700" }}
              metrics={sampleProject.metrics}
            />
            <MobileListCard
              title="No subtitle card"
              badge={{ label: "DRAFT", className: "bg-muted text-muted-foreground" }}
              metrics={[{ label: "Amount", value: "$12,000" }]}
            />
            <MobileListCard
              title="No metrics card"
              subtitle="PRJ-2024-0999"
              badge={{ label: "NEW", className: "bg-primary/10 text-primary" }}
            />
            <MobileListCard
              title="Minimal card (no badge label)"
              badge={{ label: "", className: "bg-muted" }}
            />
          </div>
        </section>
      </div>
    </MobilePageWrapper>
  );
}
