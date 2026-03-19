import { execSync } from "child_process";

export function commitChanges() {
  try {
    execSync("git diff --quiet");
    return;
  } catch {}

  execSync("git config user.name 'github-actions'");
  execSync("git config user.email 'github-actions@github.com'");

  execSync("git add .");
  execSync("git commit -m 'chore: update screenshots'");
  execSync("git push");
}

export function createPullRequest(branch: string) {
  execSync(`git checkout -B ${branch}`);
  commitChanges();
  execSync(`git push origin ${branch} --force`);
  execSync(`gh pr create --title \"Update screenshots\" --body \"Automated update\" || true`);
}