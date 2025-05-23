import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import { BB_API_KEY } from "./key.js";

const BB_API_BASE = "https://api.buildbear.io/v1/";
const USER_AGENT = "bb-mcp/1.0";

// Create server instance
const server = new McpServer({
  name: "buildbear",
  version: "0.1.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for making BuildBear requests
async function makeBBRequest<T>(
  url: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  params: Record<string, any> = {}
): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${BB_API_KEY}`,
  };

  try {
    const response = await fetch(url, {
      headers,
      method,
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    // Response is sometimes a string, sometimes a JSON object
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    } else {
      return (await response.text()) as T;
    }
  } catch (error) {
    console.error("Error making BuildBear request:", error);
    return null;
  }
}

/**
 * SANDBOX API
 */

// Create Sandbox
interface CreateSandboxResponse {
  status: string;
  sandboxId: string;
  forkingDetails: {
    chainId: number;
    blockNumber: number;
  };
  chainId: number;
  mnemonic: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl: string;
  verificationUrl: string;
}

server.tool(
  "create-sandbox",
  "Create a new sandbox environment",
  {
    chainId: z.number(),
    blockNumber: z.number().optional(),
    customChainId: z.number().optional(),
    perfund: z.array(z.string()).optional(),
  },
  async ({ chainId, blockNumber, customChainId, perfund }) => {
    const response = await makeBBRequest<CreateSandboxResponse>(
      `${BB_API_BASE}/buildbear-sandbox`,
      "POST",
      {
        chainId,
        blockNumber,
        customChainId,
        perfund,
      }
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to create sandbox",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Sandbox created successfully: ${response.sandboxId}`,
        },
      ],
    };
  }
);

// Fetch Sandbox Details
interface FetchSandboxDetailsResponse {
  sandboxId: string; // Different property order than the CreateSandboxResponse
  status: string;
  forkingDetails: {
    chainId: number;
    blockNumber: number;
  };
  chainId: number;
  mnemonic: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl: string;
  verificationUrl: string;
}

server.tool(
  "fetch-sandbox-details",
  "Fetch details of a given sandbox environment",
  {
    sandboxId: z.string(),
  },
  async ({ sandboxId }) => {
    const response = await makeBBRequest<FetchSandboxDetailsResponse>(
      `${BB_API_BASE}/buildbear-sandbox/${sandboxId}`,
      "GET",
      {
        sandboxId,
      }
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch sandbox details",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Sandbox details: ${JSON.stringify(response, null, 2)}`,
        },
      ],
    };
  }
);

// Get Sandbox Snapshots
interface Snapshot {
  nodeId: string;
  snapshotId: number;
  blockNumber: number;
}

server.tool(
  "get-sandbox-snapshots",
  "Get all snapshots of a given sandbox environment",
  {
    sandboxId: z.string(),
  },
  async ({ sandboxId }) => {
    const response = await makeBBRequest<Array<Snapshot>>(
      `${BB_API_BASE}/buildbear-sandbox/${sandboxId}/snapshot`,
      "GET",
      {
        sandboxId,
      }
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch sandbox details",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Sandbox snapshots: ${JSON.stringify(response, null, 2)}`,
        },
      ],
    };
  }
);

// Delete a Sandbox
server.tool(
  "delete-sandbox",
  "Delete a given sandbox environment",
  {
    sandboxId: z.string(),
  },
  async ({ sandboxId }) => {
    const response = await makeBBRequest<string>(
      `${BB_API_BASE}/buildbear-sandbox/${sandboxId}`,
      "DELETE",
      {
        sandboxId,
      }
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to delete sandbox",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `${response}`,
        },
      ],
    };
  }
);

// Get Available Networks
interface Network {
  name: string;
  id: string;
  options: Array<{
    label: string;
    value: string;
    networkRpc: string;
  }>;
}

server.tool(
  "get-available-networks",
  "Get all available networks for sandbox creation",
  {},
  async () => {
    const response = await makeBBRequest<Array<Network>>(
      `${BB_API_BASE}/buildbear-sandbox/chains`,
      "GET",
      {}
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch available networks",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Available networks: ${JSON.stringify(response, null, 2)}`,
        },
      ],
    };
  }
);

/**
 * EXPLORER API
 */

// Get Source Code
interface GetSourceCodeResponse {
  status: string;
  message: string;
  result: [
    {
      SourceCode: string;
      ABI: string;
      ContractName: string;
      CompilerVersion: string;
      OptimizationUsed: string;
      Runs: string;
      ConstructorArguments: string;
      EVMVersion: string;
      Library: string;
      LicenseType: string;
      Proxy: string;
      Implementation: string;
      SwarmSource: string;
      SourceMap: string;
      isDiamond: boolean;
    }
  ];
}

server.tool(
  "get-source-code",
  "Get the source code of a given contract",
  {
    sandboxId: z.string(),
    address: z.string(),
  },
  async ({ sandboxId, address }) => {
    const response = await makeBBRequest<GetSourceCodeResponse>(
      `${BB_API_BASE}/explorer/${sandboxId}?module=contract&action=getsourcecode&address=${address}`,
      "GET",
      {}
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch contract source code",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Contract source code: ${JSON.stringify(
            response.result[0],
            null,
            2
          )}`,
        },
      ],
    };
  }
);

// Get Contract ABI
interface GetContractAbiResponse {
  status: string;
  message: string;
  result: string;
}

server.tool(
  "get-contract-abi",
  "Get the ABI of a given contract",
  {
    sandboxId: z.string(),
    address: z.string(),
  },
  async ({ sandboxId, address }) => {
    const response = await makeBBRequest<GetContractAbiResponse>(
      `${BB_API_BASE}/explorer/${sandboxId}?module=contract&action=getabi&address=${address}`,
      "GET",
      {}
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch contract ABI",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Contract ABI: ${response.result}`,
        },
      ],
    };
  }
);

// Get Block by Time
interface GetBlockByTimeResponse {
  status: string;
  message: string;
  result: string;
}

server.tool(
  "get-block-by-time",
  "Get the block number by time",
  {
    sandboxId: z.string(),
    timestamp: z.string().optional(),
  },
  async ({ sandboxId, timestamp }) => {
    const response = await makeBBRequest<GetBlockByTimeResponse>(
      `${BB_API_BASE}/explorer/${sandboxId}?module=block&action=getblocknobytime&closest=before&timestamp=${timestamp}`,
      "GET",
      {}
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch block by time",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Block number: ${response.result}`,
        },
      ],
    };
  }
);

// Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BuildBear MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
