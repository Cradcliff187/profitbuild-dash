import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type {
  PaymentApplication,
  PaymentApplicationLineWithSOV,
} from "@/types/paymentApplication";

export interface ProjectInfo {
  projectId: string;
  projectName: string;
  projectNumber: string | null;
  clientName: string | null;
  contractorName?: string;
  architectName?: string;
  contractDate?: string;
  contractFor?: string;
  retainagePercent?: number;
}

export interface PdfSaveResult {
  publicUrl: string;
  storagePath: string;
  fileName: string;
}

function fmt(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// G702 PDF — Standard AIA Form Layout
// ─────────────────────────────────────────────────────────────────────────────

function buildG702Doc(
  app: PaymentApplication,
  project: ProjectInfo,
  appLines?: PaymentApplicationLineWithSOV[]
): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();   // ~215.9mm
  const ml = 14;   // left margin
  const mr = pw - 14; // right margin
  const cw = mr - ml; // content width ~187.9mm

  // Column positions for two-panel body
  const divX = ml + cw * 0.53; // vertical divider
  const leftValX = divX - 3;   // right-align values in left column
  const rightX = divX + 4;     // right column text start

  let y = 10;

  // ── TITLE BAR ──────────────────────────────────────────────────────────
  doc.setFillColor(0, 0, 0);
  doc.rect(ml, y, cw, 7, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AIA Document G702", ml + 3, y + 5);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Application and Certificate for Payment", pw / 2 + 10, y + 5, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // ── HEADER FIELDS GRID ─────────────────────────────────────────────────
  const headerTop = y;
  const headerH = 32;

  // Draw header box
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(ml, headerTop, cw, headerH);

  // Vertical dividers in header
  const hCol2 = ml + cw * 0.38;
  const hCol3 = ml + cw * 0.72;
  doc.line(hCol2, headerTop, hCol2, headerTop + headerH);
  doc.line(hCol3, headerTop, hCol3, headerTop + headerH);

  // Horizontal dividers
  doc.line(ml, headerTop + 10, hCol3, headerTop + 10);
  doc.line(ml, headerTop + 20, hCol2, headerTop + 20);
  doc.line(hCol3, headerTop + 8, mr, headerTop + 8);
  doc.line(hCol3, headerTop + 14, mr, headerTop + 14);
  doc.line(hCol3, headerTop + 20, mr, headerTop + 20);
  doc.line(hCol3, headerTop + 26, mr, headerTop + 26);

  const labelFs = 6.5;
  const valueFs = 7.5;

  // Left column fields
  const fieldLabel = (label: string, val: string, x: number, fy: number) => {
    doc.setFontSize(labelFs);
    doc.setFont("helvetica", "bold");
    doc.text(label, x, fy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueFs);
    doc.text(val || "", x + 1, fy + 5);
  };

  fieldLabel("TO OWNER:", project.clientName || "", ml + 2, headerTop + 4);
  fieldLabel("FROM CONTRACTOR:", project.contractorName || "Radcliff Construction Group", ml + 2, headerTop + 14);

  // Middle column fields
  fieldLabel("PROJECT:", project.projectName, hCol2 + 2, headerTop + 4);
  fieldLabel("VIA ARCHITECT:", project.architectName || "", hCol2 + 2, headerTop + 14);

  // Right column fields (stacked)
  const rightFieldRow = (label: string, val: string, fy: number) => {
    doc.setFontSize(labelFs);
    doc.setFont("helvetica", "bold");
    doc.text(label, hCol3 + 2, fy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueFs);
    doc.text(val || "", mr - 2, fy, { align: "right" });
  };

  rightFieldRow("APPLICATION NO:", String(app.application_number), headerTop + 5);
  rightFieldRow("PERIOD TO:", new Date(app.period_to).toLocaleDateString(), headerTop + 11.5);
  rightFieldRow("CONTRACT FOR:", project.contractFor || project.projectName, headerTop + 17.5);
  rightFieldRow("CONTRACT DATE:", project.contractDate || "", headerTop + 23.5);
  rightFieldRow("PROJECT NOS:", project.projectNumber || "", headerTop + 29.5);

  y = headerTop + headerH + 2;

  // ── BODY: TWO-COLUMN LAYOUT ────────────────────────────────────────────
  const bodyTop = y;

  // Draw vertical divider for body
  doc.setDrawColor(160);
  doc.setLineWidth(0.2);
  doc.line(divX, bodyTop, divX, bodyTop + 175);

  // ── LEFT COLUMN: CONTRACTOR'S APPLICATION FOR PAYMENT ──────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRACTOR'S APPLICATION FOR PAYMENT", ml, y + 4);
  y += 6;

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  const legalLines = doc.splitTextToSize(
    "Application is made for payment, as shown below, in connection with the Contract. " +
    "AIA Document G703\u00AE, Continuation Sheet, is attached.",
    divX - ml - 4
  );
  doc.text(legalLines, ml, y + 3);
  y += legalLines.length * 2.5 + 4;

  // Retainage breakdown calculation
  const retPct = project.retainagePercent ?? 10;
  let ret5a = 0;
  let ret5b = 0;
  if (appLines && appLines.length > 0) {
    const totalCompletedWork = appLines.reduce(
      (sum, l) => sum + l.previous_work + l.current_work, 0
    );
    const totalStoredMat = appLines.reduce(
      (sum, l) => sum + l.stored_materials, 0
    );
    ret5a = (retPct / 100) * totalCompletedWork;
    ret5b = (retPct / 100) * totalStoredMat;
  } else {
    // Fallback: split total retainage proportionally
    ret5a = app.total_retainage;
    ret5b = 0;
  }

  // Lines 1-9
  doc.setFontSize(7);
  const lineSpacing = 6.5;

  const drawCalcLine = (
    num: string,
    label: string,
    value: string,
    opts?: { bold?: boolean; indent?: boolean; boxed?: boolean; formula?: string }
  ) => {
    const xStart = opts?.indent ? ml + 6 : ml;
    const isBold = opts?.bold;

    if (isBold) {
      doc.setFillColor(240, 240, 240);
      doc.rect(ml, y - 1, divX - ml - 2, lineSpacing, "F");
    }

    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(7);

    // Line number and label
    const prefix = num ? `${num}. ` : "   ";
    doc.text(`${prefix}${label}`, xStart, y + 3);

    // Formula reference (small, gray)
    if (opts?.formula) {
      doc.setFontSize(5);
      doc.setTextColor(120);
      doc.text(opts.formula, xStart + 4, y + 3 + 2.5);
      doc.setTextColor(0);
      doc.setFontSize(7);
    }

    // Value (right-aligned with leader dots)
    doc.text(value, leftValX, y + 3, { align: "right" });

    // Box around current payment due
    if (opts?.boxed) {
      const valWidth = doc.getTextWidth(value);
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(leftValX - valWidth - 2, y - 0.5, valWidth + 4, lineSpacing, "S");
      doc.setLineWidth(0.2);
    }

    y += lineSpacing;
  };

  drawCalcLine("1", "ORIGINAL CONTRACT SUM", fmt(app.original_contract_sum));
  drawCalcLine("2", "Net Change by Change Orders", fmt(app.net_change_orders));
  drawCalcLine("3", "CONTRACT SUM TO DATE", fmt(app.contract_sum_to_date),
    { bold: true, formula: "(Line 1 \u00B1 2)" });
  drawCalcLine("4", "TOTAL COMPLETED & STORED TO DATE", fmt(app.total_completed_to_date),
    { formula: "(Column G on G703)" });

  // Line 5: Retainage with sub-items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("5. RETAINAGE:", ml, y + 3);
  y += lineSpacing * 0.8;

  drawCalcLine("", `a.  ${retPct}% of Completed Work`, fmt(ret5a),
    { indent: true, formula: "(Columns D + E on G703)" });
  drawCalcLine("", `b.  ${retPct}% of Stored Material`, fmt(ret5b),
    { indent: true, formula: "(Column F on G703)" });
  drawCalcLine("", "Total Retainage (Lines 5a + 5b)", fmt(app.total_retainage),
    { indent: true });

  drawCalcLine("6", "TOTAL EARNED LESS RETAINAGE", fmt(app.total_earned_less_retainage),
    { bold: true, formula: "(Line 4 minus Line 5 Total)" });
  drawCalcLine("7", "LESS PREVIOUS CERTIFICATES FOR PAYMENT", fmt(app.total_previous_payments),
    { formula: "(Line 6 from prior Certificate)" });
  drawCalcLine("8", "CURRENT PAYMENT DUE", fmt(app.current_payment_due),
    { bold: true, boxed: true, formula: "(Line 6 minus Line 7)" });
  drawCalcLine("9", "BALANCE TO FINISH, INCLUDING RETAINAGE", fmt(app.balance_to_finish),
    { formula: "(Line 3 minus Line 6)" });

  y += 4;

  // ── CHANGE ORDER SUMMARY TABLE ─────────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  const coTop = y;
  const coW = divX - ml - 4;
  const coH = 26;
  const col1W = coW * 0.55;
  const col2W = coW * 0.225;
  const col3W = coW * 0.225;
  const coRowH = 5;

  // Header
  doc.setFillColor(230, 230, 230);
  doc.rect(ml, coTop, coW, coRowH, "FD");
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("CHANGE ORDER SUMMARY", ml + 2, coTop + 3.5);
  doc.text("ADDITIONS", ml + col1W + col2W / 2, coTop + 3.5, { align: "center" });
  doc.text("DEDUCTIONS", ml + col1W + col2W + col3W / 2, coTop + 3.5, { align: "center" });

  // Column dividers
  doc.line(ml + col1W, coTop, ml + col1W, coTop + coH);
  doc.line(ml + col1W + col2W, coTop, ml + col1W + col2W, coTop + coH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);

  const coRows = [
    "Total changes approved in previous months by Owner",
    "Total approved this month",
  ];

  let coY = coTop + coRowH;
  coRows.forEach((label) => {
    doc.rect(ml, coY, coW, coRowH);
    doc.text(label, ml + 1, coY + 3.5);
    coY += coRowH;
  });

  // TOTAL row
  doc.setFont("helvetica", "bold");
  doc.rect(ml, coY, coW, coRowH);
  doc.text("TOTAL", ml + col1W - 10, coY + 3.5, { align: "right" });
  coY += coRowH;

  // NET CHANGES row
  doc.rect(ml, coY, coW, coRowH);
  doc.text("NET CHANGES by Change Order", ml + 1, coY + 3.5);
  // Show net change value
  doc.setFontSize(6);
  doc.text(fmt(app.net_change_orders), ml + coW - 2, coY + 3.5, { align: "right" });

  // Outer border
  doc.rect(ml, coTop, coW, coH);

  // ── RIGHT COLUMN: CERTIFICATIONS ───────────────────────────────────────
  let ry = bodyTop + 2;

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  const certText = doc.splitTextToSize(
    "The undersigned Contractor certifies that to the best of the Contractor\u2019s knowledge, information " +
    "and belief the Work covered by this Application for Payment has been completed in accordance " +
    "with the Contract Documents, that all amounts have been paid by the Contractor for Work for " +
    "which previous Certificates for Payment were issued and payments received from the Owner, and " +
    "that current payment shown herein is now due.",
    mr - rightX - 2
  );
  doc.text(certText, rightX, ry + 3);
  ry += certText.length * 2.5 + 5;

  // Contractor signature block
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRACTOR:", rightX, ry);
  ry += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("By:", rightX, ry);
  doc.setDrawColor(0);
  doc.line(rightX + 8, ry, rightX + 50, ry);
  doc.text("Date:", rightX + 55, ry);
  doc.line(rightX + 65, ry, mr - 2, ry);
  ry += 6;

  doc.text("State of:", rightX, ry);
  doc.line(rightX + 15, ry, rightX + 50, ry);
  ry += 5;
  doc.text("County of:", rightX, ry);
  doc.line(rightX + 15, ry, rightX + 50, ry);
  ry += 5;

  doc.setFontSize(5.5);
  doc.text("Subscribed and sworn to before", rightX, ry);
  ry += 3;
  doc.text("me this ______ day of ________", rightX, ry);
  ry += 5;

  doc.setFontSize(6.5);
  doc.text("Notary Public:", rightX, ry);
  doc.line(rightX + 20, ry, mr - 2, ry);
  ry += 5;
  doc.text("My commission expires:", rightX, ry);
  doc.line(rightX + 30, ry, mr - 2, ry);
  ry += 8;

  // Architect's Certificate section divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(rightX - 2, ry, mr, ry);
  ry += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ARCHITECT\u2019S CERTIFICATE FOR PAYMENT", rightX, ry);
  ry += 4;

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  const archCertText = doc.splitTextToSize(
    "In accordance with the Contract Documents, based on on-site observations and the data comprising " +
    "this application, the Architect certifies to the Owner that to the best of the Architect\u2019s knowledge, " +
    "information and belief, the Work has progressed as indicated, the quality of the Work is in " +
    "accordance with the Contract Documents, and the Contractor is entitled to payment of the " +
    "AMOUNT CERTIFIED.",
    mr - rightX - 2
  );
  doc.text(archCertText, rightX, ry + 3);
  ry += archCertText.length * 2.5 + 5;

  // Amount Certified
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("AMOUNT CERTIFIED", rightX, ry);
  const certAmt = app.certified_amount != null ? fmt(app.certified_amount) : "$ ___________________";
  doc.text(certAmt, mr - 2, ry, { align: "right" });
  ry += 4;

  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  const diffNote = doc.splitTextToSize(
    "(Attach explanation if amount certified differs from the amount applied. " +
    "Initial all figures on this Application and on the Continuation Sheet that are changed to conform with the amount certified.)",
    mr - rightX - 2
  );
  doc.text(diffNote, rightX, ry + 2);
  ry += diffNote.length * 2 + 4;

  // Architect signature block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ARCHITECT:", rightX, ry);
  ry += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);

  if (app.certified_by) {
    doc.text(`By: ${app.certified_by}`, rightX, ry);
    doc.text(
      `Date: ${app.certified_date ? new Date(app.certified_date).toLocaleDateString() : ""}`,
      rightX + 55, ry
    );
  } else {
    doc.text("By:", rightX, ry);
    doc.line(rightX + 8, ry, rightX + 50, ry);
    doc.text("Date:", rightX + 55, ry);
    doc.line(rightX + 65, ry, mr - 2, ry);
  }
  ry += 6;

  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  const legalDisclaimer = doc.splitTextToSize(
    "This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor " +
    "named herein. Issuance, payment and acceptance of payment are without prejudice to any rights of " +
    "the Owner or Contractor under this Contract.",
    mr - rightX - 2
  );
  doc.text(legalDisclaimer, rightX, ry + 2);

  // ── FOOTER ─────────────────────────────────────────────────────────────
  const footY = doc.internal.pageSize.getHeight() - 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(ml, footY - 3, mr, footY - 3);

  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Generated by RCG Work on ${new Date().toLocaleDateString()}  |  Application #${app.application_number}  |  ${project.projectName}`,
    pw / 2, footY,
    { align: "center" }
  );
  doc.setTextColor(0);

  const fileName = `G702_App${app.application_number}_${project.projectNumber || "project"}.pdf`;
  return { doc, fileName };
}

