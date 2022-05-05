const core = require('@actions/core');
const run = require('./utils/run');
const checkEnv = require('./utils/checkEnv');
const { createJiraRelease } = require('./jira-release');

const action = async () => {
  checkEnv(['JIRA_USERNAME', 'JIRA_PASSWORD']);

  const protocol = core.getInput('jira-protocol', { required: true });
  const host = core.getInput('jira-host', { required: true });
  const projectKey = core.getInput('jira-project', { required: true });
  const component = core.getInput('jira-component') || '';
  const version = core.getInput('version', { required: true });
  const publishVersion = core.getInput('publish') || false;
  const jiraKeys = core.getInput('jira-keys') || '';

  await createJiraRelease({
    protocol,
    host,
    projectKey,
    component,
    version,
    publishVersion,
    jiraKeys
  });
};

if (require.main === module) {
  run(action);
}

module.exports = action;
