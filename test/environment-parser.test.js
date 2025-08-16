// No imports needed for this test file

describe('Environment Parser', () => {
  // Test the environment parsing logic separately
  const parseEnvironmentList = (output) => {
    const environments = [];
    const lines = output.split('\n');

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
        trimmed.includes('No running environments found') ||
        trimmed.includes('Found the following') ||
        trimmed.includes('RollDev Services')
      ) {
        continue;
      }

      // Remove ANSI color codes for parsing
      const cleanLine = trimmed.replace(/\x1b\[[0-9;]*m/g, '');

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
      if (cleanLine.includes('NAME') && cleanLine.includes('STATE')) {
        break;
      }
    }

    return environments;
  };

  test('should parse single environment correctly', () => {
    const mockOutput = `
ai-demo a magento2 project
  Project Directory: /Users/dev/ai-demo
  Project URL: https://app.ai-demo.test
  Docker Network: ai-demo_default
  Containers Running: 9
`;

    const result = parseEnvironmentList(mockOutput);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'ai-demo',
      path: '/Users/dev/ai-demo',
      url: 'https://app.ai-demo.test',
      network: 'ai-demo_default',
      containers: 9,
      raw: '  Containers Running: 9'
    });
  });

  test('should parse multiple environments correctly', () => {
    const mockOutput = `
ai-demo a magento2 project
  Project Directory: /Users/dev/ai-demo
  Project URL: https://app.ai-demo.test
  Docker Network: ai-demo_default
  Containers Running: 9

test-project a magento2 project
  Project Directory: /Users/dev/test-project
  Project URL: https://app.test-project.test
  Docker Network: test-project_default
  Containers Running: 5

NAME           STATE
rolldev-dnsmasq  running
rolldev-mailhog  running
`;

    const result = parseEnvironmentList(mockOutput);
    
    expect(result).toHaveLength(2);
    
    expect(result[0]).toMatchObject({
      name: 'ai-demo',
      path: '/Users/dev/ai-demo',
      url: 'https://app.ai-demo.test',
      network: 'ai-demo_default',
      containers: 9
    });

    expect(result[1]).toMatchObject({
      name: 'test-project',
      path: '/Users/dev/test-project',
      url: 'https://app.test-project.test',
      network: 'test-project_default',
      containers: 5
    });
  });

  test('should handle empty output', () => {
    const mockOutput = `
No running environments found
`;

    const result = parseEnvironmentList(mockOutput);
    expect(result).toHaveLength(0);
  });

  test('should handle ANSI color codes', () => {
    const mockOutputWithColors = `
\x1b[32mai-demo\x1b[0m a \x1b[33mmagento2\x1b[0m project
  \x1b[36mProject Directory:\x1b[0m /Users/dev/ai-demo
  \x1b[36mProject URL:\x1b[0m https://app.ai-demo.test
  \x1b[36mDocker Network:\x1b[0m ai-demo_default
  \x1b[36mContainers Running:\x1b[0m \x1b[32m9\x1b[0m
`;

    const result = parseEnvironmentList(mockOutputWithColors);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'ai-demo',
      path: '/Users/dev/ai-demo',
      url: 'https://app.ai-demo.test',
      network: 'ai-demo_default',
      containers: 9
    });
  });

  test('should stop parsing at services section', () => {
    const mockOutput = `
ai-demo a magento2 project
  Project Directory: /Users/dev/ai-demo
  Project URL: https://app.ai-demo.test
  Docker Network: ai-demo_default
  Containers Running: 9

RollDev Services
NAME              STATE
rolldev-dnsmasq   running
rolldev-mailhog   running

incomplete-project a magento2 project
  Project Directory: /Users/dev/incomplete
`;

    const result = parseEnvironmentList(mockOutput);
    
    // Should only find the first project, stopping at services section
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ai-demo');
  });

  test('should handle missing information gracefully', () => {
    const mockOutput = `
incomplete-project a magento2 project
  Project Directory: /Users/dev/incomplete
  Docker Network: incomplete-project_default
  Containers Running: 3
`;

    const result = parseEnvironmentList(mockOutput);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'incomplete-project',
      path: '/Users/dev/incomplete',
      url: null, // Missing URL should be null
      network: 'incomplete-project_default',
      containers: 3
    });
  });
});