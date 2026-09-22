export function excludedFromRelease(path: string): boolean;
export function auditRelease(root: string, options?: { sensitiveTerms?: string[]; home?: string }): Promise<{
  files: string[]; skipped: string[];
  findings: { file: string; code: string; line?: number }[];
  knownSecretSourcesChecked: boolean; trackedFilesChecked: boolean; historyScanned: boolean; humanAuthorization: 'REQUIRED';
}>;
