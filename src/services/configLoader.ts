import yaml from 'js-yaml';
import { Octokit } from '@octokit/rest';
import { PullRequestContext, RepoConfig, Severity } from '../types';

const DEFAULTS: RepoConfig = {
  enabled: true,
  skip_files: [],
  min_severity: 'suggestion',
  max_comments: 10,
};

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

    if (!('content' in data)) throw new Error('reviewbot.yml is not a file');

    const raw = Buffer.from(data.content as string, 'base64').toString('utf8');
    const parsed = (yaml.load(raw) as Partial<RepoConfig>) ?? {};

    const config: RepoConfig = {
      ...DEFAULTS,
      ...parsed,
      max_comments: Math.min(Math.max(Number(parsed.max_comments ?? DEFAULTS.max_comments), 1), 50),
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
