---
name: Agents-M365Copilot
description: Client libraries for Microsoft 365 Copilot APIs - typed service models and request builders for C#, Python, and TypeScript.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add Agents-M365Copilot
```

Or preview it first with `skyboy info Agents-M365Copilot`.

# Microsoft 365 Copilot APIs Client Libraries

Use this skill when developing applications that access Microsoft 365 Copilot APIs with typed service models and request builders for C#, Python, and TypeScript.

## When it applies

- Building applications that access Microsoft 365 Copilot APIs
- Working with Copilot API client libraries in C#, Python, or TypeScript
- Implementing service and core libraries for Copilot APIs
- Using typed models and request builders for Copilot API interactions

---

## Quick start

### C#

```bash
dotnet add package Microsoft.Agents.M365Copilot
```

```csharp
using Microsoft.Agents.M365Copilot;

var client = new CopilotApiClient(
    endpoint: "https://your-copilot-endpoint.com",
    credential: new DefaultAzureCredential()
);

var response = await client.GetCompletionAsync(new CopilotCompletionRequest {
    Prompt = "Hello!",
    Model = "gpt-4o-mini"
});
```

### Python

```bash
pip install microsoft-agents-m365copilot
```

```python
from microsoft_agents_m365copilot import CopilotApiClient
from azure.identity import DefaultAzureCredential

client = CopilotApiClient(
    endpoint="https://your-copilot-endpoint.com",
    credential=DefaultAzureCredential()
)

response = await client.get_completion(
    prompt="Hello!",
    model="gpt-4o-mini"
)
```

### TypeScript

```bash
npm install @microsoft/agents-m365copilot
```

```typescript
import { CopilotApiClient } from "@microsoft/agents-m365copilot";

const client = new CopilotApiClient({
    endpoint: "https://your-copilot-endpoint.com",
    credential: new DefaultAzureCredential()
});

const response = await client.getCompletion({
    prompt: "Hello!",
    model: "gpt-4o-mini"
});
```

---

## Key concepts

| Concept | Description |
|---|---|
| CopilotApiClient | Main client class for accessing Copilot APIs |
| Service Libraries | Typed models and request builders for Copilot API operations |
| Core Libraries | Retry handling, redirects, authentication, compression |
| Paging | Collection paging support |
| Batch Requests | Batch request creation capabilities |

---

## Best practices

- **Authentication**: Use proper credential management for API access
- **Error handling**: Implement robust error handling and retry logic
- **Configuration**: Securely manage API endpoints and credentials
- **Versioning**: Use appropriate API versions for stability

## References

- [Microsoft 365 Copilot APIs Documentation](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/copilot-apis-overview)
- [C# API](https://learn.microsoft.com/dotnet/api/?view=m365-agents-m365copilot&preserve-view=true)
- [Python API](https://learn.microsoft.com/python/api/?view=m365-agents-m365copilot&preserve-view=true)
- [TypeScript API](https://learn.microsoft.com/javascript/api/?view=m365-agents-m365copilot&preserve-view=true)
- [GitHub Repository](https://github.com/microsoft/Agents-M365Copilot)
