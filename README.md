# RollDev MCP Server

[![npm version](https://badge.fury.io/js/@disrex%2Frolldev-mcp-server.svg)](https://badge.fury.io/js/@disrex%2Frolldev-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/dockergiant/rolldev-mcp-server/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/dockergiant/rolldev-mcp-server/actions/workflows/nodejs-ci.yml)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![RollDev](https://img.shields.io/badge/RollDev-Compatible-blue)](https://rolldev.com)
[![Magento](https://img.shields.io/badge/Magento-2.4.x-orange)](https://magento.com)
[![Docker](https://img.shields.io/badge/Docker-Required-2496ed)](https://docker.com)
[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-green)](https://modelcontextprotocol.io)

A Model Context Protocol (MCP) server for [RollDev](https://docs.rolldev.com) + Magento 2 development environments. This server enables Claude and other LLMs to interact with RollDev projects, manage environments, execute commands, and initialize new Magento 2 projects seamlessly.

## Features

### Environment Management
- **Environment Control**: List, start, and stop RollDev project environments
- **Service Management**: Control RollDev system services (database, Redis, OpenSearch, etc.)
- **Project Initialization**: Create new Magento 2 projects with automatic configuration

### Development Tools
- **Database Operations**: Execute SQL queries directly in project databases
- **PHP Script Execution**: Run PHP scripts within project containers
- **Magento CLI Access**: Execute Magento commands through `roll magento`
- **Composer Integration**: Run Composer commands in project environments

## Prerequisites

- [RollDev](https://rolldev.com) installed and configured
- Node.js 18+
- Active RollDev project environments (for some operations)

## Installation

### Option 1: Using NPM (Recommended)

```json
{
  "mcpServers": {
    "rolldev": {
      "command": "npx",
      "args": [
        "-y",
        "@disrex/rolldev-mcp-server"
      ]
    }
  }
}
```

Add this configuration to your Claude for Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Option 2: Manual Setup

1. Clone this repository:
```bash
git clone https://github.com/dockergiant/rolldev-mcp-server.git
cd rolldev-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Add to Claude configuration:
```json
{
  "mcpServers": {
    "rolldev": {
      "command": "node",
      "args": ["/path/to/rolldev-mcp-server/server.js"]
    }
  }
}
```

## Available Tools

### rolldev_list_environments
Lists all running RollDev environments with structured information including project names, paths, URLs, Docker networks, and container counts.

### rolldev_start_project
Starts a RollDev project environment.
- **project_path**: Path to the project directory

### rolldev_stop_project  
Stops a RollDev project environment.
- **project_path**: Path to the project directory

### rolldev_start_svc
Starts RollDev system services.
- **project_path**: Path to the project directory

### rolldev_stop_svc
Stops RollDev system services.
- **project_path**: Path to the project directory

### rolldev_db_query
Executes SQL queries in project databases.
- **project_path**: Path to the project directory
- **query**: SQL query to execute
- **database**: Database name (optional, defaults to "magento")

### rolldev_php_script
Runs PHP scripts inside project containers.
- **project_path**: Path to the project directory  
- **script_path**: Path to PHP script relative to project root
- **args**: Additional arguments (optional)

### rolldev_magento_cli
Executes Magento CLI commands.
- **project_path**: Path to the project directory
- **command**: Magento command (without 'bin/magento' prefix)
- **args**: Additional arguments (optional)

### rolldev_composer
Runs Composer commands in project environments.
- **project_path**: Path to the project directory
- **command**: Composer command (e.g., "install", "update", "require symfony/console")

### rolldev_magento2_init
Initializes new Magento 2 projects with automatic configuration.
- **project_name**: Project name (lowercase, letters, numbers, hyphens only)
- **magento_version**: Magento version (optional, defaults to "2.4.x")
- **target_directory**: Target directory (optional, defaults to current directory)

## Examples

Here are some example interactions you can try with Claude after setting up the RollDev MCP server:

### Basic Environment Management
1. "Can you list all my RollDev environments?"
2. "Start the project at /path/to/my-magento-project"
3. "Stop the services for my current project"

### Database Operations
4. "Run the query 'SELECT * FROM admin_user LIMIT 5' in my project"
5. "Show me all enabled modules in the database"
6. "Check the current configuration values for my store"

### Magento Development
7. "Execute 'cache:flush' Magento command in my project"
8. "Run 'setup:upgrade' on my Magento installation"
9. "List all available Magento CLI commands"

### Project Initialization
10. "Initialize a new Magento 2.4.7 project called 'my-store'"
11. "Create a Magento project with the latest version in /Users/dev/projects"

### Composer Operations
12. "Install dependencies with Composer in my project"
13. "Require the symfony/console package in my project"

## Development

```bash
# Start in development mode with debugging
npm run dev

# Run tests
npm test
```

## Testing

You can test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node server.js
```

## Contributing

1. Fork the repository from [dockergiant/rolldev-mcp-server](https://github.com/dockergiant/rolldev-mcp-server)
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues section](https://github.com/dockergiant/rolldev-mcp-server/issues)
2. Consult the MCP documentation at [modelcontextprotocol.io](https://modelcontextprotocol.io)
3. Open a new issue with detailed reproduction steps



<img src="https://files.disrex.nl/disrex-character.gif?t=572693425" alt="Disrex T-Rex Mascot Waving" width="150">

---

## Sponsored by

<picture>
  <source srcset="https://files.disrex.nl/logos/logo-w.png" media="(prefers-color-scheme: dark)">
  <img src="https://files.disrex.nl/logos/logo-b.png" alt="Disrex Logo" width="200">
</picture>