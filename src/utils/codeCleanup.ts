/**
 * Code cleanup utilities for maintaining clean imports and code quality
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Interface for unused import detection result
 */
interface UnusedImportResult {
  file: string;
  unusedImports: string[];
  suggestions: string[];
}

/**
 * Interface for code quality issue
 */
interface CodeQualityIssue {
  file: string;
  line: number;
  type: 'incomplete-code' | 'unused-import' | 'todo' | 'fixme';
  description: string;
  suggestion?: string;
}

/**
 * Scans a TypeScript/React file for unused imports
 * @param filePath - Path to the file to scan
 * @returns Array of unused import names
 */
export function detectUnusedImports(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const imports: string[] = [];
    const importRegex = /^import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"][^'"]+['"];?$/;
    
    // Extract all imported names
    lines.forEach(line => {
      const match = line.match(importRegex);
      if (match) {
        if (match[1]) {
          // Named imports: { name1, name2 }
          const namedImports = match[1]
            .split(',')
            .map(imp => imp.trim().split(' as ')[0].trim())
            .filter(imp => imp && !imp.startsWith('type '));
          imports.push(...namedImports);
        } else if (match[2]) {
          // Namespace import: * as name
          imports.push(match[2]);
        } else if (match[3]) {
          // Default import
          imports.push(match[3]);
        }
      }
    });
    
    // Check which imports are actually used
    const unusedImports: string[] = [];
    imports.forEach(importName => {
      // Skip React import as it's implicitly used in JSX
      if (importName === 'React') return;
      
      // Create regex to find usage (word boundary, not in comments)
      const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
      const contentWithoutImports = lines
        .filter(line => !line.trim().startsWith('import'))
        .join('\n');
      
      if (!usageRegex.test(contentWithoutImports)) {
        unusedImports.push(importName);
      }
    });
    
    return unusedImports;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return [];
  }
}

/**
 * Scans for common code quality issues
 * @param filePath - Path to the file to scan
 * @returns Array of code quality issues found
 */
export function detectCodeQualityIssues(filePath: string): CodeQualityIssue[] {
  const issues: CodeQualityIssue[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      // Check for TODO/FIXME comments
      if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: trimmedLine.includes('TODO') ? 'todo' : 'fixme',
          description: `Found ${trimmedLine.includes('TODO') ? 'TODO' : 'FIXME'} comment: ${trimmedLine}`,
          suggestion: 'Consider implementing or removing this comment'
        });
      }
      
      // Check for potentially incomplete code patterns
      if (trimmedLine.match(/^\s*}\s*else\s+\w+\s*$/)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'incomplete-code',
          description: 'Potentially incomplete else statement',
          suggestion: 'Complete the else statement or remove dangling text'
        });
      }
      
      // Check for incomplete interface/type definitions
      if (trimmedLine.match(/{\s*\w+\?\s*$/)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'incomplete-code',
          description: 'Potentially incomplete interface/type definition',
          suggestion: 'Complete the type definition'
        });
      }
    });
    
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
  }
  
  return issues;
}

/**
 * Recursively scans a directory for TypeScript/React files
 * @param dirPath - Directory to scan
 * @param extensions - File extensions to include
 * @returns Array of file paths
 */
export function scanDirectory(
  dirPath: string, 
  extensions: string[] = ['.ts', '.tsx']
): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dirPath);
    
    entries.forEach(entry => {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        files.push(...scanDirectory(fullPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Generates a comprehensive code quality report
 * @param projectRoot - Root directory of the project
 * @returns Object containing all findings
 */
export function generateCodeQualityReport(projectRoot: string) {
  const srcDir = join(projectRoot, 'src');
  const files = scanDirectory(srcDir);
  
  const report = {
    scannedFiles: files.length,
    unusedImports: [] as UnusedImportResult[],
    codeQualityIssues: [] as CodeQualityIssue[],
    summary: {
      totalUnusedImports: 0,
      totalIssues: 0,
      todoCount: 0,
      fixmeCount: 0,
      incompleteCodeCount: 0
    }
  };
  
  files.forEach(file => {
    const unusedImports = detectUnusedImports(file);
    if (unusedImports.length > 0) {
      report.unusedImports.push({
        file: file.replace(projectRoot, '.'),
        unusedImports,
        suggestions: [`Remove unused imports: ${unusedImports.join(', ')}`]
      });
      report.summary.totalUnusedImports += unusedImports.length;
    }
    
    const issues = detectCodeQualityIssues(file);
    issues.forEach(issue => {
      issue.file = issue.file.replace(projectRoot, '.');
      report.codeQualityIssues.push(issue);
      
      switch (issue.type) {
        case 'todo':
          report.summary.todoCount++;
          break;
        case 'fixme':
          report.summary.fixmeCount++;
          break;
        case 'incomplete-code':
          report.summary.incompleteCodeCount++;
          break;
      }
    });
    
    report.summary.totalIssues += issues.length;
  });
  
  return report;
}

/**
 * Removes unused imports from a file
 * @param filePath - Path to the file to clean
 * @returns Whether any changes were made
 */
export function removeUnusedImports(filePath: string): boolean {
  const unusedImports = detectUnusedImports(filePath);
  
  if (unusedImports.length === 0) {
    return false;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    let cleanedContent = content;
    
    unusedImports.forEach(unusedImport => {
      // Remove from named imports
      cleanedContent = cleanedContent.replace(
        new RegExp(`(import\\s+{[^}]*?)\\b${unusedImport}\\b,?([^}]*?})`, 'g'),
        (match, before, after) => {
          const cleaned = before + after.replace(/^,/, '').replace(/,$/, '');
          return cleaned.match(/{[\s,]*}/) ? '' : cleaned;
        }
      );
      
      // Remove entire import line if it's a default import
      cleanedContent = cleanedContent.replace(
        new RegExp(`^import\\s+${unusedImport}\\s+from\\s+['"][^'"]+['"];?\\s*\\n`, 'gm'),
        ''
      );
    });
    
    writeFileSync(filePath, cleanedContent, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error cleaning file ${filePath}:`, error);
    return false;
  }
}