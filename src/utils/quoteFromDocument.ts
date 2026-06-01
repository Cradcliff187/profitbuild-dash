import type { ProjectDocument } from "@/types/document";

/**
 * Document types eligible to spawn a quote. Imported docs land as `other`
 * (the background Drive-import agent can't classify them), and a doc the user
 * already relabeled `quote` but never turned into a real quote record is also
 * fair game. Contracts / invoices / AIA docs are never quote sources.
 */
const QUOTE_ELIGIBLE_TYPES = new Set<ProjectDocument["document_type"]>(["other", "quote"]);

/**
 * Whether the "Create quote from this document" action should be offered.
 * Hidden once the document is already linked to a quote (`related_quote_id`),
 * so we never double-create.
 */
export function canCreateQuoteFromDocument(
  doc: Pick<ProjectDocument, "document_type" | "related_quote_id">
): boolean {
  return QUOTE_ELIGIBLE_TYPES.has(doc.document_type) && !doc.related_quote_id;
}

/**
 * Project-scoped new-quote route, seeded with the source document id. The
 * QuoteForm carries the existing file through as the attachment (no re-upload)
 * and relinks this document row to the new quote on save. No DB write happens
 * until Save, so navigating here is cancel-safe (Gotcha #39).
 */
export function newQuoteFromDocumentPath(
  doc: Pick<ProjectDocument, "id" | "project_id">
): string {
  return `/projects/${doc.project_id}/estimates/quotes/new?sourceDocumentId=${doc.id}`;
}
