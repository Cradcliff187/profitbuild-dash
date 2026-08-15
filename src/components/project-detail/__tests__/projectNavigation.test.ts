import { describe, expect, it } from "vitest";
import {
  getNavigationGroups,
  getSectionLabel,
} from "../projectNavigation";

// Pins the "one project home on mobile" contract (Aug 2026): the Job hub is
// the mobile home, so the mobile section sheet must NOT offer Overview (it
// would navigate straight into ProjectOverviewRoute's redirect), while
// desktop keeps Overview unchanged. Also pins the pre-existing Rule 37
// naming split (schedule = "Job" on mobile, "Schedule" on desktop) and the
// field-worker fieldWorkerSafe filter this file has carried since Rule 18.

const allTitles = (groups: ReturnType<typeof getNavigationGroups>) =>
  groups.flatMap((g) => g.items.map((i) => i.title));

describe("getNavigationGroups", () => {
  it("keeps Overview on desktop", () => {
    const titles = allTitles(getNavigationGroups({ isMobile: false }));
    expect(titles).toContain("Overview");
  });

  it("drops Overview on mobile — the Job hub is the home", () => {
    const titles = allTitles(getNavigationGroups({ isMobile: true }));
    expect(titles).not.toContain("Overview");
  });

  it("labels the schedule section 'Job' on mobile and 'Schedule' on desktop", () => {
    expect(allTitles(getNavigationGroups({ isMobile: true }))).toContain("Job");
    expect(allTitles(getNavigationGroups({ isMobile: false }))).toContain(
      "Schedule",
    );
  });

  it("never emits an empty group", () => {
    for (const opts of [
      {},
      { isMobile: true },
      { isMobile: false },
      { isFieldWorker: true, isMobile: true },
    ]) {
      for (const group of getNavigationGroups(opts)) {
        expect(group.items.length).toBeGreaterThan(0);
      }
    }
  });

  it("still filters to fieldWorkerSafe items for pure field workers", () => {
    const titles = allTitles(
      getNavigationGroups({ isFieldWorker: true, isMobile: true }),
    );
    // Schedule ("Job" on mobile) is the only fieldWorkerSafe section today.
    expect(titles).toEqual(["Job"]);
  });
});

describe("getSectionLabel", () => {
  it("keeps the pill and the nav sheet in lockstep for schedule", () => {
    expect(getSectionLabel("schedule", true)).toBe("Job");
    expect(getSectionLabel("schedule", false)).toBe("Schedule");
  });
});
