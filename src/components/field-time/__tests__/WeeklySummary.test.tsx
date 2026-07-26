/**
 * Interaction contract for the week strip's day selector.
 *
 * Rendered with `react-dom/client` + React 18's `act` rather than
 * @testing-library/react — this repo doesn't carry testing-library, and the
 * component needs no router, query client, or Supabase to mount, so a raw
 * render is the cheaper way to pin the behaviour.
 *
 * What this locks down: the dots are real buttons (not decoration), they
 * report the day they represent, selection is announced via aria-pressed and
 * not by colour alone, and each day carries the state the shared helper says
 * it should.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklySummary } from "../WeeklySummary";
import type { FieldTimeEntry } from "../fieldTimeData";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// Mon 2026-07-20 … Sun 2026-07-26, "today" = Wed 2026-07-22.
const WEEK = [
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
  "2026-07-24",
  "2026-07-25",
  "2026-07-26",
];
const TODAY = "2026-07-22";

/** Minimal row — the strip only reads `expense_date` and `hours`. */
function entry(expense_date: string, hours: number): FieldTimeEntry {
  return {
    id: `e-${expense_date}`,
    payee_id: "payee",
    project_id: "project",
    expense_date,
    amount: hours * 75,
    description: null,
    user_id: "user",
    start_time: null,
    end_time: null,
    attachment_url: null,
    approval_status: "approved",
    is_locked: false,
    rejection_reason: null,
    lunch_taken: false,
    lunch_duration_minutes: null,
    hours,
    gross_hours: hours,
    created_at: null,
    project: { project_number: "225-078", project_name: "Test" },
  };
}

let container: HTMLDivElement;
let root: Root;

function render(ui: React.ReactElement) {
  act(() => {
    root.render(ui);
  });
}

const dayButtons = () =>
  Array.from(
    container.querySelectorAll<HTMLButtonElement>('[aria-label="Days this week"] button')
  );

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("WeeklySummary day selector", () => {
  const baseProps = {
    weekDays: WEEK,
    todayISO: TODAY,
    entries: [entry("2026-07-20", 8)], // Monday logged
    assignmentDates: [],
    loading: false,
    selectedDate: null as string | null,
    onSelectDate: () => {},
  };

  it("renders all seven days as buttons", () => {
    render(<WeeklySummary {...baseProps} />);
    expect(dayButtons()).toHaveLength(7);
  });

  it("passes the day back when tapped", () => {
    const onSelectDate = vi.fn();
    render(<WeeklySummary {...baseProps} onSelectDate={onSelectDate} />);

    act(() => {
      dayButtons()[1].click(); // Tuesday
    });

    expect(onSelectDate).toHaveBeenCalledWith("2026-07-21");
  });

  it("passes the open day back again so the page can close it", () => {
    const onSelectDate = vi.fn();
    render(
      <WeeklySummary
        {...baseProps}
        selectedDate="2026-07-21"
        onSelectDate={onSelectDate}
      />
    );

    act(() => {
      dayButtons()[1].click();
    });

    expect(onSelectDate).toHaveBeenCalledWith("2026-07-21");
  });

  it("announces the open day rather than relying on colour", () => {
    render(<WeeklySummary {...baseProps} selectedDate="2026-07-21" />);
    const pressed = dayButtons().map((b) => b.getAttribute("aria-pressed"));
    expect(pressed).toEqual([
      "false",
      "true",
      "false",
      "false",
      "false",
      "false",
      "false",
    ]);
  });

  it("labels each day with its state", () => {
    render(<WeeklySummary {...baseProps} />);
    const labels = dayButtons().map((b) => b.getAttribute("aria-label"));

    expect(labels[0]).toBe("Monday, Jul 20 — time logged");
    expect(labels[1]).toBe("Tuesday, Jul 21 — no time logged"); // finished, empty
    expect(labels[2]).toBe("Wednesday, Jul 22 — nothing logged"); // today, never flagged
    expect(labels[3]).toBe("Thursday, Jul 23 — nothing logged"); // future
  });

  it("gives only the finished empty weekday the amber mark", () => {
    render(<WeeklySummary {...baseProps} />);
    const dots = dayButtons().map((b) => b.querySelector("span")?.className ?? "");

    expect(dots[0]).toContain("bg-primary"); // logged
    expect(dots[1]).toContain("border-amber-500"); // needs time
    expect(dots[2]).not.toContain("border-amber-500"); // today
    expect(dots[3]).not.toContain("border-amber-500"); // future
  });

  it("keeps every day tappable at 44px", () => {
    render(<WeeklySummary {...baseProps} />);
    for (const button of dayButtons()) {
      expect(button.className).toContain("min-h-[44px]");
    }
  });
});
