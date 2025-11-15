---
title: "State Management Design - Deep Water"
phase: "02-design"
topic: "state-management-design"
depth: "deep-water"
reading_time: 50
prerequisites: ["state-management-design-surface"]
related_topics: ["architecture-design", "api-design", "database-design", "error-handling-resilience"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# State Management Design - Deep Water

Once you understand the basics of client state, server state, and keeping things in sync, you hit harder problems. Multiple users editing the same document. Real-time collaboration across continents. Offline mobile apps that need to sync when they reconnect. State machines managing complex UI flows that can't enter invalid states.

These aren't theoretical problems. Google Docs handles millions of concurrent editors. Figma lets designers work together in real-time. Linear updates issue statuses instantly across all open tabs. They all solved state management problems that basic patterns can't handle.

This guide covers the patterns and trade-offs for advanced state management. You'll see where eventual consistency makes sense and where you need stronger guarantees. When to use CRDTs and when they're overkill. How state machines prevent impossible states. What it actually takes to build offline-first applications.

## Distributed State and Collaboration

When multiple people modify the same data simultaneously, you have three choices: lock the data so only one person can edit at a time, let everyone edit and merge changes later, or use specialized data structures that make concurrent edits safe.

### Operational Transformation

Google Docs popularized operational transformation (OT) for collaborative editing. The core idea: transform operations based on concurrent operations so everyone converges to the same state.

Here's the problem OT solves:

```
Initial document: "Hello"

Alice (position 5): Insert "!"      → "Hello!"
Bob (position 0): Insert "Hey, "    → "Hey, Hello"
```

Both edits happen concurrently. If you apply them in different orders on different clients, you get different results. Alice's client thinks the document is "Hey, Hello!" but Bob's client thinks it's "Hello!Hey, ".

OT transforms operations to account for concurrent changes:

```javascript
// Simplified OT for text insertion
function transform(op1, op2) {
  // If op2 inserted before op1's position, shift op1's position
  if (op2.type === 'insert' && op2.position <= op1.position) {
    return {
      ...op1,
      position: op1.position + op2.text.length
    };
  }
  return op1;
}

// Server receives: Bob's insert at 0, then Alice's insert at 5
// Transform Alice's operation against Bob's
const transformedAliceOp = transform(
  { type: 'insert', position: 5, text: '!' },
  { type: 'insert', position: 0, text: 'Hey, ' }
);
// Result: { type: 'insert', position: 10, text: '!' }
// Correct final state: "Hey, Hello!"
```

Real OT implementations handle delete, complex position tracking, and three-way transforms (client A, client B, server). ShareDB and Yjs are production-ready OT libraries.

**When OT works**: Text editing, simple list operations, scenarios where operation order matters and you need deterministic convergence.

**When OT breaks down**: Complex data structures with multiple concurrent operations. Proving correctness for all possible operation combinations is hard. Most OT systems support limited operation types for this reason.

### CRDTs: Conflict-Free Replicated Data Types

CRDTs take a different approach - use data structures that mathematically guarantee eventual consistency without requiring centralized coordination.

**G-Counter (Grow-only Counter)**: Each client tracks increments independently, the value is the sum of all clients' counts.

```javascript
class GCounter {
  constructor(clientId) {
    this.clientId = clientId;
    this.counts = new Map(); // clientId -> count
  }

  increment() {
    const current = this.counts.get(this.clientId) || 0;
    this.counts.set(this.clientId, current + 1);
  }

  value() {
    let total = 0;
    for (let count of this.counts.values()) {
      total += count;
    }
    return total;
  }

  merge(other) {
    // Take the maximum count for each client
    for (let [clientId, count] of other.counts) {
      const current = this.counts.get(clientId) || 0;
      this.counts.set(clientId, Math.max(current, count));
    }
  }
}

// Usage across two clients
const alice = new GCounter('alice');
const bob = new GCounter('bob');

alice.increment(); // alice's count: 1
bob.increment();   // bob's count: 1
bob.increment();   // bob's count: 2

// Sync - order doesn't matter
alice.merge(bob);
bob.merge(alice);

console.log(alice.value()); // 3
console.log(bob.value());   // 3
```

No matter what order merges happen, all clients converge to the same value. This is the CRDT magic - commutativity, associativity, and idempotence mean merge order doesn't matter.

**LWW-Element-Set (Last-Write-Wins Set)**: Track additions and removals with timestamps.

```javascript
class LWWSet {
  constructor() {
    this.added = new Map();   // element -> timestamp
    this.removed = new Map(); // element -> timestamp
  }

  add(element, timestamp = Date.now()) {
    const currentAdd = this.added.get(element) || 0;
    if (timestamp > currentAdd) {
      this.added.set(element, timestamp);
    }
  }

  remove(element, timestamp = Date.now()) {
    const currentRemove = this.removed.get(element) || 0;
    if (timestamp > currentRemove) {
      this.removed.set(element, timestamp);
    }
  }

  has(element) {
    const addTime = this.added.get(element) || 0;
    const removeTime = this.removed.get(element) || 0;
    // Bias towards additions on tie (or bias towards removes, your choice)
    return addTime >= removeTime && addTime > 0;
  }

  merge(other) {
    for (let [element, timestamp] of other.added) {
      this.add(element, timestamp);
    }
    for (let [element, timestamp] of other.removed) {
      this.remove(element, timestamp);
    }
  }
}
```

LWW-Sets handle the common case where multiple people might add or remove the same item. Timestamps determine winners. This requires synchronized clocks (tricky in distributed systems) or logical clocks (Lamport timestamps, vector clocks).

**CRDT Trade-offs**:

- **Pros**: No coordination needed, offline-friendly, guaranteed convergence, partition tolerance
- **Cons**: Metadata overhead (tracking versions/timestamps per element), some operations require tombstones (deleted items tracked forever), eventual consistency only (no strong guarantees)

**Production CRDT libraries**: Automerge, Yjs, Gun.js. Yjs is particularly interesting - it combines CRDT principles with efficient binary encoding and works well for collaborative editing.

```javascript
// Yjs example - collaborative text editing
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const doc = new Y.Doc();
const text = doc.getText('shared-text');

// Connect to sync server
const provider = new WebsocketProvider(
  'wss://sync-server.example.com',
  'document-id',
  doc
);

// All clients see same text, edits merge automatically
text.insert(0, 'Hello ');
text.insert(6, 'world');

// Listen for remote changes
text.observe(event => {
  console.log('Text changed:', event.changes);
});
```

Figma uses CRDTs for multiplayer cursors and selections. Notion uses a hybrid approach with CRDTs for certain data types. Linear uses a different approach entirely (more on that later).

### Real-World Collaboration: Figma's Approach

Figma handles real-time collaboration for design files with thousands of elements and dozens of concurrent editors. Their approach combines several patterns:

**1. Operational Transform for layer hierarchy**
Tree structures (nested frames, groups) use OT to handle concurrent modifications.

**2. CRDTs for presence and ephemeral state**
Cursors, selections, active tools - these use CRDTs because eventual consistency is fine and offline tolerance matters.

**3. Authoritative server for conflict resolution**
When two people edit the same property (e.g., rectangle fill color) at the same time, last write wins based on server timestamp. They accept that this means one edit disappears, but show both users' cursors so it's visible when you're stepping on each other.

**4. Optimistic updates with rollback**
Local edits apply immediately. If the server rejects (version conflict), roll back and reapply on top of server state.

```javascript
// Simplified optimistic update pattern
class OptimisticStateManager {
  constructor() {
    this.serverState = {};
    this.pendingOps = [];
    this.version = 0;
  }

  async applyLocalOp(op) {
    // Apply immediately to local state
    this.pendingOps.push(op);
    this.applyOp(op);

    // Send to server
    try {
      const result = await this.sendToServer(op, this.version);
      this.version = result.version;
      this.pendingOps.shift(); // Remove confirmed op
    } catch (error) {
      if (error.code === 'VERSION_CONFLICT') {
        // Server has newer state - rollback and reapply
        await this.syncFromServer();
      }
    }
  }

  async syncFromServer() {
    const serverState = await fetch('/api/state').then(r => r.json());

    // Rollback local ops
    const opsToReapply = [...this.pendingOps];
    this.serverState = serverState.state;
    this.version = serverState.version;
    this.pendingOps = [];

    // Reapply on top of server state
    for (let op of opsToReapply) {
      this.applyOp(op);
      this.pendingOps.push(op);
    }
  }

  applyOp(op) {
    // Apply operation to current state
    if (op.type === 'SET_PROPERTY') {
      this.serverState[op.path] = op.value;
    }
  }
}
```

This pattern lets Figma feel instant while maintaining consistency. Users see their changes immediately. If there's a conflict, the UI updates to match server state. The key is making rollback invisible or at least understandable.

## Real-Time Synchronization Patterns

Real-time sync means state changes on one client immediately reflect on other clients. This requires persistent connections and careful handling of network failures.

### WebSocket State Management

WebSockets provide full-duplex communication. Both client and server can push updates without polling.

```javascript
// Client-side WebSocket manager
class RealtimeSync {
  constructor(url, docId) {
    this.url = url;
    this.docId = docId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.pendingMessages = [];
    this.messageHandlers = new Map();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;

      // Subscribe to document
      this.send({
        type: 'subscribe',
        docId: this.docId
      });

      // Send any messages queued while disconnected
      while (this.pendingMessages.length > 0) {
        this.send(this.pendingMessages.shift());
      }
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  reconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue for when connection reopens
      this.pendingMessages.push(message);
    }
  }

  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }
}

// Usage
const sync = new RealtimeSync('wss://api.example.com/sync', 'doc-123');

sync.on('state-update', (message) => {
  // Apply state update from server
  applyUpdate(message.operations);
});

sync.on('user-joined', (message) => {
  // Show user cursor
  showCursor(message.userId, message.userName);
});

sync.connect();

// Send local changes
function handleLocalEdit(operation) {
  applyLocalOperation(operation);
  sync.send({
    type: 'operation',
    docId: 'doc-123',
    operation: operation
  });
}
```

**Server-side considerations**:

```javascript
// WebSocket server with Redis for multi-server sync
const WebSocket = require('ws');
const Redis = require('ioredis');

const wss = new WebSocket.Server({ port: 8080 });
const redis = new Redis();
const sub = new Redis(); // Separate connection for pub/sub

// Track connected clients per document
const documentConnections = new Map();

sub.subscribe('document-updates');
sub.on('message', (channel, message) => {
  const update = JSON.parse(message);
  const clients = documentConnections.get(update.docId) || new Set();

  // Broadcast to all clients except sender
  for (let client of clients) {
    if (client.id !== update.senderId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(update));
    }
  }
});

wss.on('connection', (ws) => {
  ws.id = generateId();

  ws.on('message', async (data) => {
    const message = JSON.parse(data);

    if (message.type === 'subscribe') {
      // Add client to document's connection set
      if (!documentConnections.has(message.docId)) {
        documentConnections.set(message.docId, new Set());
      }
      documentConnections.get(message.docId).add(ws);
      ws.docId = message.docId;

      // Send current state
      const state = await getDocumentState(message.docId);
      ws.send(JSON.stringify({
        type: 'initial-state',
        state: state
      }));
    }

    if (message.type === 'operation') {
      // Persist operation
      await saveOperation(message.docId, message.operation);

      // Publish to other servers via Redis
      redis.publish('document-updates', JSON.stringify({
        docId: message.docId,
        senderId: ws.id,
        type: 'state-update',
        operations: [message.operation]
      }));
    }
  });

  ws.on('close', () => {
    // Remove from document connections
    if (ws.docId) {
      const clients = documentConnections.get(ws.docId);
      if (clients) {
        clients.delete(ws);
      }
    }
  });
});
```

This setup handles multiple server instances using Redis pub/sub. When a user connects to server A and another to server B, operations still sync because servers communicate via Redis.

### Optimistic Updates and Conflict Resolution

Users expect instant feedback. Optimistic updates apply changes immediately, then reconcile with the server.

**Three patterns for conflicts**:

**1. Last Write Wins (LWW)**
Simple but data loss. When Alice and Bob edit the same field, whoever's write reaches the server last wins.

```javascript
// Server: Simple LWW
app.put('/api/documents/:id', async (req, res) => {
  await db.query(
    'UPDATE documents SET content = ?, updated_at = NOW() WHERE id = ?',
    [req.body.content, req.params.id]
  );
  res.json({ success: true });
});
```

This works fine when conflicts are rare or when the "wrong" result is acceptable. Chat messages? LWW is fine. Financial data? Probably not.

**2. Optimistic Locking**
Track versions. Reject updates if version has changed.

```javascript
// Server: Version-based locking
app.put('/api/documents/:id', async (req, res) => {
  const result = await db.query(
    `UPDATE documents
     SET content = ?, version = version + 1, updated_at = NOW()
     WHERE id = ? AND version = ?`,
    [req.body.content, req.params.id, req.body.version]
  );

  if (result.affectedRows === 0) {
    // Version mismatch - someone else updated
    const current = await db.query(
      'SELECT * FROM documents WHERE id = ?',
      [req.params.id]
    );
    return res.status(409).json({
      error: 'VERSION_CONFLICT',
      current: current[0]
    });
  }

  res.json({ success: true, version: req.body.version + 1 });
});

// Client: Handle version conflicts
async function saveDocument(doc) {
  try {
    const result = await fetch(`/api/documents/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    return await result.json();
  } catch (error) {
    if (error.code === 'VERSION_CONFLICT') {
      // Show user: "This document was modified. Review changes?"
      const keepLocal = await confirmDialog(
        'Document was modified by someone else. Keep your changes?'
      );
      if (keepLocal) {
        // Force update (or merge if you're fancy)
        doc.version = error.current.version;
        return saveDocument(doc);
      } else {
        // Discard local changes
        return error.current;
      }
    }
    throw error;
  }
}
```

Optimistic locking prevents silent data loss. Users know when conflicts happen. The downside is handling conflicts - you need UI flow for "someone else changed this, what do you want to do?"

**3. Operational Transform / CRDT**
Merge changes intelligently. This is what Google Docs does - both users' edits apply, transformed to make sense together.

### Offline-First State Management

Mobile apps and unreliable networks require working offline and syncing when connectivity returns.

**Core offline pattern**: Local database (IndexedDB, SQLite) as source of truth, background sync to server.

```javascript
// Offline-capable state manager
class OfflineFirstStore {
  constructor(storeName) {
    this.storeName = storeName;
    this.db = null;
    this.syncQueue = [];
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.storeName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Local state
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }

