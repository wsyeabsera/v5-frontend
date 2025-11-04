# Tool Categories

Complete list of all available tools categorized by purpose.

## Tool Management

Tools for managing tools stored in the database.

- `add_tool` - Add a new tool to the database
- `get_tool` - Get a tool by name
- `list_tools` - List all tools with optional filters
- `update_tool` - Update a tool
- `remove_tool` - Remove a tool from database

See [Tool Management Documentation](./categories/tool-management.md)

## Tool Execution

Tools for executing remote MCP tools.

- `execute_mcp_tool` - Execute a tool on the remote MCP server

See [Tool Execution Documentation](./categories/tool-execution.md)

## Model Management

Tools for managing available AI models.

- `add_available_model` - Add a new available model to the database
- `get_available_model` - Get an available model by ID
- `list_available_models` - List all available models with optional filters
- `update_available_model` - Update an available model
- `remove_available_model` - Remove an available model from database

See [Model Management Documentation](./categories/model-management.md)

## Agent Config Management

Tools for managing agent configurations (API keys, token limits, enabled status).

- `add_agent_config` - Add a new agent config to the database
- `get_agent_config` - Get an agent config by ID
- `list_agent_configs` - List all agent configs with optional filters
- `update_agent_config` - Update an agent config
- `remove_agent_config` - Remove an agent config from database

See [Agent Config Documentation](./categories/agent-config.md)

## Prompt Management

Tools for managing prompts stored in the database.

- `add_prompt` - Add a new prompt to the database
- `get_prompt` - Get a prompt by name
- `list_prompts` - List all prompts with optional filters
- `update_prompt` - Update a prompt
- `remove_prompt` - Remove a prompt from database

See [Prompt Management Documentation](./categories/prompt-management.md)

## Resource Management

Tools for managing resources (URIs, files, etc.).

- `add_resource` - Add a new resource to the database
- `get_resource` - Get a resource by URI
- `list_resources` - List all resources with optional filters
- `update_resource` - Update a resource
- `remove_resource` - Remove a resource from database

See [Resource Management Documentation](./categories/resource-management.md)

## Search & Discovery

Semantic search tools to find tools and prompts by natural language.

- `get_tool_for_user_prompt` - Get the best tool(s) for a user query using semantic search
- `get_prompt_for_user_prompt` - Get the best prompt(s) for a user query using semantic search

See [Search & Discovery Documentation](./categories/search-discovery.md)

## Initialization

Tools for initializing the database with tools and prompts from remote server.

- `init_tools` - Initialize database by fetching tools from remote MCP server and seeding local database
- `init_prompts` - Initialize database by fetching prompts from remote MCP server and seeding local database

See [Initialization Documentation](./categories/initialization.md)

