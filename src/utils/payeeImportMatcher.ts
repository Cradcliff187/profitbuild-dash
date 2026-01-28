import { fuzzyMatchPayee } from '@/utils/fuzzyPayeeMatcher';
import type { PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import type { PayeeImportData } from '@/utils/payeeCsvParser';

export type ClassifiedPayeeStatus = 'new' | 'existing' | 'review';

export interface ClassifiedPayee {
  status: ClassifiedPayeeStatus;
  csvPayee: PayeeImportData;
  matchedPayee?: PartialPayee;
  confidence?: number;
  inFileMergedCount?: number;
  mergedNames?: string[];
}

const AUTO_MATCH_THRESHOLD = 75;
const REVIEW_THRESHOLD = 40;

/**
 * Classify each unique CSV payee against existing payees using fuzzyMatchPayee.
 * bestMatch and confidence >= 75% -> existing; matches in [40%, 75%) -> review; else -> new.
 */
export function classifyPayees(
  uniquePayeesFromCSV: PayeeImportData[],
  existingPayees: PartialPayee[],
  inFileMergeMetadata: { canonicalIndex: number; mergedNames: string[] }[] = []
): ClassifiedPayee[] {
  const mergedNamesByIndex = new Map<number, string[]>();
  inFileMergeMetadata.forEach((m) => mergedNamesByIndex.set(m.canonicalIndex, m.mergedNames));

  return uniquePayeesFromCSV.map((csvPayee, index) => {
    const mergedNames = mergedNamesByIndex.get(index);
    const inFileMergedCount = mergedNames ? mergedNames.length - 1 : 0;

    const result = fuzzyMatchPayee(csvPayee.payee_name, existingPayees);
    let status: ClassifiedPayeeStatus = 'new';
    let matchedPayee: PartialPayee | undefined;
    let confidence: number | undefined;

    if (result.bestMatch && result.bestMatch.confidence >= AUTO_MATCH_THRESHOLD) {
      status = 'existing';
      matchedPayee = result.bestMatch.payee;
      confidence = result.bestMatch.confidence;
    } else if (result.matches.length > 0 && result.matches[0].confidence >= REVIEW_THRESHOLD) {
      status = 'review';
      matchedPayee = result.matches[0].payee;
      confidence = result.matches[0].confidence;
    }

    return {
      status,
      csvPayee,
      matchedPayee,
      confidence,
      inFileMergedCount: inFileMergedCount > 0 ? inFileMergedCount : undefined,
      mergedNames,
    };
  });
}
