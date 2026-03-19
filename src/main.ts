import * as core from "@actions/core";
import { loadItems } from "./parser";
import { takeScreenshots } from "./screenshot";
import { commitChanges, createPullRequest } from "./git";

async function run() {
  try {
    const jsonFile = core.getInput("json_file");
    const outputDir = core.getInput("output_dir");

    const options = {
      concurrency: parseInt(core.getInput("concurrency")),
      timeoutMs: parseInt(core.getInput("timeout_ms")),
      retries: parseInt(core.getInput("retries")),
    };

    const createPr = core.getInput("create_pr") === "true";
    const branchName = core.getInput("branch_name");

    const items = loadItems(jsonFile);

    await takeScreenshots(items, outputDir, options);

    if (createPr) {
      await createPullRequest(branchName);
    } else {
      await commitChanges();
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
