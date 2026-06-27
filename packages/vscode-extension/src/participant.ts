import * as vscode from 'vscode';
import { fetchAhaStory } from './aha';
import { buildObservationLoungeBrief } from './brief';
import { runAssistantTurn, resetSession } from './chatEngine';
import { runAgentTurn, renderSymphonyPanel, runChatTurn, fetchAhaHierarchy } from './agentClient';
import { gatherChatContext } from './contextProvider';

const PARTICIPANT_ID = 'story-agent.agent';

function extractStoryInput(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (urlMatch) return urlMatch[0];

  const keyMatch = trimmed.match(/\b([A-Za-z][A-Za-z0-9_]*-\d+)\b/);
  if (keyMatch) return keyMatch[1];

  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken && !firstToken.includes('/')) return firstToken;

  return undefined;
}

function extractRepo(text: string): string | undefined {
  const m = text.match(/\b([\w.-]+\/[\w.-]+)\b/);
  return m && !m[1].startsWith('.') ? m[1] : undefined;
}

/** Flatten VS Code ChatContext.history into {role,content} turns for the /chat brain (last 8). */
function extractChatHistory(ctx: vscode.ChatContext): Array<{ role: string; content: string }> {
  const out: Array<{ role: string; content: string }> = [];
  for (const turn of ctx.history ?? []) {
    if (turn instanceof vscode.ChatRequestTurn) {
      if (turn.prompt?.trim()) out.push({ role: 'user', content: turn.prompt.trim().slice(0, 4000) });
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .map((p: any) => (p?.value?.value ?? p?.value ?? '')).filter((s: any) => typeof s === 'string').join('');
      if (text.trim()) out.push({ role: 'assistant', content: text.trim().slice(0, 4000) });
    }
  }
  return out.slice(-8);
}

const META_REF = 'referenceNum';
const META_REPO = 'repoFullName';
const META_CMD = 'lastCommand';

