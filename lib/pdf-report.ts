import { formatGeneratedAt, formatDisplayDate } from "./dates";
import { formatMoney, formatPercentFromBps } from "./money";
import type { Summary } from "./metrics";
import type { Ledger, StoredInsight } from "./types";
import { PAYMENT_LABELS } from "./types";

const DISCLAIMER =
  "This report is generated from records entered by the business. It is not independently verified, an official bank statement, a credit score, or a loan approval.";

export function makeReportId(now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  const salt = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TP-${day}-${salt}`;
}

function money(minor: number, ledger: Ledger): string {
  return formatMoney(minor, ledger.profile.currency);
}

export async function downloadLoanReport(ledger: Ledger, summary: Summary, insight: StoredInsight | null, insightFresh: boolean): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const placed = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  const afterTable = (fallback: number) => placed.lastAutoTable?.finalY ?? fallback;
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportId = makeReportId();
  const generated = formatGeneratedAt();
  const period =
    summary.periodStart && summary.periodEnd
      ? `${formatDisplayDate(summary.periodStart)} – ${formatDisplayDate(summary.periodEnd)}`
      : "No sales recorded";

  doc.setFillColor(12, 27, 51);
  doc.rect(0, 0, pageWidth, 78, "F");
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 78, pageWidth, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TradeProof", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Loan-readiness report from business-entered records", 40, 54);
  doc.setFontSize(9);
  doc.text(reportId, pageWidth - 40, 34, { align: "right" });
  doc.text(generated, pageWidth - 40, 50, { align: "right" });

  let y = 108;
  doc.setTextColor(12, 27, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Business profile", 40, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, textColor: [23, 32, 48], cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 120 } },
    body: [
      ["Business", ledger.profile.name || "Not recorded"],
      ["Owner", ledger.profile.owner || "Not recorded"],
      ["Sector", ledger.profile.sector || "Not recorded"],
      ["Location", ledger.profile.location || "Not recorded"],
      ["Currency", ledger.profile.currency],
      ["Dataset", ledger.mode === "demo" ? "Fictional demo shop" : "Business-entered records"],
      ["Reporting period", period],
      ["Report ID", reportId],
    ],
    margin: { left: 40, right: 40 },
  });
  y = afterTable(y) + 16;

  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(217, 119, 6);
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, pageWidth - 96);
  const boxHeight = 18 + disclaimerLines.length * 12;
  doc.roundedRect(40, y, pageWidth - 80, boxHeight, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text("Disclaimer", 52, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(disclaimerLines, 52, y + 28);
  y += boxHeight + 22;

  doc.setTextColor(12, 27, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Sales summary", 40, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const formula = doc.splitTextToSize(
    "Gross profit = revenue − cost of goods sold. Revenue is the sum of quantity × selling price on each sale that has not been voided. Cost of goods sold is the sum of quantity × the purchase cost stored on that sale.",
    pageWidth - 80,
  );
  doc.text(formula, 40, y + 12);
  y += 16 + formula.length * 11;

  autoTable(doc, {
    startY: y,
    head: [["Measure", "Amount"]],
    body: [
      ["Recorded sales", String(summary.transactionCount)],
      ["Revenue", money(summary.revenueMinor, ledger)],
      ["Cost of goods sold", money(summary.cogsMinor, ledger)],
      ["Gross profit", money(summary.grossProfitMinor, ledger)],
      ["Gross margin", formatPercentFromBps(summary.marginBps)],
      ["Inventory value at cost", money(summary.inventoryValueMinor, ledger)],
      ["Average recorded sale", money(summary.averageSaleMinor, ledger)],
    ],
    styles: { fontSize: 9, textColor: [23, 32, 48] },
    headStyles: { fillColor: [12, 27, 51], textColor: 255 },
    margin: { left: 40, right: 40 },
  });
  y = afterTable(y) + 22;

  const writeTable = (title: string, head: string[], body: string[][], note?: string) => {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(12, 27, 51);
    doc.text(title, 40, y);
    y += 8;
    if (note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(note, pageWidth - 80);
      doc.text(lines, 40, y + 10);
      y += 8 + lines.length * 11;
    }
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body.length > 0 ? body : [["—", "Nothing recorded"]],
      styles: { fontSize: 8, textColor: [23, 32, 48] },
      headStyles: { fillColor: [12, 27, 51], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      margin: { left: 40, right: 40 },
    });
    y = afterTable(y) + 20;
  };

  if (summary.weekly.length >= 2) {
    writeTable(
      "Weekly sales",
      ["Week", "Sales", "Revenue", "Gross profit"],
      summary.weekly.map((point) => [point.label, String(point.count), money(point.revenueMinor, ledger), money(point.profitMinor, ledger)]),
    );
  } else if (summary.monthly.length >= 2) {
    writeTable(
      "Monthly sales",
      ["Month", "Sales", "Revenue", "Gross profit"],
      summary.monthly.map((point) => [point.label, String(point.count), money(point.revenueMinor, ledger), money(point.profitMinor, ledger)]),
    );
  } else {
    writeTable(
      "Sales trend",
      ["Period", "Note"],
      [["Recorded range", "Fewer than two weeks or months of sales are available, so a trend is not shown."]],
    );
  }

  writeTable(
    "Payment methods",
    ["Method", "Sales", "Amount"],
    summary.payments.map((payment) => [PAYMENT_LABELS[payment.method], String(payment.count), money(payment.amountMinor, ledger)]),
    summary.payments.length === 0 ? "No payment methods are recorded yet." : undefined,
  );

  writeTable(
    "Inventory",
    ["Product", "SKU", "Stock", "Cost", "Price", "Stock value", "Status"],
    ledger.products.map((product) => [
      product.name,
      product.sku,
      String(product.stockQty),
      money(product.costMinor, ledger),
      money(product.priceMinor, ledger),
      money(product.stockQty * product.costMinor, ledger),
      product.stockQty <= product.lowStockAt ? "Low" : "OK",
    ]),
  );

  writeTable(
    "Recordkeeping",
    ["Check", "Status", "Detail"],
    summary.completeness.map((item) => [item.label, item.ok ? "Recorded" : "Missing", item.detail]),
  );

  if (y > 680) {
    doc.addPage();
    y = 48;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(12, 27, 51);
  doc.text("Analyst narrative", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(23, 32, 48);

  const narrative = !insight
    ? "No analyst narrative was included. The figures above stand on the recorded sales alone. Generate an analysis in TradeProof if you want a written commentary beside these numbers."
    : !insightFresh
      ? "A previous narrative was left out because the ledger changed after it was written. Generate a new analysis before relying on written commentary."
      : insight.source === "gemma-4"
        ? `Generated by Gemma 4${insight.model ? ` (${insight.model})` : ""} from the aggregated figures in this report. This is model commentary, not a verified assessment.\n\n${insight.summary}\n\nTrends\n${insight.trends}\n\nRecommendations\n${insight.recommendations.map((item) => `• ${item}`).join("\n")}\n\nRecordkeeping\n${insight.recordkeeping}\n\nEntries for a person to review\n${insight.reviewNotes}`
        : `Demo insights written by the application. This is not live Gemma 4 output.\n\n${insight.summary}\n\nTrends\n${insight.trends}\n\nRecommendations\n${insight.recommendations.map((item) => `• ${item}`).join("\n")}\n\nRecordkeeping\n${insight.recordkeeping}\n\nEntries for a person to review\n${insight.reviewNotes}`;

  const lines = doc.splitTextToSize(narrative, pageWidth - 80);
  let cursor = y;
  for (const line of lines) {
    if (cursor > 790) {
      doc.addPage();
      cursor = 48;
    }
    doc.text(line, 40, cursor);
    cursor += 12;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${reportId}  ·  Page ${page} of ${pages}  ·  Not a bank statement or loan approval`, 40, doc.internal.pageSize.getHeight() - 24);
  }

  const slug = (ledger.profile.name || "business").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`TradeProof-${slug || "report"}-${reportId}.pdf`);
}
