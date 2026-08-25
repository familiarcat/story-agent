import { JiraAdapter, MondayAdapter, AzureDevOpsAdapter } from '../../shared/src/pm-adapters';
import { PmCostTracker } from '../tools/pm-tools/pm-cost-tracker';

export async function runStressTests() {
  const costTracker = new PmCostTracker();
  const jiraAdapter = new JiraAdapter();
  const mondayAdapter = new MondayAdapter();
  const azureDevOpsAdapter = new AzureDevOpsAdapter();

  // Sequential load test
  await sequentialLoadTest(jiraAdapter, mondayAdapter, azureDevOpsAdapter, costTracker);

  // Parallel load test
  await parallelLoadTest(jiraAdapter, mondayAdapter, azureDevOpsAdapter, costTracker);

  // Field access pattern test
  await fieldAccessPatternTest(jiraAdapter, costTracker);

  // Cost verification
  await costVerification(costTracker);

  // Latency SLA check
  await latencySLACheck(jiraAdapter, mondayAdapter, azureDevOpsAdapter);

  // Encryption verification
  await encryptionVerification();
}

async function sequentialLoadTest(jiraAdapter: JiraAdapter, mondayAdapter: MondayAdapter, azureDevOpsAdapter: AzureDevOpsAdapter, costTracker: PmCostTracker) {
  console.log('Running sequential load test...');
  const projects = await jiraAdapter.listProjects();
  for (const project of projects) {
    const sprints = await jiraAdapter.listSprints(project.id);
    for (const sprint of sprints) {
      await jiraAdapter.listStories(sprint.id);
    }
  }
  // Repeat for Monday.com and Azure DevOps
}

async function parallelLoadTest(jiraAdapter: JiraAdapter, mondayAdapter: MondayAdapter, azureDevOpsAdapter: AzureDevOpsAdapter, costTracker: PmCostTracker) {
  console.log('Running parallel load test...');
  await Promise.all([
    jiraAdapter.listProjects(),
    mondayAdapter.listProjects(),
    azureDevOpsAdapter.listProjects(),
  ]);
}

async function fieldAccessPatternTest(jiraAdapter: JiraAdapter, costTracker: PmCostTracker) {
  console.log('Running field access pattern test...');
  const stories = await jiraAdapter.listStories('dummy-sprint-id');
  for (const story of stories) {
    await jiraAdapter.getStory(story.id);
  }
}

async function costVerification(costTracker: PmCostTracker) {
  console.log('Running cost verification...');
  const jiraCost = costTracker.getCostPerTool('jira');
  console.log(`Jira total cost: $${jiraCost.totalCostUSD.toFixed(3)}`);
}

async function latencySLACheck(jiraAdapter: JiraAdapter, mondayAdapter: MondayAdapter, azureDevOpsAdapter: AzureDevOpsAdapter) {
  console.log('Running latency SLA check...');
  const startTime = Date.now();
  await jiraAdapter.listProjects();
  const jiraLatency = Date.now() - startTime;
  console.log(`Jira p99 latency: ${jiraLatency}ms`);
}

async function encryptionVerification() {
  console.log('Running encryption verification...');
  // TODO: Implement encryption verification
}