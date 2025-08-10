#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn, execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

class RollDevServer {
  constructor() {
    this.server = new Server(
      {
        name: "rolldev-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "rolldev_list_environments",
            description:
              "List all running RollDev environments with their directories (returns structured JSON)",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "rolldev_start_project",
            description: "Start a RollDev project environment",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
              },
              required: ["project_path"],
            },
          },
          {
            name: "rolldev_stop_project",
            description: "Stop a RollDev project environment",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
              },
              required: ["project_path"],
            },
          },
          {
            name: "rolldev_start_svc",
            description: "Start RollDev system services",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
              },
              required: ["project_path"],
            },
          },
          {
            name: "rolldev_stop_svc",
            description: "Stop RollDev system services",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
              },
              required: ["project_path"],
            },
          },
          {
            name: "rolldev_db_query",
            description: "Run a SQL query in the RollDev database",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
                query: {
                  type: "string",
                  description: "SQL query to execute",
                },
                database: {
                  type: "string",
                  description: "Database name (optional, defaults to magento)",
                  default: "magento",
                },
              },
              required: ["project_path", "query"],
            },
          },
          {
            name: "rolldev_php_script",
            description: "Run a PHP script inside the php-fpm container",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
                script_path: {
                  type: "string",
                  description:
                    "Path to the PHP script relative to project root",
                },
                args: {
                  type: "array",
                  description: "Additional arguments to pass to the script",
                  items: {
                    type: "string",
                  },
                  default: [],
                },
              },
              required: ["project_path", "script_path"],
            },
          },
          {
            name: "rolldev_magento_cli",
            description: "Run roll magento command inside the php-fpm container",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
                command: {
                  type: "string",
                  description:
                    "Magento CLI command (without 'bin/magento' prefix)",
                },
                args: {
                  type: "array",
                  description: "Additional arguments for the command",
                  items: {
                    type: "string",
                  },
                  default: [],
                },
              },
              required: ["project_path", "command"],
            },
          },

          {
            name: "rolldev_composer",
            description: "Run Composer commands inside the php-fpm container",
            inputSchema: {
              type: "object",
              properties: {
                project_path: {
                  type: "string",
                  description: "Path to the project directory",
                },
                command: {
                  type: "string",
                  description:
                    "Composer command to execute (e.g., 'install', 'update', 'require symfony/console', 'require-commerce')",
                },
              },
              required: ["project_path", "command"],
            },
          },
          {
            name: "rolldev_magento2_init",
            description:
              "Initialize a new Magento 2 project using RollDev's magento2-init command with automatic version configuration",
            inputSchema: {
              type: "object",
              properties: {
                project_name: {
                  type: "string",
                  description: "Name of the Magento 2 project (lowercase letters, numbers, and hyphens only)",
                },
                magento_version: {
                  type: "string",
                  description: "Magento version to install (default: 2.4.x). Examples: 2.4.x, 2.4.7, 2.4.7-p3, 2.4.8",
                  default: "2.4.x",
                },
                target_directory: {
                  type: "string",
                  description: "Directory to create project in (optional, defaults to current directory). Project will be created in a subdirectory named after the project.",
                  default: "",
                },
              },
              required: ["project_name"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "rolldev_list_environments":
          return await this.listEnvironments();
        case "rolldev_start_project":
          return await this.startProject(request.params.arguments);
        case "rolldev_stop_project":
          return await this.stopProject(request.params.arguments);
        case "rolldev_start_svc":
          return await this.startSvc(request.params.arguments);
        case "rolldev_stop_svc":
          return await this.stopSvc(request.params.arguments);
        case "rolldev_db_query":
          return await this.runDbQuery(request.params.arguments);
        case "rolldev_php_script":
          return await this.runPhpScript(request.params.arguments);
        case "rolldev_magento_cli":
          return await this.runMagentoCli(request.params.arguments);

        case "rolldev_composer":
          return await this.runComposer(request.params.arguments);
        case "rolldev_magento2_init":
          return await this.magento2Init(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async listEnvironments() {
    try {
      const result = await this.executeCommand(
        "roll",
        ["status"],
        process.cwd(),
      );

      if (result.code === 0) {
        const environments = this.parseEnvironmentList(result.stdout);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  command: "roll status",
                  exit_code: result.code,
                  environments: environments.map((env) => ({
                    name: env.name,
                    path: env.path,
                    url: env.url,
                    network: env.network,
                    containers: env.containers,
                  })),
                  raw_output: result.stdout,
                },
                null,
                2,
              ),
            },
          ],
          isError: false,
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  command: "roll status",
                  exit_code: result.code,
                  environments: [],
                  error: result.stderr || "Unknown error",
                  raw_output: result.stdout,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                command: "roll status",
                exit_code: -1,
                environments: [],
                error: error.message,
                raw_output: error.stdout || "",
                raw_errors: error.stderr || "",
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  }

  parseEnvironmentList(output) {
    const environments = [];
    const lines = output.split("\n");

    let currentProject = null;
    let currentPath = null;
    let currentUrl = null;
    let currentNetwork = null;
    let currentContainers = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and headers
      if (
        !trimmed ||
        trimmed.includes("No running environments found") ||
        trimmed.includes("Found the following") ||
        trimmed.includes("RollDev Services")
      ) {
        continue;
      }

      // Remove ANSI color codes for parsing
      const cleanLine = trimmed.replace(/\x1b\[[0-9;]*m/g, "");

      // Look for project name pattern: "ai-demo a magento2 project"
      const projectMatch = cleanLine.match(/^(\S+)\s+a\s+(\w+)\s+project$/);
      if (projectMatch) {
        currentProject = projectMatch[1];
        continue;
      }

      // Look for project directory pattern: "Project Directory: /path/to/project"
      const directoryMatch = cleanLine.match(/^\s*Project Directory:\s*(.+)$/);
      if (directoryMatch) {
        currentPath = directoryMatch[1];
        continue;
      }

      // Look for project URL pattern: "Project URL: https://app.ai-demo.test"
      const urlMatch = cleanLine.match(/^\s*Project URL:\s*(.+)$/);
      if (urlMatch) {
        currentUrl = urlMatch[1];
        continue;
      }

      // Look for docker network pattern: "Docker Network: ai-demo_default"
      const networkMatch = cleanLine.match(/^\s*Docker Network:\s*(.+)$/);
      if (networkMatch) {
        currentNetwork = networkMatch[1];
        continue;
      }

      // Look for containers running pattern: "Containers Running: 9"
      const containersMatch = cleanLine.match(/^\s*Containers Running:\s*(\d+)$/);
      if (containersMatch && currentProject) {
        currentContainers = parseInt(containersMatch[1]);

        // Add the environment when we have complete information
        environments.push({
          name: currentProject,
          path: currentPath,
          url: currentUrl,
          network: currentNetwork,
          containers: currentContainers,
          raw: line,
        });

        // Reset for next project
        currentProject = null;
        currentPath = null;
        currentUrl = null;
        currentNetwork = null;
        currentContainers = null;
        continue;
      }

      // Stop parsing when we hit the services section
      if (cleanLine.includes("NAME") && cleanLine.includes("STATE")) {
        break;
      }
    }

    return environments;
  }

  /**
   * Helper function to get environment list for internal use by other tools
   * Returns a simplified array of {name, path} objects
   */
  async getEnvironmentList() {
    try {
      const result = await this.executeCommand(
        "roll",
        ["status"],
        process.cwd(),
      );

      if (result.code === 0) {
        const environments = this.parseEnvironmentList(result.stdout);
        return environments.map((env) => ({
          name: env.name,
          path: env.path,
        }));
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  async startProject(args) {
    const { project_path } = args;
    return await this.executeRollCommand(
      project_path,
      ["env", "up"],
      "Starting RollDev project environment",
    );
  }

  async stopProject(args) {
    const { project_path } = args;
    return await this.executeRollCommand(
      project_path,
      ["env", "down"],
      "Stopping RollDev project environment",
    );
  }

  async startSvc(args) {
    const { project_path } = args;
    return await this.executeRollCommand(
      project_path,
      ["svc", "up"],
      "Starting RollDev system services",
    );
  }

  async stopSvc(args) {
    const { project_path } = args;
    return await this.executeRollCommand(
      project_path,
      ["svc", "down"],
      "Stopping RollDev system services",
    );
  }

  async runDbQuery(args) {
    const { project_path, query, database = "magento" } = args;

    const rollCommand = [
      "db",
      "-e",
      query,
    ];

    return await this.executeRollCommand(
      project_path,
      rollCommand,
      `Running database query in ${database}`,
    );
  }

  async runPhpScript(args) {
    const { project_path, script_path, args: scriptArgs = [] } = args;

    const rollCommand = [
      "cli",
      "php",
      script_path,
      ...scriptArgs,
    ];

    return await this.executeRollCommand(
      project_path,
      rollCommand,
      `Running PHP script: ${script_path}`,
    );
  }

  async runMagentoCli(args) {
    const { project_path, command, args: commandArgs = [] } = args;

    const rollCommand = [
      "magento",
      command,
      ...commandArgs,
    ];

    return await this.executeRollCommand(
      project_path,
      rollCommand,
      `Running Magento CLI: roll magento ${command}`,
    );
  }



  async runComposer(args) {
    const { project_path, command } = args;

    if (!project_path) {
      throw new Error("project_path is required");
    }

    if (!command) {
      throw new Error("command is required");
    }

    const normalizedProjectPath = project_path.replace(/\/+$/, "");
    const absoluteProjectPath = resolve(normalizedProjectPath);

    if (!existsSync(absoluteProjectPath)) {
      throw new Error(
        `Project directory does not exist: ${absoluteProjectPath}`,
      );
    }

    try {
      // Parse the command string to handle arguments properly
      const commandParts = command.trim().split(/\s+/);
      const rollCommand = [
        "composer",
        ...commandParts,
      ];

      const result = await this.executeCommand(
        "roll",
        rollCommand,
        absoluteProjectPath,
      );

      const commandStr = `roll composer ${command}`;
      const isSuccess = result.code === 0;

      return {
        content: [
          {
            type: "text",
            text: `Composer command ${isSuccess ? "completed successfully" : "failed"}!\n\nCommand: ${commandStr}\nWorking directory: ${absoluteProjectPath}\nExit Code: ${result.code}\n\nOutput:\n${result.stdout || "(no output)"}\n\nErrors:\n${result.stderr || "(no errors)"}`,
          },
        ],
        isError: !isSuccess,
      };
    } catch (error) {
      const commandStr = `roll composer ${command}`;
      return {
        content: [
          {
            type: "text",
            text: `Failed to execute Composer command:\n\nCommand: ${commandStr}\nWorking directory: ${absoluteProjectPath}\nError: ${error.message}\n\nOutput:\n${error.stdout || "(no output)"}\n\nErrors:\n${error.stderr || "(no errors)"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async executeRollCommand(project_path, rollArgs, description) {
    if (!project_path) {
      throw new Error("project_path is required");
    }

    const normalizedProjectPath = project_path.replace(/\/+$/, "");
    const absoluteProjectPath = resolve(normalizedProjectPath);

    if (!existsSync(absoluteProjectPath)) {
      throw new Error(
        `Project directory does not exist: ${absoluteProjectPath}`,
      );
    }

    try {
      const result = await this.executeCommand(
        "roll",
        rollArgs,
        absoluteProjectPath,
      );

      const commandStr = `roll ${rollArgs.join(" ")}`;
      const isSuccess = result.code === 0;

      return {
        content: [
          {
            type: "text",
            text: `${description} ${isSuccess ? "completed successfully" : "failed"}!\n\nCommand: ${commandStr}\nWorking directory: ${absoluteProjectPath}\nExit Code: ${result.code}\n\nOutput:\n${result.stdout || "(no output)"}\n\nErrors:\n${result.stderr || "(no errors)"}`,
          },
        ],
        isError: !isSuccess,
      };
    } catch (error) {
      const commandStr = `roll ${rollArgs.join(" ")}`;
      return {
        content: [
          {
            type: "text",
            text: `Failed to execute command:\n\nCommand: ${commandStr}\nWorking directory: ${absoluteProjectPath}\nError: ${error.message}\n\nOutput:\n${error.stdout || "(no output)"}\n\nErrors:\n${error.stderr || "(no errors)"}`,
          },
        ],
        isError: true,
      };
    }
  }

  async magento2Init(args) {
    try {
      const {
        project_name,
        magento_version = "2.4.x",
        target_directory = "",
      } = args;

      // Build the command arguments
      const rollCommand = ["magento2-init", project_name];
      
      if (magento_version) {
        rollCommand.push(magento_version);
      }
      
      if (target_directory) {
        rollCommand.push(target_directory);
      }

      // Determine working directory (current directory or target_directory)
      const workingDir = target_directory ? resolve(target_directory) : process.cwd();

      // Execute the magento2-init command
      const result = await this.executeCommand(
        "roll",
        rollCommand,
        workingDir,
      );

      const commandStr = `roll ${rollCommand.join(" ")}`;
      const isSuccess = result.code === 0;

      if (isSuccess) {
        const projectPath = target_directory ? 
          `${resolve(target_directory)}/${project_name}` : 
          `${process.cwd()}/${project_name}`;

        return {
          content: [
            {
              type: "text",
              text: `Magento 2 project '${project_name}' initialized successfully!\n\nCommand: ${commandStr}\nMagento Version: ${magento_version}\nProject Path: ${projectPath}\n\nThe command has automatically:\n- Configured compatible software versions\n- Set up the Docker environment\n- Generated SSL certificates\n- Installed Magento via Composer\n- Configured database, Redis, and search engine\n- Created admin user with 2FA\n- Set developer mode\n\nAccess URLs:\n- Frontend: https://app.${project_name}.test/\n- Admin Panel: https://app.${project_name}.test/shopmanager/\n\nAdmin credentials are saved in admin-credentials.txt in the project directory.\n\nOutput:\n${result.stdout}`,
            },
          ],
          isError: false,
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to initialize Magento 2 project '${project_name}'!\n\nCommand: ${commandStr}\nExit Code: ${result.code}\n\nError: ${result.stderr || "Unknown error"}\n\nOutput:\n${result.stdout || "(no output)"}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to execute Magento 2 initialization:\n\nProject Name: ${args.project_name}\nMagento Version: ${args.magento_version || "2.4.x"}\nError: ${error.message}\n\nOutput:\n${error.stdout || "(no output)"}\n\nErrors:\n${error.stderr || "(no errors)"}`,
          },
        ],
        isError: true,
      };
    }
  }

  executeCommand(command, args = [], cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      childProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      childProcess.on("close", (code) => {
        resolve({ stdout, stderr, code });
      });

      childProcess.on("error", (error) => {
        const enhancedError = new Error(
          `Failed to spawn command: ${error.message}`,
        );
        enhancedError.stdout = stdout;
        enhancedError.stderr = stderr;
        reject(enhancedError);
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("RollDev MCP server running on stdio");
  }
}

const server = new RollDevServer();
server.run().catch(console.error);