        // Sync queue for pending operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queue = db.createObjectStore('syncQueue', {
            keyPath: 'queueId',
            autoIncrement: true
          });
          queue.createIndex('timestamp', 'timestamp');
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.processSyncQueue(); // Try to sync on init
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async get(id) {
    const tx = this.db.transaction(['items'], 'readonly');
    const store = tx.objectStore('items');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set(id, data) {
    // Write to local DB immediately
    const tx = this.db.transaction(['items', 'syncQueue'], 'readwrite');
    const items = tx.objectStore('items');
    const queue = tx.objectStore('syncQueue');

    items.put({ id, ...data });

    // Queue for server sync
    queue.add({
      operation: 'SET',
      itemId: id,
      data: data,
      timestamp: Date.now()
    });

    await this.promisifyRequest(tx.complete);

    // Try to sync now if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    const tx = this.db.transaction(['syncQueue'], 'readonly');
    const queue = tx.objectStore('syncQueue');
    const items = await this.promisifyRequest(queue.getAll());

    for (let item of items) {
      try {
        await this.syncToServer(item);

        // Remove from queue on success
        const deleteTx = this.db.transaction(['syncQueue'], 'readwrite');
        deleteTx.objectStore('syncQueue').delete(item.queueId);
      } catch (error) {
        console.error('Sync failed:', error);
        // Leave in queue, try again later
        break; // Stop processing if one fails
      }
    }
  }

  async syncToServer(queueItem) {
    const response = await fetch(`/api/items/${queueItem.itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queueItem.data)
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    return response.json();
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Listen for online/offline
window.addEventListener('online', () => {
  console.log('Back online, syncing...');
  store.processSyncQueue();
});

window.addEventListener('offline', () => {
  console.log('Offline mode');
});
```

**Conflict resolution when coming online**:

When the user goes offline, edits locally, and comes back online, their local changes might conflict with server changes that happened while they were offline.

```javascript
async function syncWithConflictResolution() {
  // Get server's current state
  const serverState = await fetch('/api/items').then(r => r.json());

  // Get local state
  const localState = await store.getAll();

  // Find conflicts: items modified both locally and on server
  const conflicts = [];

  for (let localItem of localState) {
    const serverItem = serverState.find(s => s.id === localItem.id);

    if (serverItem && serverItem.updated_at > localItem.synced_at) {
      // Both modified - conflict!
      conflicts.push({
        local: localItem,
        server: serverItem
      });
    } else if (!serverItem) {
      // Deleted on server, modified locally - conflict!
      conflicts.push({
        local: localItem,
        server: null
      });
    }
  }

  if (conflicts.length > 0) {
    // Show conflict resolution UI
    const resolutions = await showConflictDialog(conflicts);

    for (let resolution of resolutions) {
      if (resolution.choice === 'keep-local') {
        await store.syncToServer(resolution.local);
      } else {
        await store.set(resolution.server.id, resolution.server);
      }
    }
  }

  // Sync everything else normally
  await store.processSyncQueue();
}
```

**Production offline-first libraries**: PouchDB (syncs with CouchDB), RxDB (reactive database with sync), WatermelonDB (SQLite-backed for React Native).

## State Machines for Complex Workflows

State machines make impossible states impossible. Instead of tracking multiple boolean flags (isLoading, isError, hasData), define explicit states and valid transitions.

### XState for UI State

XState is a robust state machine library. Here's a real-world example: a checkout flow.

```javascript
import { createMachine, assign } from 'xstate';

const checkoutMachine = createMachine({
  id: 'checkout',
  initial: 'reviewingCart',
  context: {
    cart: [],
    shippingAddress: null,
    paymentMethod: null,
    orderId: null,
    error: null
  },
  states: {
    reviewingCart: {
      on: {
        PROCEED_TO_SHIPPING: {
          target: 'enteringShipping',
          cond: 'hasItemsInCart'
        },
        UPDATE_CART: {
          actions: assign({
            cart: (context, event) => event.cart
          })
        }
      }
    },
    enteringShipping: {
      on: {
        BACK_TO_CART: 'reviewingCart',
        SUBMIT_SHIPPING: {
          target: 'enteringPayment',
          actions: assign({
            shippingAddress: (context, event) => event.address
          })
        }
      }
    },
    enteringPayment: {
      on: {
        BACK_TO_SHIPPING: 'enteringShipping',
        SUBMIT_PAYMENT: 'processingPayment'
      }
    },
    processingPayment: {
      invoke: {
        src: 'processPayment',
        onDone: {
          target: 'orderComplete',
          actions: assign({
            orderId: (context, event) => event.data.orderId
          })
        },
        onError: {
          target: 'paymentFailed',
          actions: assign({
            error: (context, event) => event.data
          })
        }
      }
    },
    paymentFailed: {
      on: {
        RETRY_PAYMENT: 'processingPayment',
        BACK_TO_PAYMENT: 'enteringPayment'
      }
    },
    orderComplete: {
      type: 'final'
    }
  }
}, {
  guards: {
    hasItemsInCart: (context) => context.cart.length > 0
  },
  services: {
    processPayment: async (context) => {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: context.cart,
          shippingAddress: context.shippingAddress,
          paymentMethod: context.paymentMethod
        })
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      return response.json();
    }
  }
});
```

Using the machine in React:

```javascript
import { useMachine } from '@xstate/react';

function CheckoutFlow() {
  const [state, send] = useMachine(checkoutMachine);

  if (state.matches('reviewingCart')) {
    return (
      <CartReview
        cart={state.context.cart}
        onUpdateCart={(cart) => send({ type: 'UPDATE_CART', cart })}
        onProceed={() => send('PROCEED_TO_SHIPPING')}
      />
    );
  }

  if (state.matches('enteringShipping')) {
    return (
      <ShippingForm
        onBack={() => send('BACK_TO_CART')}
        onSubmit={(address) => send({
          type: 'SUBMIT_SHIPPING',
          address
        })}
      />
    );
  }

  if (state.matches('processingPayment')) {
    return <LoadingSpinner message="Processing payment..." />;
  }

  if (state.matches('paymentFailed')) {
    return (
      <ErrorMessage
        error={state.context.error}
        onRetry={() => send('RETRY_PAYMENT')}
        onBack={() => send('BACK_TO_PAYMENT')}
      />
    );
  }

  if (state.matches('orderComplete')) {
    return <OrderConfirmation orderId={state.context.orderId} />;
  }

  return null;
}
```

**Why state machines help**:

You can't accidentally have `isLoading: true` and `isError: true` at the same time. You can't be in payment processing and cart review simultaneously. Invalid states are impossible by design.

You can't skip from cart to order complete without going through shipping and payment - the state graph enforces the flow.

Every transition is explicit. Want to know all the ways to get to payment failure? Look at edges pointing to that state. Want to add a discount code step? Add a state and wire the transitions.

### Statecharts for Hierarchical State

Complex UIs have nested states. A form might be "editing" but within that, each field can be "focused", "blurred", "validating", "error", etc.

```javascript
const formMachine = createMachine({
  id: 'form',
  type: 'parallel', // Multiple regions active simultaneously
  states: {
    formLevel: {
      initial: 'editing',
      states: {
        editing: {
          on: {
            SUBMIT: 'validating'
          }
        },
        validating: {
          invoke: {
            src: 'validateForm',
            onDone: 'submitting',
            onError: 'editing'
          }
        },
        submitting: {
          invoke: {
            src: 'submitForm',
            onDone: 'submitted',
            onError: 'editing'
          }
        },
        submitted: {
          type: 'final'
        }
      }
    },
    emailField: {
      initial: 'empty',
      states: {
        empty: {
          on: {
            FOCUS: 'focused',
            INPUT: 'valid'
          }
        },
        focused: {
          on: {
            BLUR: 'validating',
            INPUT: 'typing'
          }
        },
        typing: {
          on: {
            BLUR: 'validating',
            INPUT: 'typing'
          }
        },
        validating: {
          invoke: {
            src: 'validateEmail',
            onDone: 'valid',
            onError: 'invalid'
          }
        },
        valid: {
          on: {
            FOCUS: 'focused',
            CLEAR: 'empty'
          }
        },
        invalid: {
          on: {
            FOCUS: 'focused',
            CLEAR: 'empty'
          }
        }
      }
    },
    passwordField: {
      initial: 'empty',
      states: {
        empty: {
          on: {
            FOCUS: 'focused',
            INPUT: 'typing'
          }
        },
        focused: {
          on: {
            BLUR: 'blurred',
            INPUT: 'typing'
          }
        },
        typing: {
          on: {
            BLUR: 'validating',
            INPUT: 'typing'
          }
        },
        validating: {
          invoke: {
            src: 'validatePassword',
            onDone: 'valid',
            onError: 'weak'
          }
        },
        valid: {},
        weak: {}
      }
    }
  }
});
```

Parallel states mean the form-level state and each field's state are independent. The form can be validating while the email field is valid and the password field is typing.

This matches how complex UIs actually work. Trying to model this with boolean flags becomes unmaintainable fast.

## Advanced Caching Strategies

Caching sits between your UI and your data source. Good caching makes apps feel instant. Bad caching shows stale data and causes hard-to-debug issues.

### React Query and Stale-While-Revalidate

React Query popularized treating server state as a cache with automatic background updates.

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch data with automatic caching and background refresh
function ProductList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,      // Data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000,     // Keep in cache for 10 minutes
    refetchOnWindowFocus: true,     // Refresh when user returns to tab
    refetchOnReconnect: true,       // Refresh when back online
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data.products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Mutations with automatic cache invalidation
function AddProductButton() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newProduct) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    // Or optimistically update the cache
    onMutate: async (newProduct) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['products'] });

      // Snapshot current value
      const previousProducts = queryClient.getQueryData(['products']);

      // Optimistically update
      queryClient.setQueryData(['products'], (old) => ({
        products: [...old.products, newProduct]
      }));

      // Return context with snapshot
      return { previousProducts };
    },
    onError: (err, newProduct, context) => {
      // Roll back on error
      queryClient.setQueryData(['products'], context.previousProducts);
    }
  });

  return (
    <button onClick={() => mutation.mutate({ name: 'New Product' })}>
      Add Product
    </button>
  );
}
```

**Stale-while-revalidate pattern**: Show cached data immediately (even if stale), fetch fresh data in background, update when ready. Users see instant results, data stays current.

**Cache invalidation strategies**:

```javascript
// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: ['products'] });

