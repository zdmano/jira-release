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

const getOrCreateRelease = async (client, { key, id }, name) => {
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
    description: 'Created by GitHub Actions.',
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
  jiraKeys
}) => {
  const client = new JiraClient({
    protocol,
    host,
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD,
    apiVersion: '2',
    strictSSL: protocol === 'https',
  });

  const issueKeys = new Set(String(jiraKeys).split(","));

  var projectKeys = new Set();
  
  for (const issue of issueKeys) {
    const[prjKey] = issue.split('-'); 
    projectKeys.add(prjKey)
  }
  console.log(`Found the following Jira projects ${[...projectKeys]}`);
  console.log(`found the following Jira keys ${[...issueKeys]}`);

  for(prjKey in projectKeys) {
    const name = releaseName(prjKey, component, version);

    const project = await client.getProject(prjKey);
    if (component && !project.components.find((list) => list.name === component)) {
      throw new Error(`'${component}' is not a valid JIRA component in project '${projectKey}'`);
    }
  
    const release = await getOrCreateRelease(client, project, name);
    console.log(JSON.parse(release));
    const requests = [];
    for(issue in issueKeys) {
      requests.push(
        client.updateIssue(issue, createUpdate(release)).then(() => {
          core.info(`Issue ${issue} was updated with fix version`);
        }),
      );
    }
    await Promise.all(requests)

  }






  // const changes = await findJiraChanges(projectKey);
  // Object.keys(changes).forEach((issueKey) => {

  // });
  // await Promise.all(requests);

  // if (!release.released && publishVersion) {
  //   core.info(`Release version ${name}`);
  //   await client.updateVersion({
  //     id: release.id,
  //     projectId: release.projectId,
  //     releaseDate: new Date().toISOString().split('T')[0],
  //     released: true,
  //   }).then(() => {
  //     core.info(`Version ${name} is now released`);
  //   }).catch((err) => {
  //     core.error(`Failed to release version ${name}. It must be manually released in JIRA. Reason: ${err.message}`);
  //     return null;
  //   });
  // } else {
  //   core.warning(`Version ${name} was already released in JIRA or publish option is false`);
  // }

  // Return the release name
  return true;
};

module.exports = {
  createJiraRelease,
};
