import { execSync } from "child_process";
import { log } from "./logger";

function exec(cmd: string): string {
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
}

function hasChanges(): boolean {
  return exec("git status --porcelain") !== "";
}

export function configureGit(): void {
  exec("git config user.name 'github-actions[bot]'");
  exec("git config user.email 'github-actions[bot]@users.noreply.github.com'");
}

export function commitChanges(outputDir: string): void {
  if (!hasChanges()) {
    log.info("No changes detected, skipping commit.");
    return;
  }

  configureGit();
  exec(`git add ${outputDir}`);
  exec("git commit -m 'chore: update screenshots [skip ci]'");
  exec("git push");
  log.success("Changes committed and pushed.");
}

export function createPullRequest(branch: string, outputDir: string): void {
  exec(`git checkout -B ${branch}`);

  if (!hasChanges()) {
    log.info("No changes detected, skipping PR.");
    return;
  }

  configureGit();
  exec(`git add ${outputDir}`);
  exec(`git commit -m 'chore: update screenshots [skip ci]'`);
  exec(`git push origin ${branch} --force`);

  try {
    exec(`gh pr create --title "chore: update screenshots" --body "Automated screenshot update." --base main --head ${branch}`);
    log.success(`PR created for branch ${branch}.`);
  } catch {
    log.warn("PR already exists or gh CLI failed — skipping PR creation.");
  }
}