export function registerParticipant(context: vscode.ExtensionContext): void {
  const participant = vscode.chat.createChatParticipant(
    PARTICIPANT_ID,
    async (
      request: vscode.ChatRequest,
      chatCtx: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ): Promise<vscode.ChatResult | void> => {
      const cmd = request.command;
      const prompt = request.prompt.trim();

      if (cmd === 'dashboard') {
        stream.markdown('Opening Story Agent dashboard.\n\n');
        stream.button({ command: 'story-agent.openDashboard', title: '$(browser) Open Dashboard' });
        stream.button({ command: 'story-agent.openObservationLounge', title: '$(eye) Open Observation Lounge' });
        return { metadata: { [META_CMD]: 'dashboard' } };
      }

      if (cmd === 'reset') {
        resetSession();
        stream.markdown('🔄 Session token ledger reset. The token budget meter starts fresh.');
        return { metadata: { [META_CMD]: 'reset' } };
      }

      if (cmd === 'prepare') {
        const referenceNum = extractStoryInput(prompt);
        const repoFullName = extractRepo(prompt);

        if (!referenceNum) {
          stream.markdown(
            '## Observation Lounge — Step 1 of 3\n\nProvide the story mission input (Aha key like `STORY-123` or full Aha URL).'
          );
          return { metadata: { [META_CMD]: 'prepare-step1' } };
        }

        if (!repoFullName) {
          stream.markdown(
            `## Observation Lounge — Step 2 of 3\n\nStory: \`${referenceNum}\`\n\n` +
            `What is the target GitHub repository? (e.g. \`client-int/product-profile-ui\`)`
          );
          return { metadata: { [META_CMD]: 'prepare-step2', [META_REF]: referenceNum } };
        }

        stream.markdown(`## Observation Lounge — Loading \`${referenceNum}\`\n\n`);
        stream.progress(`Fetching story ${referenceNum} from Aha…`);

        try {
          const story = await fetchAhaStory(referenceNum, token);
          const brief = buildObservationLoungeBrief(story, { repoFullName, targetBranch: 'dev' });

          stream.markdown(
            `## ✅ ${story.referenceNum}: ${story.name}\n\n` +
            `| Field | Value |\n|---|---|\n` +
            `| **Status** | ${story.workflowStatus} |\n` +
            `| **Repository** | \`${repoFullName}\` |\n` +
            `| **Aha** | [Open story ↗](${story.url}) |\n\n` +
            `### Description\n\n${story.description || '_No description in Aha._'}\n\n` +
            `### Acceptance Criteria\n\n${story.acceptanceCriteria || '_No criteria defined in Aha._'}\n\n` +
            `---\n\n**Execution brief ready.** Review above, fill in any \`{{PLACEHOLDER}}\` values, then copy the kickoff prompt.\n\n`
          );

          stream.button({ command: 'story-agent.copyToClipboard', title: '$(clippy) Copy Kickoff Prompt', arguments: [brief] });
          stream.button({ command: 'story-agent.openObservationLounge', title: '$(eye) Open Observation Lounge UI' });
          stream.button({ command: 'story-agent.openDashboard', title: '$(browser) Open Dashboard' });

          return { metadata: { [META_CMD]: 'prepare-done', [META_REF]: referenceNum, [META_REPO]: repoFullName } };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          stream.markdown(`**Error loading story from Aha:**\n\n\`\`\`\n${msg}\n\`\`\`\n\nCheck \`AHA_DOMAIN\` and \`AHA_API_KEY\` in your environment or VS Code settings.\n`);
          stream.button({ command: 'workbench.action.openSettings', title: '$(gear) Open Story Agent Settings', arguments: ['storyAgent'] });
          return { metadata: { [META_CMD]: 'prepare-error' } };
        }
      }

      if (cmd === 'status') {
        const referenceNum = extractStoryInput(prompt);
        if (!referenceNum) {
          stream.markdown('Provide a story key or URL: `/status STORY-123`');
          return { metadata: { [META_CMD]: 'status-missing' } };
        }
        stream.markdown(`Checking status of \`${referenceNum}\`…\n\nThe dashboard shows full lifecycle status.\n`);
        stream.button({ command: 'story-agent.openDashboard', title: '$(browser) Open Dashboard' });
        return { metadata: { [META_CMD]: 'status', [META_REF]: referenceNum } };
      }

      // Layer-5 posture panel (/symphony) → live firm→client→project + WorfGate + tools snapshot.
      if (cmd === 'symphony') {
        await renderSymphonyPanel(stream);
        return { metadata: { [META_CMD]: 'symphony' } };
      }

      // Autonomous agentic mode (/agent) → tool-calling loop over agent-core (CLI/API/VS Code share it).
      if (cmd === 'agent') {
        if (!prompt.length) {
          stream.markdown('Describe a task for the autonomous crew, e.g. `/agent fix the failing test in src/foo.ts and run the suite`. Attach files or add `codebase: <query>` for context.');
          return { metadata: { [META_CMD]: 'agent-missing' } };
        }
        const ctx = await gatherChatContext(request, token);
        if (ctx.note) stream.markdown(`${ctx.note}\n\n`);
        const result = await runAgentTurn(ctx.contextBlock + (ctx.prompt || prompt), stream, token);
        // Multi-file diff review: let the user inspect / revert the agent's edits per file.
        stream.button({ command: 'story-agent.reviewChanges', title: '$(diff) Review changes (accept/reject per file)' });
        return { metadata: { [META_CMD]: 'agent', escalated: result.escalated } };
      }

      // Plan mode (/plan) → agent-core proposes an ordered plan, no file edits. Parity with
      // Claude Code / Copilot "plan" so you review before executing.
      if (cmd === 'plan') {
        if (!prompt.length) {
          stream.markdown('Describe what to plan, e.g. `/plan add pagination to the stories API and update the dashboard`.');
          return { metadata: { [META_CMD]: 'plan-missing' } };
        }
        const pctx = await gatherChatContext(request, token);
        if (pctx.note) stream.markdown(`${pctx.note}\n\n`);
        const ahaTree = await fetchAhaHierarchy(token);
        if (ahaTree) stream.markdown(ahaTree + '\n\n');
        const planPrompt = `${pctx.contextBlock}${ahaTree ? ahaTree + '\n\n' : ''}PLAN MODE (project-management aware) — do NOT edit files or run mutating commands. Read the codebase as needed and produce a concise, ordered implementation plan (numbered steps, files to touch, risks). Map the work onto the Aha hierarchy above: state which firm → client → project → epic → story this belongs under, or propose a NEW story/branch (as a gated dry-run the user can confirm) if none fits. Plan for:\n\n${pctx.prompt || prompt}`;
        const result = await runAgentTurn(planPrompt, stream, token, { toolPolicy: 'read-only' });
        stream.button({ command: 'story-agent.openObservationLounge', title: '$(eye) Open Observation Lounge' });
        return { metadata: { [META_CMD]: 'plan', escalated: result.escalated } };
      }

      // Review mode (/review) → agent-core reviews the working diff, read-only.
      if (cmd === 'review') {
        const focus = prompt.length ? `\n\nFocus areas: ${prompt}` : '';
        const reviewPrompt = `CODE REVIEW — read-only. Run git_status and git_diff to inspect the current working changes, then review them for bugs, security issues, and clarity. Do NOT edit files.${focus}`;
        const result = await runAgentTurn(reviewPrompt, stream, token, { toolPolicy: 'read-only' });
        return { metadata: { [META_CMD]: 'review', escalated: result.escalated } };
      }

      // Free-form chat (/ask or any non-command prompt) → token-optimizing assistant (single-shot)
      if (cmd === 'ask' || prompt.length > 0) {
        const actx = await gatherChatContext(request, token);
        if (actx.note) stream.markdown(`${actx.note}\n\n`);
        const msg = actx.contextBlock + (actx.prompt || prompt);
        // Multi-turn: pass recent conversation from the chat session so the brain has memory.
        const history = extractChatHistory(chatCtx);
        // Default to the canonical crew brain (/chat → Quark-optimized model selection); fall back to
        // the in-editor token-optimizing assistant if the brain is unreachable.
        const chat = await runChatTurn(msg, stream, token, history);
        if (chat.ok) return { metadata: { [META_CMD]: 'ask', model: chat.model } };
        const result = await runAssistantTurn(msg, stream, token, context.globalState);
        return { metadata: { [META_CMD]: 'ask', tier: result.tier, cached: result.cached } };
      }

      // Empty prompt → help
      stream.markdown(
        `## Story Agent\n\n` +
        `Ask me anything — I'm a token-optimizing assistant (model tiering, prompt caching, RAG context pruning, live token meter).\n\n` +
        `| Command | What it does |\n|---|---|\n` +
        `| _(just type)_ | Chat with the assistant — simple turns use a cheap model, complex turns a capable one |\n` +
        `| \`/ask <question>\` | Same as typing — explicit chat |\n` +
        `| \`/agent <task>\` | Autonomous mode — reads/edits files & runs commands via agent-core |\n` +
        `| \`/plan <task>\` | Plan mode — ordered plan, no edits (review before executing) |\n` +
        `| \`/review\` | Review the current working changes (git diff), read-only |\n` +
        `| \`/reset\` | Reset the session token budget meter |\n` +
        `| \`/prepare STORY-####\` | Load story mission from Aha, generate Observation Lounge brief |\n` +
        `| \`/status STORY-####\` | Check tracked story status |\n` +
        `| \`/dashboard\` | Open the Story Agent web UI |\n`
      );
      stream.button({ command: 'story-agent.openDashboard', title: '$(browser) Open Dashboard' });
      return { metadata: { [META_CMD]: 'help' } };
    }
  );

  participant.followupProvider = {
    provideFollowups(result: vscode.ChatResult, _ctx: vscode.ChatContext, _token: vscode.CancellationToken): vscode.ChatFollowup[] {
      const meta = result.metadata ?? {};
      const ref = meta[META_REF] as string | undefined;
      const repo = meta[META_REPO] as string | undefined;
      const last = meta[META_CMD] as string | undefined;

      if (last === 'prepare-step1') return [{ prompt: '/prepare STORY-123', label: 'e.g. /prepare STORY-123', participant: PARTICIPANT_ID }];
      if (last === 'prepare-step2' && ref) return [{ prompt: `/prepare ${ref} client-int/product-profile-ui`, label: `${ref} → specify repo`, participant: PARTICIPANT_ID }];
      if (last === 'prepare-done' && ref) return [
        { prompt: '/dashboard', label: 'Open dashboard', participant: PARTICIPANT_ID },
        { prompt: `/status ${ref}`, label: `Check status of ${ref}`, participant: PARTICIPANT_ID },
      ];
      if (last === 'status' && ref) return [{ prompt: repo ? `/prepare ${ref} ${repo}` : `/prepare ${ref}`, label: `Prepare ${ref}`, participant: PARTICIPANT_ID }];
      if (last === 'plan') return [{ prompt: '/agent ', label: '$(play) Execute this plan with /agent', participant: PARTICIPANT_ID }];
      if (last === 'help') return [
        { prompt: '/prepare STORY-123', label: '/prepare — start a story mission', participant: PARTICIPANT_ID },
        { prompt: '/dashboard', label: '/dashboard — open web UI', participant: PARTICIPANT_ID },
      ];
      return [];
    },
  };

  participant.iconPath = new vscode.ThemeIcon('beaker');
  context.subscriptions.push(participant);
}