// ─────────────────────────────────────────────────────────────────────────────
// G703 PDF — Continuation Sheet with Repeating Headers
// ─────────────────────────────────────────────────────────────────────────────

const G703_COLS = [
  { label: "A\nItem No.", width: 14, align: "center" as const },
  { label: "B\nDescription of Work", width: 58, align: "left" as const },
  { label: "C\nScheduled\nValue", width: 28, align: "right" as const },
  { label: "D\nWork Completed\nFrom Previous\nApplication", width: 28, align: "right" as const },
  { label: "E\nWork Completed\nThis Period", width: 26, align: "right" as const },
  { label: "F\nMaterials\nPresently\nStored", width: 24, align: "right" as const },
  { label: "G\nTotal Completed\nand Stored\nto Date (D+E+F)", width: 28, align: "right" as const },
  { label: "G/C\n%", width: 14, align: "right" as const },
  { label: "H\nBalance\nto Finish\n(C \u2212 G)", width: 26, align: "right" as const },
  { label: "I\nRetainage", width: 24, align: "right" as const },
];

function renderG703PageHeader(
  doc: jsPDF,
  app: PaymentApplication,
  project: ProjectInfo,
  pageNum: number,
  startY: number
): number {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = startY;

  // Title bar
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, pw - margin * 2, 6, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AIA Document G703 \u2014 Continuation Sheet", margin + 3, y + 4.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (pageNum > 1) {
    doc.text(`Page ${pageNum}`, pw - margin - 3, y + 4.5, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Subheader info
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Application No: ${app.application_number}  \u2502  Project: ${project.projectNumber || ""} ${project.projectName}  \u2502  Period To: ${new Date(app.period_to).toLocaleDateString()}`,
    pw / 2, y,
    { align: "center" }
  );
  y += 6;

  // Column headers
  const headerH = 16;
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, pw - margin * 2, headerH, "FD");

  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  let x = margin;
  G703_COLS.forEach((col) => {
    const headerLines = col.label.split("\n");
    headerLines.forEach((line, i) => {
      const textX =
        col.align === "right" ? x + col.width - 2 :
        col.align === "center" ? x + col.width / 2 :
        x + 2;
      doc.text(line, textX, y + 4 + i * 3, {
        align: col.align === "left" ? "left" : col.align,
      });
    });
    // Column divider
    if (x > margin) {
      doc.setDrawColor(180);
      doc.setLineWidth(0.15);
      doc.line(x, y, x, y + headerH);
    }
    x += col.width;
  });
  y += headerH + 1;

  return y;
}

function buildG703Doc(
  app: PaymentApplication,
  appLines: PaymentApplicationLineWithSOV[],
  project: ProjectInfo
): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 12;
  let pageNum = 1;

  let y = renderG703PageHeader(doc, app, project, pageNum, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const rowH = 5.5;

  const renderRow = (values: string[], isBold: boolean, fill: boolean) => {
    // Check if page break needed
    if (y + rowH > ph - 14) {
      // Footer on current page
      doc.setFontSize(5);
      doc.setTextColor(128);
      doc.text(
        `Page ${pageNum}`,
        pw / 2, ph - 8,
        { align: "center" }
      );
      doc.setTextColor(0);

      doc.addPage();
      pageNum++;
      y = renderG703PageHeader(doc, app, project, pageNum, margin);
    }

    if (fill) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 0.5, pw - margin * 2, rowH, "F");
    }

    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 6.5 : 6.2);
    let rx = margin;
    values.forEach((val, i) => {
      const col = G703_COLS[i];
      const textX =
        col.align === "right" ? rx + col.width - 2 :
        col.align === "center" ? rx + col.width / 2 :
        rx + 2;
      doc.text(
        col.align === "left" ? val.substring(0, 50) : val,
        textX, y + 3.5,
        { align: col.align === "left" ? "left" : col.align }
      );
      rx += col.width;
    });
    y += rowH;
  };

  // Data rows
  appLines.forEach((line, idx) => {
    renderRow(
      [
        line.sov_line_item.item_number,
        line.sov_line_item.description,
        fmt(line.scheduled_value),
        fmt(line.previous_work),
        fmt(line.current_work),
        fmt(line.stored_materials),
        fmt(line.total_completed),
        `${line.percent_complete.toFixed(1)}%`,
        fmt(line.balance_to_finish),
        fmt(line.retainage),
      ],
      false,
      idx % 2 === 1
    );
  });

  // Grand Total
  const totals = appLines.reduce(
    (acc, l) => ({
      scheduled: acc.scheduled + l.scheduled_value,
      previous: acc.previous + l.previous_work,
      current: acc.current + l.current_work,
      stored: acc.stored + l.stored_materials,
      completed: acc.completed + l.total_completed,
      balance: acc.balance + l.balance_to_finish,
      retainage: acc.retainage + l.retainage,
    }),
    { scheduled: 0, previous: 0, current: 0, stored: 0, completed: 0, balance: 0, retainage: 0 }
  );

  // Divider line above totals
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 1;

  const overallPct = totals.scheduled > 0
    ? ((totals.completed / totals.scheduled) * 100).toFixed(1)
    : "0.0";

  renderRow(
    [
      "",
      "GRAND TOTAL",
      fmt(totals.scheduled),
      fmt(totals.previous),
      fmt(totals.current),
      fmt(totals.stored),
      fmt(totals.completed),
      `${overallPct}%`,
      fmt(totals.balance),
      fmt(totals.retainage),
    ],
    true,
    false
  );

  // Bottom border
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);

  // Footer
  doc.setFontSize(5);
  doc.setTextColor(128);
  doc.text(
    `Generated by RCG Work on ${new Date().toLocaleDateString()}  |  Page ${pageNum}`,
    pw / 2, ph - 8,
    { align: "center" }
  );
  doc.setTextColor(0);

  const fileName = `G703_App${app.application_number}_${project.projectNumber || "project"}.pdf`;
  return { doc, fileName };
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE — save PDF to Supabase Storage + project_documents
// ─────────────────────────────────────────────────────────────────────────────

async function savePdfToStorage(
  pdfBlob: Blob,
  fileName: string,
  projectId: string,
  documentType: string,
  description: string
): Promise<PdfSaveResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${projectId}/aia-billing/${timestamp}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from("project-documents")
    .getPublicUrl(storagePath);

  const { error: dbError } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectId,
      document_type: documentType,
      file_name: fileName,
      file_url: publicUrl,
      file_size: pdfBlob.size,
      mime_type: "application/pdf",
      uploaded_by: user.id,
      description,
    });
  if (dbError) throw new Error(`Failed to save document record: ${dbError.message}`);

  return { publicUrl, storagePath, fileName };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — generate + save + download
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAndSaveG702(
  app: PaymentApplication,
  project: ProjectInfo,
  appLines?: PaymentApplicationLineWithSOV[]
): Promise<PdfSaveResult> {
  const { doc, fileName } = buildG702Doc(app, project, appLines);
  const pdfBlob = doc.output("blob");

  const dateStr = format(new Date(), "MMM d, yyyy");
  const description = `AIA G702 \u2014 Application #${app.application_number} (${dateStr})`;
  const result = await savePdfToStorage(
    pdfBlob,
    fileName,
    project.projectId,
    "aia-g702",
    description
  );

  const newVersion = (app.version || 0) + 1;
  await supabase
    .from("payment_applications")
    .update({
      g702_pdf_storage_path: result.storagePath,
      g702_pdf_url: result.publicUrl,
      version: newVersion,
    })
    .eq("id", app.id);

  doc.save(fileName);
  return result;
}

export async function generateAndSaveG703(
  app: PaymentApplication,
  appLines: PaymentApplicationLineWithSOV[],
  project: ProjectInfo
): Promise<PdfSaveResult> {
  const { doc, fileName } = buildG703Doc(app, appLines, project);
  const pdfBlob = doc.output("blob");

  const dateStr = format(new Date(), "MMM d, yyyy");
  const description = `AIA G703 \u2014 Application #${app.application_number} Continuation Sheet (${dateStr})`;
  const result = await savePdfToStorage(
    pdfBlob,
    fileName,
    project.projectId,
    "aia-g703",
    description
  );

  await supabase
    .from("payment_applications")
    .update({
      g703_pdf_storage_path: result.storagePath,
      g703_pdf_url: result.publicUrl,
    })
    .eq("id", app.id);

  doc.save(fileName);
  return result;
}
