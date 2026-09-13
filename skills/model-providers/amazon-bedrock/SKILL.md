---
name: amazon-bedrock
description: Integration guide and best practices for using Amazon Bedrock as a model provider.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add amazon-bedrock
```

Or preview it first with `skyboy info amazon-bedrock`.

# Amazon Bedrock

Use this skill when integrating with Amazon Bedrock as a model provider. Covers API setup, authentication, model selection, and best practices for production use.

## When it applies

- Setting up Amazon Bedrock API credentials and SDK
- Choosing the right model from Amazon Bedrock's offerings
- Handling rate limits, retries, and error responses
- Optimizing cost and latency with Amazon Bedrock
- Streaming responses and tool use with Amazon Bedrock

---

## Quick start

```bash
# Install the SDK (example — adapt to the provider's actual package)
npm install @amazon-bedrock/sdk
```

```typescript
import { AmazonBedrockClient } from "@amazon-bedrock/sdk";

const client = new AmazonBedrockClient({
  apiKey: process.env.AMAZON_BEDROCK_API_KEY,
});
```

---

## Model selection

Amazon Bedrock offers models across capability tiers. Choose based on your use case:

| Use case | Recommended model |
|---|---|
| General chat | Check Amazon Bedrock's latest flagship model |
| Code generation | Look for code-tuned variants |
| Fast inference | Use smaller/distilled models |
| Long context | Check context window limits |

---

## Best practices

- **Rate limits**: Respect Amazon Bedrock's published RPM/TPM limits; implement exponential backoff.
- **Streaming**: Use streaming for interactive UIs to reduce time-to-first-token.
- **Cost control**: Cache responses where possible; use shorter prompts with system instructions.
- **Error handling**: Map Amazon Bedrock's error codes to user-friendly messages; never leak API keys client-side.

## References

- Amazon Bedrock official documentation
- Amazon Bedrock API reference

## AWS Skills & Plugins

AWS's public skills and plugin ecosystem (`skills/` and `plugins/` in this folder):

### Skills

| Skill | Repository | Description | Language | License |
|---|---|---|---|---|
| tools-for-devops-agent | [aws/tools-for-devops-agent](https://github.com/aws/tools-for-devops-agent) | Open-source tools for AWS DevOps Agent — ready-to-use skills, custom agents, and tools for incident response, root cause analysis, and more | Python | Apache-2.0 |
| agent-toolkit-for-aws | [aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws) | Official, AWS-supported MCP servers, skills, and plugins to help AI agents build on AWS | Python | Apache-2.0 |

### Plugins

| Repository | Description | Language | License |
|---|---|---|---|
| [agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws) | Official, AWS-supported MCP servers, skills, and plugins (also indexed under Skills) | Python | Apache-2.0 |
| [aws-toolkit-jetbrains](https://github.com/aws/aws-toolkit-jetbrains) | AWS Toolkit for JetBrains — interact with AWS from JetBrains IDEs | Kotlin | Apache-2.0 |
| [aws-toolkit-visual-studio](https://github.com/aws/aws-toolkit-visual-studio) | AWS Toolkit for Visual Studio — a plugin to interact with AWS | C#/.NET | Apache-2.0 |
| [aws-signer-notation-plugin](https://github.com/aws/aws-signer-notation-plugin) | AWS Signer Plugin for Notation | Go | Apache-2.0 |
| [amazon-vpc-cni-k8s](https://github.com/aws/amazon-vpc-cni-k8s) | Networking plugin for pod networking in Kubernetes using Elastic Network Interfaces | Go | Apache-2.0 |
| [aws-ofi-nccl](https://github.com/aws/aws-ofi-nccl) | Plugin letting EC2 developers use libfabric as a network provider with NCCL | C++ | Apache-2.0 |
| [audit-plugin-for-mysql](https://github.com/aws/audit-plugin-for-mysql) | Audit Plugin for MySQL Server | C++ | Other |
| [amazon-inspector-container-image-scanner-jenkins-plugin](https://github.com/aws/amazon-inspector-container-image-scanner-jenkins-plugin) | Jenkins CI/CD plugin for Amazon Inspector container image scanning | Java | Apache-2.0 |
| [aws-sigv4-auth-cassandra-java-driver-plugin](https://github.com/aws/aws-sigv4-auth-cassandra-java-driver-plugin) | SigV4 auth plugin for the Cassandra Java driver | Java | Apache-2.0 |
| [aws-sigv4-auth-cassandra-python-driver-plugin](https://github.com/aws/aws-sigv4-auth-cassandra-python-driver-plugin) | SigV4 auth plugin for the Cassandra Python driver | Python | Apache-2.0 |
| [aws-sigv4-auth-cassandra-gocql-driver-plugin](https://github.com/aws/aws-sigv4-auth-cassandra-gocql-driver-plugin) | SigV4 auth plugin for the gocql Cassandra driver | Go | Apache-2.0 |
| [aws-sigv4-auth-cassandra-nodejs-driver-plugin](https://github.com/aws/aws-sigv4-auth-cassandra-nodejs-driver-plugin) | SigV4 auth plugin for the Node.js Cassandra driver | JavaScript | Apache-2.0 |
