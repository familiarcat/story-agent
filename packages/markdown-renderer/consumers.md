# Markdown Consumers Inventory

## Chat Context
- **File**: `packages/ui/app/chat/ChatMessage.tsx`
  - **Usage**: Renders markdown in chat messages.

## Vision Context
- **File**: `packages/ui/app/vision/VisionPanel.tsx`
  - **Usage**: Renders markdown for vision-related explanations.

## Dashboard Components
- **File**: `packages/ui/components/DashboardCard.tsx`
  - **Usage**: Renders markdown in dashboard cards for descriptions.

## Extension
- **File**: `packages/vscode-extension/src/extension.ts`
  - **Usage**: Renders markdown in the extension's hover tooltips and documentation panels.

## Notes
- All current implementations use basic markdown-to-html converters without theme support or robust sanitization.