---
name: agent-host-protocol
description: Protocol for synchronized multi-client state across AI agent sessions.
license: MIT
---

## Command

Install this skill with:

```bash
skyboy add agent-host-protocol
```

Or preview it first with `skyboy info agent-host-protocol`.

# Agent Host Protocol

Use this skill when implementing synchronized multi-client state across AI agent sessions. Covers the protocol specification, message formats, and synchronization patterns for agent applications.

## When it applies

- Implementing multi-client state synchronization for AI agent sessions
- Building applications that need consistent state across multiple client connections
- Understanding the protocol specification for agent-host communication
- Implementing synchronization patterns for collaborative agent sessions

---

## Overview

The Agent Host Protocol provides a specification for maintaining synchronized state across multiple client connections to an AI agent session. This is essential for:

- **Multi-Client Collaboration**: Multiple clients can interact with the same agent session while maintaining consistent state
- **State Synchronization**: Changes made by one client are propagated to all other connected clients
- **Session Persistence**: Agent sessions can maintain state across connections and reconnections
- **Real-Time Updates**: Clients receive real-time updates when the agent state changes

---

## Quick start

### Basic Implementation

```python
import asyncio
from agent_host_protocol import AgentHostSession
from agent_host_protocol import SyncState


async def main():
    # Create a session
    session = AgentHostSession(
        session_id="session-123",
        state=SyncState({"counter": 0})
    )
    
    # Connect a client
    client = await session.connect("client-1")
    
    # Update state
    await session.update_state({"counter": 1})
    
    # All connected clients receive the update
    async for update in client.receive_updates():
        print(f"State changed: {update}")

asyncio.run(main())
```

---

## Core Concepts

### State Synchronization

| Concept | Description |
|---|---|
| SyncState | The shared state object that all clients synchronize against |
| AgentHostSession | A session that manages multiple client connections |
| Client | A connection to an agent session that receives state updates |
| Update | A state change that is propagated to all connected clients |

### Protocol Flow

1. **Session Creation**: An agent session is created with initial state
2. **Client Connection**: Multiple clients connect to the session
3. **State Updates**: Any client or the agent can update the shared state
4. **Propagation**: All connected clients receive the updated state
5. **Disconnection**: Clients can disconnect and reconnect while maintaining state

---

## Best Practices

- **Consistency**: Ensure all clients receive the same state updates in the same order
- **Conflict Resolution**: Handle concurrent updates with appropriate conflict resolution strategies
- **Connection Management**: Implement robust connection management for disconnected clients
- **State Versioning**: Use versioning to track state changes and detect conflicts
- **Security**: Authenticate clients and validate state update permissions

## References

- [Agent Host Protocol Specification](https://github.com/microsoft/agent-host-protocol)
- [GitHub Repository](https://github.com/microsoft/agent-host-protocol)
