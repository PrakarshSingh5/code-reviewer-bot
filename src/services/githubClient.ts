import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

let _app: App | null = null;

/**
 * Lazily initialize the Octokit App singleton.
 * Implements GH-01: authenticate as GitHub App using JWT (RS256).
 */
function getApp(): App {
  if (_app) return _app;

  // Support Railway/Fly.io env vars where newlines are escaped as \n
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.GITHUB_APP_ID || !privateKey || !process.env.GITHUB_WEBHOOK_SECRET) {
    throw new Error(
      'Missing required env vars: GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET',
    );
  }

  _app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey,
    webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET },
  });

  return _app;
}

/**
 * Get an Octokit instance authenticated with an installation access token.
 * Implements GH-02: exchange JWT for installation access token per repo.
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = getApp();
  return app.getInstallationOctokit(installationId) as Promise<Octokit>;
}
