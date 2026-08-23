zsh
#!/bin/zsh
# storyagent-chat-styles-setup.zsh
# Run from project root to unify HTML/Markdown rendering styles

echo "🛠️  Configuring universal chat styles..."

# 1. Create CSS file
cat > src/renderer/chat-styles.css << 'EOL'
:root {
  --chat-font-family: system-ui, -apple-system, sans-serif;
  --chat-font-size: 14px;
  --chat-line-height: 1.5;
  --chat-color-text: #333;
  --chat-color-background: #fff;
  --chat-padding: 12px;
  --chat-border-radius: 6px;
  --chat-border: 1px solid #e0e0e0;
  --chat-box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chat-message {
  font-family: var(--chat-font-family);
  font-size: var(--chat-font-size);
  line-height: var(--chat-line-height);
  color: var(--chat-color-text);
  background-color: var(--chat-color-background);
  padding: var(--chat-padding);
  border-radius: var(--chat-border-radius);
  border: var(--chat-border);
  box-shadow: var(--chat-box-shadow);
  margin-bottom: 12px;
}

.chat-message pre {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
}

.chat-message code {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 2px;
}
EOL

# 2. Add Stylelint config
cat > .stylelintrc.json << 'EOL'
{
  "rules": {
    "selector-class-pattern": "^chat-message$",
    "custom-property-pattern": "^chat-"
  }
}
EOL

echo "✅ Style unification files created:"
echo "   - src/renderer/chat-styles.css"
echo "   - .stylelintrc.json"
echo ""
echo "⚠️  Manual steps remaining:"
echo "   1. Import CSS in your renderers"
echo "   2. Update CI to include Stylelint"
echo "   3. Apply .chat-message class to output containers"