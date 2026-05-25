import { getInstallationOctokit } from '../services/githubClient';
import { fetchPRFiles } from '../services/githubApi';
import { analyzeFiles } from '../services/llmService';
import { loadRepoConfig } from '../services/configLoader';
import { postReview, postFailureComment } from '../services/reviewer';
import { PullRequestContext } from '../types';

const SUPPORTED_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

export async function handlePullRequest(payload: Record<string, unknown>): Promise<void> {
  const action = payload['action'] as string;
  const pr = payload['pull_request'] as Record<string, unknown>;
  const repo = payload['repository'] as Record<string, unknown>;
  const installation = payload['installation'] as Record<string, unknown> | undefined;
  const repoOwner = repo['owner'] as Record<string, unknown>;
  const prUser = pr['user'] as Record<string, unknown>;
  const prHead = pr['head'] as Record<string, unknown>;

  if (!SUPPORTED_ACTIONS.has(action)) {
    console.log(`[EventHandler] Skipping PR action: ${action}`);
    return;
  }

  if (!installation?.['id']) {
    console.error(
      '[EventHandler] ❌ No installation ID in payload. ' +
      'This webhook was fired from a direct repo webhook, not a GitHub App. ' +
      'Please install your GitHub App on this repo and use the App webhook URL.',
    );
    return;
  }

  if (prUser?.['type'] === 'Bot') {
    console.log('[EventHandler] PR opened by a Bot — skipping to avoid loops');
    return;
  }

  const context: PullRequestContext = {
    owner: repoOwner['login'] as string,
    repo: repo['name'] as string,
    pullNumber: payload['number'] as number,
    commitSha: prHead['sha'] as string,
    installationId: installation['id'] as number,
  };

  console.log(
    `[EventHandler] Processing PR #${context.pullNumber} on ${context.owner}/${context.repo}`,
  );

  const octokit = await getInstallationOctokit(context.installationId);

  try {
    const config = await loadRepoConfig(octokit, context);
    console.log('[EventHandler] Config loaded:', JSON.stringify(config));

    const files = await fetchPRFiles(octokit, context, config);
    console.log(`[EventHandler] Fetched ${files.length} reviewable file(s)`);

    if (files.length === 0) {
      console.log('[EventHandler] No reviewable files found — nothing to do');
      return;
    }

    const comments = await analyzeFiles(files, config);
    console.log(`[EventHandler] LLM returned ${comments.length} comment(s)`);

    await postReview(octokit, context, comments, config);
    console.log(`[EventHandler] Review posted for PR #${context.pullNumber}`);
  } catch (err) {
    console.error('[EventHandler] Error during PR review pipeline:', err);
    try {
      await postFailureComment(octokit, context, err as Error);
    } catch (postErr) {
      console.error('[EventHandler] Also failed to post failure comment:', postErr);
    }
  }
}

export async function handleInstallation(payload: Record<string, unknown>): Promise<void> {
  if (payload['action'] === 'created') {
    const installation = payload['installation'] as Record<string, unknown>;
    const repositories = payload['repositories'] as Array<Record<string, unknown>> | undefined;

    console.log(`[EventHandler] App installed — installation_id=${installation['id']}`);

    if (repositories?.length) {
      const repoNames = repositories.map((r) => r['full_name']).join(', ');
      console.log(`[EventHandler] Installed on repos: ${repoNames}`);
    }
  }
}