// Invalidate by pattern (all product-related queries)
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0] === 'products'
});

// Remove from cache entirely
queryClient.removeQueries({ queryKey: ['products', productId] });

// Manually set cache data
queryClient.setQueryData(['products', productId], newData);

// Optimistic updates for related queries
queryClient.setQueriesData(
  { queryKey: ['products'] },
  (oldData) => {
    // Update all product queries that include this product
    return updateProductInList(oldData, updatedProduct);
  }
);
```

### Apollo Client Normalized Cache

Apollo Client (for GraphQL) uses a normalized cache - objects stored by ID and type, not by query.

```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Product: {
        keyFields: ['id'], // Use 'id' as cache key
        fields: {
          // Custom merge logic for list fields
          reviews: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            }
          }
        }
      },
      Query: {
        fields: {
          products: {
            // Customize how this query merges with cache
            merge(existing, incoming, { args }) {
              if (args?.offset === 0) {
                return incoming; // New search, replace
              }
              return [...existing, ...incoming]; // Pagination, append
            }
          }
        }
      }
    }
  })
});

// Query data
const PRODUCT_QUERY = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      price
      reviews {
        id
        rating
        text
      }
    }
  }
`;

function ProductPage({ productId }) {
  const { data, loading } = useQuery(PRODUCT_QUERY, {
    variables: { id: productId }
  });

  // ...
}

// Mutation automatically updates cache
const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $price: Float!) {
    updateProduct(id: $id, price: $price) {
      id
      price
    }
  }
`;

