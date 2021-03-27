const pWaitFor = require('p-wait-for');
const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('child_process');

const obtainInputs = () => {
  return {
    site: core.getInput('site'),
    timeout: (+core.getInput('timeout') ?? 60) * 1000 * 5,
  };
}

const obtainUrl = () => {
  try {
    const PR_NUMBER = github.context.payload.number;
    if (!PR_NUMBER) {
      core.setFailed('Action must be run in conjunction with the `pull_request` event');
    }
    const url = `https://deploy-preview-${PR_NUMBER}--${siteName}.netlify.app`;
    core.setOutput('url', url);
    return url;
  }
  catch {
    core.setFailed('Unable to obtain url');
  }
}

const waitForNetlifyPreview = (url, timeout) => {
  const callUrl = async () => {
    const res = await fetch(url);
    return res.ok;
  }
  return pWaitFor(callUrl, {timeout})
}

const runAxe = (url) => {
  exec(`axe ${url}`, (error, stdout, stderr) => {
    if (error) {
      core.setFailed(error.message);
      return;
    }
    if (stderr) {
      core.setFailed(stderr.message);
      return;
    }
    core.setOutput('log', stdout);
  });
}

const main = async () => {
  const {site, timeout} = obtainInputs();
  const url = obtainUrl(site);
  try {
    await waitForNetlifyPreview(url, timeout);
    runAxe(url);
  }
  catch {
    core.setFailed(`Timeout reached: Unable to connect to ${url}`);
  }
}

main();