const core = require('@actions/core');
const JiraClient = require('jira-client');
const semver = require('semver');
// const { findJiraChanges } = require('../../jira-releasenotes/src/jira-releasenotes');

const releaseName = (projectKey, component, version) => {
  const release = [projectKey];
  if (component) {
    release.push(`(${component})`);
  }

  const cleanVersion = semver.clean(version);
  if (cleanVersion === null) {
    throw new Error(`'${version}' is not a semantic version`);
  }

  release.push(cleanVersion);
  // return release.join(' ');
  return version;
};

const getOrCreateRelease = async (client, { key, id }, name, releaseurl) => {
  const releases = await client.getVersions(key);
  const existingRelease = releases.find((release) => release.name === name);
  if (existingRelease) {
    core.info(
      `JIRA Release '${name}' already exists and is ${existingRelease.released ? 'released' : 'unreleased'}`,
    );
    return existingRelease;
  }
  core.info(`Create new JIRA release '${name}'`);
  return client.createVersion({
    name,
    description: releaseurl ? releaseurl : 'Created by GitHub Actions.',
    projectId: id,
  });
};

const createUpdate = ({ id }) => ({
  update: {
    fixVersions: [
      { add: { id } },
    ],
  },
});

const createJiraRelease = async ({
  protocol,
  host,
  projectKey,
  component,
  version,
  publishVersion,
  jiraKeys,
  releaseUrl
}) => {
  const client = new JiraClient({
    protocol,
    host,
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD,
    apiVersion: '2',
    strictSSL: protocol === 'https',
  });

  if(jiraKeys.length < 1) {
    console.log('No Jira keys provided ... quiting');
    return true;
  }


  const issueKeys = new Set(String(jiraKeys).split(","));
  let projectKeys = new Set();
  
  for (const issue of issueKeys) {
    const[projectKey] = issue.split('-'); 
    projectKeys.add(projectKey)
  }
  console.log(`Found the following Jira projects ${[...projectKeys]}`);
  console.log(`found the following Jira keys ${[...issueKeys]}`);

 await projectKeys.forEach(async (projectKey) =>  {
    console.log(`Starting jira update for ${projectKey}`);
    const name = releaseName(projectKey, component, version);

    const project = await client.getProject(projectKey);
    if (component && !project.components.find((list) => list.name === component)) {
      throw new Error(`'${component}' is not a valid JIRA component in project '${projectKey}'`);
    }

    const release = await getOrCreateRelease(client, project, name, releaseUrl);
    console.log(release);
    const requests = [];
    await issueKeys.forEach(async (issue) => {
      requests.push(
        client.updateIssue(issue, createUpdate(release)).then(() => {
          core.info(`Issue ${issue} was updated with fix version`);
        }),
      );
    });
    await Promise.all(requests);

  });
  return true;
};

module.exports = {
  createJiraRelease,
};
