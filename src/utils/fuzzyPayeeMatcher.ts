import { Payee, PayeeType } from "@/types/payee";

export interface PartialPayee {
  id: string;
  payee_name: string;
  full_name?: string;
  payee_type?: PayeeType;
}

export interface PayeeMatch {
  payee: PartialPayee;
  confidence: number;
  matchType: 'exact' | 'fuzzy';
}

export interface FuzzyMatchResult {
  qbName: string;
  matches: PayeeMatch[];
  bestMatch?: PayeeMatch;
}

// Calculate Levenshtein distance between two strings
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Calculate Jaro-Winkler similarity
export const jaroWinklerSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchWindow < 0) return 0.0;
  
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || str1[i] !== str2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Calculate common prefix (up to 4 characters)
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + 0.1 * prefix * (1 - jaro);
};

// Normalize string for better matching
export const normalizeBusinessName = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\b(inc|llc|corp|company|co|construction|const|ltd|limited)\b/g, '') // Remove common suffixes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

// Extract tokens for token-based matching
const tokenize = (str: string): string[] => {
  return normalizeBusinessName(str).split(/\s+/).filter(token => token.length > 1);
};

// Calculate token-based similarity
export const tokenSimilarity = (str1: string, str2: string): number => {
  const tokens1 = new Set(tokenize(str1));
  const tokens2 = new Set(tokenize(str2));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

// Calculate overall confidence score
  const calculateConfidence = (qbName: string, payee: PartialPayee): number => {
  const payeeNames = [payee.payee_name];
  if (payee.full_name) payeeNames.push(payee.full_name);
  
  let maxConfidence = 0;
  
  for (const payeeName of payeeNames) {
    // Exact match
    if (normalizeBusinessName(qbName) === normalizeBusinessName(payeeName)) {
      return 100;
    }
    
    // Calculate different similarity metrics
    const jaroWinkler = jaroWinklerSimilarity(normalizeBusinessName(qbName), normalizeBusinessName(payeeName)) * 100;
    
    const maxLen = Math.max(qbName.length, payeeName.length);
    const levenshtein = ((maxLen - levenshteinDistance(qbName, payeeName)) / maxLen) * 100;
    
    const tokenSim = tokenSimilarity(qbName, payeeName) * 100;
    
    // Weight the metrics (Jaro-Winkler is best for names, token similarity for business names)
    const confidence = Math.max(
      jaroWinkler * 0.4 + levenshtein * 0.3 + tokenSim * 0.3,
      tokenSim * 0.6 + jaroWinkler * 0.4 // Alternative weighting for token-heavy matches
    );
    
    maxConfidence = Math.max(maxConfidence, confidence);
  }
  
  return Math.round(maxConfidence * 100) / 100; // Round to 2 decimal places
};

// Confidence thresholds
const AUTO_MATCH_THRESHOLD = 75; // Lowered from 60 for better selectivity
const REVIEW_THRESHOLD = 40; // Matches needing review

// Main fuzzy matching function
export const fuzzyMatchPayee = (qbName: string, payees: PartialPayee[]): FuzzyMatchResult => {
  const matches: PayeeMatch[] = [];
  
  for (const payee of payees) {
    // Check for exact match first
    const exactMatch = payee.payee_name.toLowerCase() === qbName.toLowerCase() ||
                      (payee.full_name && payee.full_name.toLowerCase() === qbName.toLowerCase());
    
    if (exactMatch) {
      matches.push({
        payee,
        confidence: 100,
        matchType: 'exact'
      });
    } else {
      // Calculate fuzzy confidence
      const confidence = calculateConfidence(qbName, payee);
      
      if (confidence >= REVIEW_THRESHOLD) { // Only include matches with at least review threshold confidence
        matches.push({
          payee,
          confidence,
          matchType: 'fuzzy'
        });
      }
    }
  }
  
  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);
  
  const result: FuzzyMatchResult = {
    qbName,
    matches,
  };
  
  // Set best match based on confidence thresholds
  if (matches.length > 0) {
    const topMatch = matches[0];
    if (topMatch.confidence >= AUTO_MATCH_THRESHOLD) { // Updated threshold for auto-selection
      result.bestMatch = topMatch;
    }
  }
  
  return result;
};

// Batch process multiple payee names
export const batchFuzzyMatchPayees = (qbNames: string[], payees: PartialPayee[]): FuzzyMatchResult[] => {
  return qbNames.map(qbName => fuzzyMatchPayee(qbName, payees));
};

// Removed legacy vendor aliases - use payee functions instead