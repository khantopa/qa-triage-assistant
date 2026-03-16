import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { matchPatternsSchema, handleMatchPatterns } from "./tools/match-patterns.js";
import { getPatternProtocolSchema, handleGetPatternProtocol } from "./tools/get-pattern-protocol.js";
import { createPatternSchema, handleCreatePattern } from "./tools/create-pattern.js";
import { saveFeedbackSchema, handleSaveFeedback } from "./tools/save-feedback.js";
import { getHistorySchema, handleGetHistory } from "./tools/get-history.js";
import { updateHistorySchema, handleUpdateHistory } from "./tools/update-history.js";

const server = new McpServer({
  name: "qa-triage",
  version: "1.0.0",
});

// Register tools
server.tool(
  matchPatternsSchema.name,
  matchPatternsSchema.description,
  matchPatternsSchema.inputSchema.shape,
  async (input) => handleMatchPatterns(matchPatternsSchema.inputSchema.parse(input))
);

server.tool(
  getPatternProtocolSchema.name,
  getPatternProtocolSchema.description,
  getPatternProtocolSchema.inputSchema.shape,
  async (input) => handleGetPatternProtocol(getPatternProtocolSchema.inputSchema.parse(input))
);

server.tool(
  createPatternSchema.name,
  createPatternSchema.description,
  createPatternSchema.inputSchema.shape,
  async (input) => handleCreatePattern(createPatternSchema.inputSchema.parse(input))
);

server.tool(
  saveFeedbackSchema.name,
  saveFeedbackSchema.description,
  saveFeedbackSchema.inputSchema.shape,
  async (input) => handleSaveFeedback(saveFeedbackSchema.inputSchema.parse(input))
);

server.tool(
  getHistorySchema.name,
  getHistorySchema.description,
  getHistorySchema.inputSchema.shape,
  async (input) => handleGetHistory(getHistorySchema.inputSchema.parse(input))
);

server.tool(
  updateHistorySchema.name,
  updateHistorySchema.description,
  updateHistorySchema.inputSchema.shape,
  async (input) => handleUpdateHistory(updateHistorySchema.inputSchema.parse(input))
);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
