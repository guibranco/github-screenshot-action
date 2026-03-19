import { execSync } from "child_process";

export function commitChanges() {
  execSync("git config user.name 'github-actions'");
  execSync("git config user.email 'github-actions@github.com'");

  execSync("git add .");
  execSync("git commit -m 'chore: update screenshots' || echo 'no changes'");
  execSync("git push");
}

export function createPullRequest(branch: string) {
  execSync(`git checkout -b ${branch}`);
  commitChanges();

  execSync(`git push origin ${branch}`);

  execSync(
    `gh pr create --title "Update screenshots" --body "Automated screenshots update"`
  );
}
