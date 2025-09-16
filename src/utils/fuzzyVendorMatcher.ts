import { Vendor } from "@/types/vendor";

export interface PartialVendor {
  id: string;
  vendor_name: string;
  full_name?: string;
}

export interface VendorMatch {
  vendor: PartialVendor;
  confidence: number;
  matchType: 'exact' | 'fuzzy';
}

export interface FuzzyMatchResult {
  qbName: string;
  matches: VendorMatch[];
  bestMatch?: VendorMatch;
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
const jaroWinklerSimilarity = (str1: string, str2: string): number => {
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
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\b(inc|llc|corp|company|co|construction|const|ltd|limited)\b/g, '') // Remove common suffixes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

// Extract tokens for token-based matching
const tokenize = (str: string): string[] => {
  return normalizeString(str).split(/\s+/).filter(token => token.length > 1);
};

// Calculate token-based similarity
const tokenSimilarity = (str1: string, str2: string): number => {
  const tokens1 = new Set(tokenize(str1));
  const tokens2 = new Set(tokenize(str2));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

// Calculate overall confidence score
const calculateConfidence = (qbName: string, vendor: PartialVendor): number => {
  const vendorNames = [vendor.vendor_name];
  if (vendor.full_name) vendorNames.push(vendor.full_name);
  
  let maxConfidence = 0;
  
  for (const vendorName of vendorNames) {
    // Exact match
    if (normalizeString(qbName) === normalizeString(vendorName)) {
      return 100;
    }
    
    // Calculate different similarity metrics
    const jaroWinkler = jaroWinklerSimilarity(normalizeString(qbName), normalizeString(vendorName)) * 100;
    
    const maxLen = Math.max(qbName.length, vendorName.length);
    const levenshtein = ((maxLen - levenshteinDistance(qbName, vendorName)) / maxLen) * 100;
    
    const tokenSim = tokenSimilarity(qbName, vendorName) * 100;
    
    // Weight the metrics (Jaro-Winkler is best for names, token similarity for business names)
    const confidence = Math.max(
      jaroWinkler * 0.4 + levenshtein * 0.3 + tokenSim * 0.3,
      tokenSim * 0.6 + jaroWinkler * 0.4 // Alternative weighting for token-heavy matches
    );
    
    maxConfidence = Math.max(maxConfidence, confidence);
  }
  
  return Math.round(maxConfidence * 100) / 100; // Round to 2 decimal places
};

// Main fuzzy matching function
export const fuzzyMatchVendor = (qbName: string, vendors: PartialVendor[]): FuzzyMatchResult => {
  const matches: VendorMatch[] = [];
  
  for (const vendor of vendors) {
    // Check for exact match first
    const exactMatch = vendor.vendor_name.toLowerCase() === qbName.toLowerCase() ||
                      (vendor.full_name && vendor.full_name.toLowerCase() === qbName.toLowerCase());
    
    if (exactMatch) {
      matches.push({
        vendor,
        confidence: 100,
        matchType: 'exact'
      });
    } else {
      // Calculate fuzzy confidence
      const confidence = calculateConfidence(qbName, vendor);
      
      if (confidence >= 30) { // Only include matches with at least 30% confidence
        matches.push({
          vendor,
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
    if (topMatch.confidence >= 60) { // Minimum threshold for auto-selection
      result.bestMatch = topMatch;
    }
  }
  
  return result;
};

// Batch process multiple vendor names
export const batchFuzzyMatchVendors = (qbNames: string[], vendors: PartialVendor[]): FuzzyMatchResult[] => {
  return qbNames.map(qbName => fuzzyMatchVendor(qbName, vendors));
};