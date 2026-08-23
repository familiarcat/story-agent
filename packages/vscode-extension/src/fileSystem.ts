// src/fileSystem.ts
import * as vscode from 'vscode';

declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Validates that the target relative path stays strictly within the open workspace root.
 */
export function resolveSafeWorkspaceUri(relativePath: string): vscode.Uri {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No open workspace found in VS Code.');
  }

  const normalizedRelativePath = relativePath.replace(/\\/g, '/');
  if (
    normalizedRelativePath.startsWith('/') ||
    normalizedRelativePath.startsWith('\\') ||
    /^[A-Za-z]:\//.test(normalizedRelativePath)
  ) {
    throw new Error(`Security Violation: Path "${relativePath}" is outside the workspace root.`);
  }

  const segments = normalizedRelativePath
    .split('/')
    .filter((segment) => segment && segment !== '.');

  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Security Violation: Path "${relativePath}" is outside the workspace root.`);
  }

  return vscode.Uri.joinPath(workspaceFolder.uri, ...segments);
}

/**
 * Writes a file inside the workspace if local guards allow it.
 */
export async function writeWorkspaceFile(relativePath: string, content: string) {
  // Check local guard configuration
  const config = vscode.workspace.getConfiguration('storyAgent.workspace');
  const enableLocalGuard = config.get<boolean>('enableLocalGuard', true);

  if (enableLocalGuard && process.env.STORY_AGENT_ENV !== 'local') {
    // Optional additional guard logic if needed
  }

  const targetUri = resolveSafeWorkspaceUri(relativePath);

  await vscode.workspace.fs.writeFile(targetUri, Buffer.from(content, 'utf8'));
  return { success: true, path: targetUri.fsPath };
}

/**
 * Reads a file safely from the workspace.
 */
export async function readWorkspaceFile(relativePath: string): Promise<string> {
  const targetUri = resolveSafeWorkspaceUri(relativePath);
  const fileData = await vscode.workspace.fs.readFile(targetUri);
  return Buffer.from(fileData).toString('utf8');
}