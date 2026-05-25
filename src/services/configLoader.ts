import yaml from 'js-yaml';
import { Octokit } from '@octokit/rest';
import { PullRequestContext, RepoConfig, Severity } from '../types';

const DEFAULTS: RepoConfig = {
  enabled: true,
  skip_files: [],
  min_severity: 'suggestion',
  max_comments: 10,
};

/**
 * Attempt to load reviewbot.yml from the repo root at the PR's commit SHA.
 * Falls back to defaults if the file doesn't exist or is malformed.
 * Implements CF-01.
 */
export async function loadRepoConfig(
  octokit: Octokit,
  context: PullRequestContext,
): Promise<RepoConfig> {
  const { owner, repo, commitSha } = context;

  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: 'reviewbot.yml',
      ref: commitSha,
    });

    // data is a union type; narrow to file content
    if (!('content' in data)) throw new Error('reviewbot.yml is not a file');

    const raw = Buffer.from(data.content as string, 'base64').toString('utf8');
    const parsed = (yaml.load(raw) as Partial<RepoConfig>) ?? {};

    const config: RepoConfig = {
      ...DEFAULTS,
      ...parsed,
      // Clamp max_comments to [1, 50]
      max_comments: Math.min(Math.max(Number(parsed.max_comments ?? DEFAULTS.max_comments), 1), 50),
      // Validate severity falls back to default if unknown
      min_severity: isValidSeverity(parsed.min_severity)
        ? parsed.min_severity
        : DEFAULTS.min_severity,
    };

    console.log('[ConfigLoader] Loaded reviewbot.yml from repo');
    return config;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      console.log('[ConfigLoader] No reviewbot.yml found — using defaults');
    } else {
      console.warn('[ConfigLoader] Failed to load reviewbot.yml:', (err as Error).message);
    }
    return { ...DEFAULTS };
  }
}

function isValidSeverity(value: unknown): value is Severity {
  return ['bug', 'security', 'suggestion', 'nitpick'].includes(value as string);
}
