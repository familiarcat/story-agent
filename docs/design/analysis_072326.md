flowchart TD
Editor --> StoryAgent

StoryAgent --> ContextEngine
StoryAgent --> CrewManager
StoryAgent --> MCPServer
StoryAgent --> PromptBuilder

ContextEngine --> RepositoryIndex
CrewManager --> Planner
CrewManager --> Architect
CrewManager --> Coder
CrewManager --> Reviewer
CrewManager --> Researcher

PromptBuilder --> OpenRouter
OpenRouter --> Claude
OpenRouter --> GPT5
OpenRouter --> Gemini
OpenRouter --> DeepSeek
OpenRouter --> Qwen