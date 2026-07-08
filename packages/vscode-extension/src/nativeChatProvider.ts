import * as vscode from 'vscode';
import { chatWithCrew } from './agentClient';

const VENDOR = 'story-agent';
const MODEL_ID = 'story-agent/crew-chat';
const MODEL_INFO: vscode.LanguageModelChatInformation = {
  id: MODEL_ID,
  name: 'Story Agent Crew',
  family: 'story-agent',
  version: '1.0.0',
  tooltip: 'Canonical Story Agent crew chat routed through the server-side /chat brain.',
  detail: 'Quark-selected OpenRouter model with crew memory and server-side policy controls.',
  maxInputTokens: 128_000,
  maxOutputTokens: 4_096,
  capabilities: {
    toolCalling: false,
    imageInput: false,
  },
};

function flattenParts(parts: readonly (vscode.LanguageModelInputPart | unknown)[]): string {
  return parts
    .map((part) => part instanceof vscode.LanguageModelTextPart ? part.value : '')
    .join('')
    .trim();
}

function normalizeMessages(messages: readonly vscode.LanguageModelChatRequestMessage[]): { message: string; history: Array<{ role: 'user' | 'assistant'; content: string }> } | null {
  const normalized = messages
    .map((message) => ({
      role: message.role === vscode.LanguageModelChatMessageRole.Assistant ? 'assistant' as const : 'user' as const,
      content: flattenParts(message.content),
    }))
    .filter((message) => message.content.length > 0);

  const lastUserIndex = [...normalized].map((message) => message.role).lastIndexOf('user');
  if (lastUserIndex < 0) return null;

  return {
    message: normalized[lastUserIndex].content,
    history: normalized.slice(0, lastUserIndex),
  };
}

class StoryAgentNativeChatProvider implements vscode.LanguageModelChatProvider<vscode.LanguageModelChatInformation> {
  provideLanguageModelChatInformation(): vscode.ProviderResult<vscode.LanguageModelChatInformation[]> {
    return [MODEL_INFO];
  }

  async provideLanguageModelChatResponse(
    _model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    _options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const normalized = normalizeMessages(messages);
    if (!normalized) {
      progress.report(new vscode.LanguageModelTextPart('Story Agent: at least one user text message is required.'));
      return;
    }

    const clientId = process.env.STORY_AGENT_CLIENT_ID || vscode.workspace.getConfiguration('storyAgent').get<string>('chat.clientId') || null;
    const result = await chatWithCrew(normalized.message, { clientId, history: normalized.history });
    if (token.isCancellationRequested) return;
    if (!result.ok) throw new Error('Story Agent chat brain unreachable. Start the local agent service or configure storyAgent.chat.agentServiceUrl.');
    const tail = result.costAnalysis
      ? `\n\n[Story Agent cost] total=$${result.costAnalysis.totalCostUSD.toFixed(5)} chat=$${result.costAnalysis.chatCostUSD.toFixed(5)} crew=$${result.costAnalysis.crewPreparationCostUSD.toFixed(5)} tok=${result.costAnalysis.totalTokens}`
      : '';
    progress.report(new vscode.LanguageModelTextPart((result.answer ?? '') + tail));
  }

  async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    if (typeof text === 'string') return Math.ceil(text.length / 4);
    return Math.ceil(flattenParts(text.content).length / 4);
  }
}

export function registerNativeChatProvider(context: vscode.ExtensionContext): void {
  const enabled = vscode.workspace.getConfiguration('storyAgent').get<boolean>('chat.nativeProviderEnabled') ?? false;
  const api = (vscode as typeof vscode & {
    lm?: typeof vscode.lm & {
      registerLanguageModelChatProvider?: (vendor: string, provider: vscode.LanguageModelChatProvider<vscode.LanguageModelChatInformation>) => vscode.Disposable;
    };
  }).lm;

  if (!enabled || typeof api?.registerLanguageModelChatProvider !== 'function') return;
  context.subscriptions.push(api.registerLanguageModelChatProvider(VENDOR, new StoryAgentNativeChatProvider()));
}