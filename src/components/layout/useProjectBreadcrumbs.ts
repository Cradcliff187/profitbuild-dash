import { useLocation, useParams } from "react-router-dom";
import { getSectionLabel } from "@/components/project-detail/projectNavigation";
import type { Estimate } from "@/types/estimate";
import type { Quote } from "@/types/quote";
import type { ProjectWithFinancials } from "@/types/projectFinancials";
import type { AppBreadcrumbItem } from "@/components/layout/AppBreadcrumbs";

// Builds the breadcrumb trail for any route under /projects/:id/*.
// Resolution order per crumb:
//   1. Always: Projects › <project label>
//   2. If URL has a section (estimates/expenses/control/…): that section.
//   3. For the /estimates/* sub-tree: resolve estimate and quote identities from
//      the in-memory arrays (already loaded by useProjectData) — no extra fetch.
export function useProjectBreadcrumbs(
  project: ProjectWithFinancials | null | undefined,
  estimates: Estimate[] | undefined,
  quotes: Quote[] | undefined
): AppBreadcrumbItem[] {
  const location = useLocation();
  const params = useParams<{ id?: string; estimateId?: string; quoteId?: string }>();

  if (!project || !params.id) return [];

  const projectLabel =
    [project.project_number, project.project_name].filter(Boolean).join(" · ") ||
    "Project";

  const items: AppBreadcrumbItem[] = [
    { label: "Projects", href: "/projects" },
    { label: projectLabel, href: `/projects/${params.id}` },
  ];

  const segments = location.pathname.split("/").filter(Boolean);
  // segments[0] === 'projects', segments[1] === id, segments[2]? === section
  const section = segments[2];

  if (!section) {
    // On /projects/:id (overview) — no further crumb.
    return items;
  }

  const sectionLabel = getSectionLabel(section);
  const sectionHref = `/projects/${params.id}/${section}`;
  items.push({ label: sectionLabel, href: sectionHref });

  // /projects/:id/estimates/...
  if (section === "estimates") {
    const sub = segments[3]; // "new" | :estimateId | "quotes"
    if (sub === "new") {
      items.push({ label: "New Estimate" });
    } else if (sub === "quotes") {
      const quoteId = segments[4]; // "new" | :quoteId
      if (quoteId === "new") {
        items.push({ label: "New Quote" });
      } else if (quoteId) {
        const quote = quotes?.find((q) => q.id === quoteId);
        const quoteLabel = quote
          ? [quote.quoteNumber, quote.quotedBy].filter(Boolean).join(" · ") ||
            "Quote"
          : "Quote";
        const quoteHref = `/projects/${params.id}/estimates/quotes/${quoteId}`;
        items.push({ label: quoteLabel, href: quoteHref });
        const quoteAction = segments[5]; // "edit" | "compare"
        if (quoteAction === "edit") items.push({ label: "Edit" });
        if (quoteAction === "compare") items.push({ label: "Compare" });
      }
    } else if (sub) {
      // :estimateId/edit
      const estimate = estimates?.find((e) => e.id === sub);
      const estimateLabel = estimate
        ? `Estimate v${estimate.version_number ?? ""}`.trim() || "Estimate"
        : "Estimate";
      items.push({ label: estimateLabel });
      if (segments[4] === "edit") items.push({ label: "Edit" });
    }
  }

  return items;
}
