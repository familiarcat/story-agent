const IS_LOCAL = process.env.STORY_AGENT_ENV === 'local';

function assertLocalWorkspace() {
  if (!IS_LOCAL) {
    throw new Error(
      '[StoryAgent] File system CRUD is disabled in hosted workspaces. ' +
      'Set STORY_AGENT_ENV=local'
    );
  }
}

module.exports = { assertLocalWorkspace, IS_LOCAL };
