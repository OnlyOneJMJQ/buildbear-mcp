# BuildBear MCP Server

This MCP server allows supported LLMs like Anthropic Claude, OpenAI GPT-4o, and more to use the BuildBear API via tool calls. The documented [Sandbox API](https://www.buildbear.io/docs/api-reference/sandbox-api) and [Explorer API](https://www.buildbear.io/docs/api-reference/explorer-api) are implemented.

## Setup

To test out the MCP server with Claude desktop:

1. Export your BuildBear API key from a `key.js` file in the `src` directory (see limitations below).
2. Run `npm run build`.
3. [Configure Claude desktop as instructed here.](https://modelcontextprotocol.io/quickstart/server#testing-your-server-with-claude-for-desktop)

## Limitations

**This is not ready for production** because we need to implement proper authentication ([see MCP auth docs here](https://modelcontextprotocol.io/specification/2025-03-26/basic/index#auth)). The API key is imported from a JS file becuase the TS compiler can't reference env variables at build time and the MCP server will also not read env variables at runtime.
