import 'dotenv/config';
import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Strategic script to package and install the Sovereign Factory VS Code Extension.
 * This closes the loop for a self-referential system.
 */
async function finalizeVsCodeDeployment() {
  const extensionPath = join(process.cwd(), 'packages', 'vscode-extension');
  console.log('🖖 [BRIDGE] Finalizing VS Code extension deployment...');

  if (!existsSync(extensionPath)) {
    console.error('❌ [BRIDGE] Error: packages/vscode-extension not found. Run Geordi\'s scaffolding mission first.');
    process.exit(1);
  }

  try {
    console.log('🛠️ [ENGINEERING] Synchronizing dependencies and building source...');
    execSync('pnpm install', { stdio: 'inherit' });
    execSync('pnpm --filter story-agent-vscode build', { stdio: 'inherit' });

    console.log('📦 [OPERATIONS] Packaging extension into VSIX...');
    // Note: requires 'vsce' to be installed or available via pnpm
    execSync('pnpm --filter story-agent-vscode package', { stdio: 'inherit' });

    const vsixFile = join(extensionPath, 'story-agent-vscode-1.0.0.vsix');
    if (existsSync(vsixFile)) {
      console.log('🚀 [TACTICAL] Installing extension to local VS Code instance...');
      execSync(`code --install-extension ${vsixFile} --force`, { stdio: 'inherit' });
      
      console.log('\n✅ [BRIDGE] Sovereign Factory VS Code Plugin successfully installed.');
      console.log('🖖 [CREW] You can now open VS Code and use the "Assume Station" command to begin self-referential creation.');
    } else {
      console.error('❌ [BRIDGE] Error: VSIX file not found after packaging.');
    }
  } catch (error) {
    console.error('❌ [CRITICAL] Deployment failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

finalizeVsCodeDeployment().catch(console.error);