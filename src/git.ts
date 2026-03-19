import { execSync } from "child_process";
import { log } from "./logger";

function exec(cmd: string): string {
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
}

function hasChanges(outputDir: string): boolean {
  // -f bypasses .gitignore — critical if screenshots/ is ignored
  exec(`git add -f ${outputDir}`);
  const staged = exec("git diff --cached --name-only");
  log.info(`Staged files:\n${staged || "(none)"}`);
  return staged.length > 0;
}

export function configureGit(): void {
  exec("git config user.name 'github-actions[bot]'");
  exec("git config user.email 'github-actions[bot]@users.noreply.github.com'");
}

export function commitChanges(outputDir: string): void {
  configureGit();
  if (!hasChanges(outputDir)) {
    log.info("No changes detected, skipping commit.");
    return;
  }
  exec("git commit -m 'chore: update screenshots [skip ci]'");
  exec("git push");
  log.success("Changes committed and pushed.");
}

export async function createPullRequest(branch: string, outputDir: string): Promise<void> {
  exec(`git checkout -B ${branch}`);
  configureGit();

  if (!hasChanges(outputDir)) {
    log.info("No changes detected, skipping PR.");
    return;
  }

  exec("git commit -m 'chore: update screenshots [skip ci]'");
  exec(`git push origin ${branch} --force`);
  log.success(`Branch ${branch} pushed.`);

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    log.warn("GITHUB_TOKEN or GITHUB_REPOSITORY not set — skipping PR creation.");
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "chore: update screenshots",
        body: "Automated screenshot update from monitoring workflow.",
        head: branch,
        base: "main",
      }),
    });

    if (res.status === 422) {
      log.warn("PR already exists for this branch — skipping.");
      return;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${body}`);
    }

    const pr = await res.json() as { html_url: string };
    log.success(`PR created: ${pr.html_url}`);
  } catch (err: any) {
    log.warn(`PR creation failed: ${err.message}`);
  }
}