// After mutation, any component querying this product sees updated price
// No manual cache invalidation needed - normalized cache handles it
```

The magic: When you update a product's price, every query that includes that product automatically reflects the change. The cache is normalized by type and ID, so updating one reference updates all.

**Custom cache updates for complex operations**:

```javascript
const [addReview] = useMutation(ADD_REVIEW_MUTATION, {
  update(cache, { data: { addReview } }) {
    // Read current product from cache
    const { product } = cache.readQuery({
      query: PRODUCT_QUERY,
      variables: { id: productId }
    });

    // Write back with new review added
    cache.writeQuery({
      query: PRODUCT_QUERY,
      variables: { id: productId },
      data: {
        product: {
          ...product,
          reviews: [...product.reviews, addReview]
        }
      }
    });
  }
});
```

### Cache Invalidation: The Hard Problems

Phil Karlton said "There are only two hard things in Computer Science: cache invalidation and naming things."

Cache invalidation is hard because:

**1. Dependent data**: Updating a product's price should invalidate the cart total, category averages, recommendation engine results. Tracking all dependencies is complex.

**2. Distributed caches**: Multiple server instances, CDN edge caches, browser caches. Invalidating everywhere takes time. Eventual consistency means different users see different data temporarily.

**3. Partial updates**: User edits one field in a large object. Do you invalidate the whole object? Just that field? What if multiple people edit different fields?

**Real-world approach**: Combine strategies.

```javascript
// Layered caching with different TTLs
const cacheStrategy = {
  // CDN: Cache for 1 hour, can be stale
  cdnTTL: 60 * 60,

  // Server cache: 5 minutes, background refresh
  serverTTL: 5 * 60,

  // Client cache: Fresh for 1 minute, show stale while revalidating
  clientStaleTime: 1 * 60,

  // On mutation: Invalidate client and server, CDN purges take time
  onMutation: async (keys) => {
    // Immediate: Local cache
    queryClient.invalidateQueries({ queryKey: keys });

    // Fast: Server cache via API
    await fetch('/api/cache/invalidate', {
      method: 'POST',
      body: JSON.stringify({ keys })
    });

    // Slow: CDN purge (may take minutes to propagate)
    await fetch('/api/cdn/purge', {
      method: 'POST',
      body: JSON.stringify({ paths: keys })
    });
  }
};
```

## Server State at Scale

Managing state across distributed systems introduces consistency, coordination, and failure handling challenges.

### Session Management with Multiple Servers

Sticky sessions (route user to same server) are simple but problematic. If that server goes down, all its users lose session state.

Better: Centralized session store.

```javascript
// Express with Redis session store
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

