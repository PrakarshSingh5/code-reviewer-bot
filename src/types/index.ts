/** Shared types used across the application */

export interface PullRequestContext {
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  installationId: number;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export type Severity = 'bug' | 'security' | 'suggestion' | 'nitpick';

export interface ReviewComment {
  file: string;
  line: number;
  severity: Severity;
  comment: string;
}

export interface RepoConfig {
  enabled: boolean;
  skip_files: string[];
  min_severity: Severity;
  max_comments: number;
}
