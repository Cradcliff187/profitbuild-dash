import { useNavigate } from "react-router-dom";
import { ProjectFormSimple } from "@/components/ProjectFormSimple";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";

// Standalone route for /projects/new. Replaces the in-page state machine in
// Projects.tsx so the create form has a real URL (F5 survives, link is
// shareable, deep-link from a notification lands here).
const ProjectNew = () => {
  const navigate = useNavigate();
  return (
    <MobilePageWrapper>
      <ProjectFormSimple
        onSave={() => navigate("/projects")}
        onCancel={() => navigate("/projects")}
      />
    </MobilePageWrapper>
  );
};

export default ProjectNew;