Now any server can access any session. User logs in on server A, next request goes to server B, session data is there.

**Trade-offs**:

- **Pro**: Stateless application servers (easy to scale horizontally)
- **Pro**: Session survives server restarts
- **Con**: Every request hits Redis (network latency)
- **Con**: Redis becomes single point of failure (use Redis Sentinel or Cluster)

**JWT tokens as alternative**:

```javascript
const jwt = require('jsonwebtoken');

// Login: Generate JWT
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body);

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

// Protected route: Verify JWT
app.get('/api/orders', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const orders = getOrdersForUser(payload.userId);
    res.json(orders);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

**JWT trade-offs**:

- **Pro**: No server-side session storage (fully stateless)
- **Pro**: Works across domains (mobile apps, microservices)
- **Con**: Can't revoke without blacklist (or keep tokens short-lived)
- **Con**: Token size (every request carries full payload)
- **Con**: Can't update claims without issuing new token

**Hybrid approach**: Short-lived JWT (15 min) + refresh token in Redis.

```javascript
// Login returns both access token and refresh token
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body);

  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = generateSecureRandomToken();

  // Store refresh token in Redis with 7-day TTL
  await redisClient.setEx(
    `refresh:${user.id}`,
    7 * 24 * 60 * 60,
    refreshToken
  );

  res.json({ accessToken, refreshToken });
});

