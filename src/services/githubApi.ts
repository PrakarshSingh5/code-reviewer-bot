import { Octokit } from '@octokit/rest';
import micromatch from 'micromatch';
import path from 'path';
import { PullRequestContext, PRFile, RepoConfig } from '../types';

// Binary/non-reviewable extensions to skip (GH-06)
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.pdf', '.zip', '.tar', '.gz', '.exe', '.bin', '.wasm',
  '.ttf', '.woff', '.woff2', '.eot', '.mp4', '.mp3', '.mov',
]);

const MAX_FILES_PER_PR = 20; // Cap at 20 when > 50 files changed (Section 8)

/**
 * Fetch and filter changed files for a PR.
 * Implements GH-03, GH-06, GH-07, and CF-02.
 */
export async function fetchPRFiles(
  octokit: Octokit,
  context: PullRequestContext,
  config: Partial<RepoConfig> = {},
): Promise<PRFile[]> {
  const { owner, repo, pullNumber } = context;

  const { data: files } = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
    { owner, repo, pull_number: pullNumber, per_page: 100 },
  );

  if (files.length > 50) {
    console.warn(
      `[GithubApi] PR has ${files.length} changed files — capping review at ${MAX_FILES_PER_PR}`,
    );
  }

  const skipPatterns = config.skip_files ?? [];

  const filtered: PRFile[] = files
    .slice(0, MAX_FILES_PER_PR)
    .filter((file) => {
      // GH-07: Skip deleted files
      if (file.status === 'removed') return false;

      // GH-06: Skip binary files by extension
      const ext = path.extname(file.filename).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) return false;

      // CF-02: Skip files matching skip_files globs from reviewbot.yml
      if (skipPatterns.length && micromatch.isMatch(file.filename, skipPatterns)) return false;

      // Skip files without a diff patch (e.g. pure renames)
      if (!file.patch) return false;

      return true;
    })
    .map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch as string,
    }));

  return filtered;
}