// Refresh endpoint: Exchange refresh token for new access token
app.post('/api/refresh', async (req, res) => {
  const { refreshToken, userId } = req.body;

  const stored = await redisClient.get(`refresh:${userId}`);

  if (stored !== refreshToken) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ accessToken });
});

// Logout: Delete refresh token
app.post('/api/logout', async (req, res) => {
  await redisClient.del(`refresh:${req.body.userId}`);
  res.json({ success: true });
});
```

This gives you stateless request handling (fast) with the ability to revoke access (delete refresh token).

### Consistency Models

When data is distributed across multiple servers or databases, you choose between consistency (everyone sees the same data immediately) and availability (system stays responsive even during network failures).

**Strong consistency**: All clients see the same data at the same time. Requires coordination.

```javascript
// Example: Transfer money between accounts
// Must be strongly consistent - can't have both accounts showing different balances

async function transferMoney(fromAccountId, toAccountId, amount) {
  const transaction = await db.beginTransaction();

  try {
    // Lock both accounts
    const fromAccount = await transaction.query(
      'SELECT * FROM accounts WHERE id = ? FOR UPDATE',
      [fromAccountId]
    );

    const toAccount = await transaction.query(
      'SELECT * FROM accounts WHERE id = ? FOR UPDATE',
      [toAccountId]
    );

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    await transaction.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromAccountId]
    );

    await transaction.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toAccountId]
    );

    await transaction.commit();

    return { success: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

Strong consistency is expensive - requires locks, coordination, and can block operations. Works at small scale, struggles under high load.

**Eventual consistency**: Updates propagate eventually. Different replicas might temporarily disagree.

```javascript
// Example: Like counts on social media posts
// Eventual consistency is fine - doesn't matter if count is briefly wrong

async function likePost(userId, postId) {
  // Write to local database replica
  await db.query(
    'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
    [userId, postId]
  );

  // Increment counter (eventually consistent)
  await redis.incr(`likes:${postId}`);

  // Publish event for other replicas to pick up
  await messageQueue.publish('post-liked', {
    userId,
    postId,
    timestamp: Date.now()
  });

  // Return immediately - don't wait for replication
  return { success: true };
}
```

This scales well because replicas don't need to coordinate. Users on different servers might briefly see different like counts, but it converges.

**Causal consistency**: Operations that are causally related appear in the same order to all clients.

Example: Comment on a post. Everyone should see the post before seeing comments on it. But comments on different posts can appear in any order (not causally related).

Vector clocks track causality:

```javascript
class VectorClock {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.clocks = { [nodeId]: 0 };
  }

  increment() {
    this.clocks[this.nodeId]++;
  }

  update(otherClock) {
    for (let [node, timestamp] of Object.entries(otherClock.clocks)) {
      this.clocks[node] = Math.max(this.clocks[node] || 0, timestamp);
    }
    this.increment();
  }

  happensBefore(otherClock) {
    let hasLess = false;
    for (let node of Object.keys(this.clocks)) {
      if (this.clocks[node] > (otherClock.clocks[node] || 0)) {
        return false; // Not before if we're ahead somewhere
      }
      if (this.clocks[node] < (otherClock.clocks[node] || 0)) {
        hasLess = true;
      }
    }
    return hasLess;
  }
}

// Usage
const clock1 = new VectorClock('server1');
clock1.increment(); // server1: 1

const clock2 = new VectorClock('server2');
clock2.increment(); // server2: 1

clock1.update(clock2); // server1: 2, server2: 1
clock2.update(clock1); // server1: 2, server2: 2

// Can now determine if events are causally related
```

Vector clocks let you detect concurrent operations vs sequential operations. Useful for conflict resolution in distributed systems.

## Case Studies: How Real Systems Handle State

### Google Docs: Collaborative Editing

Google Docs supports millions of simultaneous editors on the same document. Their approach combines several patterns:

**1. Operational Transform for text**
Every character insertion, deletion, formatting change is an operation. Operations transform against concurrent operations to maintain consistency.

**2. Chunked documents**
Large documents split into smaller chunks. Only chunks being edited are locked, rest remain available.

**3. Presence as separate channel**
Cursors, selections, who's viewing - these use a separate system (likely CRDT or simple broadcast) because eventual consistency is fine.

**4. Revision history as event log**
Every operation is logged. This enables undo/redo, version history, and recovery from bugs.

**5. Offline editing**
Local changes queue up. When reconnected, operations replay against current server state. Conflicts are rare because operations are fine-grained (character-level, not document-level).

### Figma: Multiplayer Design

Figma's real-time collaboration for design files handles a different kind of state - structured objects (rectangles, text, groups) not linear text.

**1. Client-side state is authoritative for local changes**
Your edits apply immediately. Figma sends operations to server, but doesn't wait for confirmation to update your UI.

**2. Server arbitrates conflicts**
Two people edit the same property (e.g., rectangle fill color) at the same exact time? Server picks winner based on timestamp. Loser's client gets corrected.

**3. Presence and ephemeral state via WebSocket**
Cursors, selections, active tool - broadcast to other clients via WebSocket. Doesn't persist.

**4. File saved to version-controlled storage**
Every change creates a new file version (like Git). You can browse history, restore previous versions.

**5. Multiplayer cursors show awareness**
Even when someone isn't editing, you see their cursor. This prevents stepping on each other - you notice when someone else is working on the same element.

### Linear: Instant Updates Everywhere

Linear (issue tracking) feels instant. Create an issue, it appears in sidebar immediately. Change status, everyone's view updates in real-time.

**Their approach**:

**1. GraphQL subscriptions for real-time**
Clients subscribe to issues they care about. Server pushes updates when changes happen.

**2. Optimistic updates everywhere**
Client applies changes immediately, sends mutation to server, server confirms or corrects.

**3. Synced offline storage**
Uses IndexedDB to cache all data locally. Works offline, syncs when reconnected.

**4. Normalized cache (Apollo Client)**
Issues, projects, users - all normalized by ID. Updating one issue automatically updates every query that includes it.

**5. Conflict resolution is simple: Last write wins**
They accept that if two people edit the same issue simultaneously, one change might disappear. In practice, rare enough that simplicity wins over complex merge logic.

**6. Focus on perception of speed**
Instant local updates + eventual consistency feels faster than waiting for server confirmation. Users don't notice the occasional rollback.

## Choosing the Right Approach

No universal answer. Trade-offs depend on your constraints.

**Use local component state when**:
- State is temporary and UI-only (dropdown open/closed)
- No other components need it
- Doesn't need to persist

**Use global client state when**:
- Multiple components need the same data
- Data comes from user interaction (not server)
- Needs to survive component unmounts

**Use URL state when**:
- Users should be able to bookmark/share
- State should survive refresh
- Deep linking matters (search filters, pagination)

**Use server-rendered state when**:
- SEO matters
- Initial page load performance matters
- Data is mostly read-only

**Use React Query / SWR when**:
- Fetching data from APIs
- Want automatic caching and background refresh
- Optimistic updates and rollback

**Use Apollo Client when**:
- Using GraphQL
- Need normalized cache
- Complex related data

**Use Redux / Zustand when**:
- Complex client-side state logic
- Need time-travel debugging
- State updates from many sources

**Use XState when**:
- Complex workflows with many states
- Need to prevent invalid states
- Want state machine visualization

**Use CRDTs when**:
- Offline-first requirements
- Peer-to-peer sync
- Strong partition tolerance needed

**Use Operational Transform when**:
- Real-time collaborative editing
- Order of operations matters
- Can constrain operation types

**Choose strong consistency when**:
- Financial transactions
- Inventory during checkout
- Any data loss is unacceptable

**Choose eventual consistency when**:
- Social media metrics (likes, views)
- Content that updates frequently
- Availability more important than instant consistency

## Final Thoughts

State management isn't about picking the "best" tool. It's about understanding trade-offs and matching patterns to problems.

Simple apps don't need distributed state machines. But when you're building real-time collaboration or offline-first mobile apps, understanding CRDTs and operational transform stops you from reinventing worse versions of solved problems.

The developers who built Google Docs didn't start with operational transform. They tried simpler approaches, found limitations, and adopted more sophisticated patterns when needed. That's the right progression.

Start simple. Use local state until you need global state. Use client-side caching until you need real-time sync. Use last-write-wins until you need conflict resolution. Complexity should arrive because you measured actual problems, not because you anticipated theoretical ones.

The best state management is invisible. Users don't think about it. They just notice when their data is there when they need it, updates feel instant, and conflicts resolve gracefully. That's the goal.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[← Mid-Depth](../mid-depth/index.md)** Practical patterns and implementation

### Related Topics
- [Architecture Design](../../architecture-design/deep-water/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/deep-water/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/deep-water/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../README.md)
- [↑ Back to Main Guide](../../../../README.md)
