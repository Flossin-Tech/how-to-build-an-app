---
title: "State Management Design - Mid-Depth"
phase: "02-design"
topic: "state-management-design"
depth: "mid-depth"
reading_time: 25
prerequisites: ["state-management-design-surface"]
related_topics: ["api-design", "database-design", "performance-scalability-design"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-15"
---

# State Management Design - Mid-Depth

State management is where most production bugs hide. You've got users editing the same document, browsers going offline mid-transaction, cache invalidation race conditions, and sessions timing out at unfortunate moments. This guide covers patterns that actually work when things get complicated.

## 1. Choosing State Management Patterns

The right pattern depends on your update frequency, sharing requirements, and complexity tolerance. There's no universal solution.

### React State Management Comparison

**Context API - Good for infrequent updates**

```javascript
// UserContext.js
import { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // Problem: Every component re-renders when user changes
  // Fine for auth state, terrible for frequently updating data
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
```

Context triggers re-renders in every consumer when the value changes. This works for auth state that changes once per session. It doesn't work for real-time dashboards updating every second.

**Zustand - Good for simple global state**

```javascript
// store.js
import create from 'zustand';

const useStore = create((set, get) => ({
  users: [],
  filter: '',

  // Actions are just functions that call set
  setFilter: (filter) => set({ filter }),

  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  })),

  // Derived state via selectors
  filteredUsers: () => {
    const { users, filter } = get();
    return users.filter(u => u.name.includes(filter));
  }
}));

// Component only re-renders when filter changes
function SearchBar() {
  const filter = useStore(state => state.filter);
  const setFilter = useStore(state => state.setFilter);

  return <input value={filter} onChange={e => setFilter(e.target.value)} />;
}
```

Zustand is straightforward. Components subscribe to specific slices and only re-render when those slices change. No boilerplate, no reducers, no provider wrapping.

**Redux - Good for complex state with time-travel debugging**

```javascript
// userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUsers = createAsyncThunk(
  'users/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/users');
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    loading: false,
    error: null,
    lastFetch: null
  },
  reducers: {
    userUpdated: (state, action) => {
      const index = state.items.findIndex(u => u.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { userUpdated } = userSlice.actions;
export default userSlice.reducer;
```

Redux gives you predictable state updates, time-travel debugging, and middleware for logging/persistence. The trade-off is boilerplate. Use it when debugging complex state interactions is worth the ceremony.

### When to Use What

- **Local component state**: Single component, no sharing needed
- **Context API**: Auth state, theme, settings that rarely change
- **Zustand**: Shared state that updates frequently, minimal boilerplate
- **Redux**: Complex apps where time-travel debugging and middleware matter
- **Server state libraries (React Query, SWR)**: Data from APIs

Don't use Redux for server state. React Query handles caching, refetching, and invalidation better.

## 2. Optimistic Updates and Conflict Resolution

Optimistic updates make apps feel fast. They also introduce race conditions and conflicts. You need strategies for both the happy path and the mess.

### Basic Optimistic Update Pattern

```javascript
// Using React Query
import { useMutation, useQueryClient } from 'react-query';

function useTodoUpdate() {
  const queryClient = useQueryClient();

  return useMutation(
    (updatedTodo) => fetch(`/api/todos/${updatedTodo.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTodo)
    }),
    {
      // Before mutation runs
      onMutate: async (updatedTodo) => {
        // Cancel outgoing refetches so they don't overwrite our optimistic update
        await queryClient.cancelQueries(['todos', updatedTodo.id]);

        // Snapshot previous value for rollback
        const previousTodo = queryClient.getQueryData(['todos', updatedTodo.id]);

        // Optimistically update
        queryClient.setQueryData(['todos', updatedTodo.id], updatedTodo);

        // Return context with snapshot
        return { previousTodo };
      },

      // On error, rollback
      onError: (err, updatedTodo, context) => {
        queryClient.setQueryData(
          ['todos', updatedTodo.id],
          context.previousTodo
        );
      },

      // Always refetch after error or success
      onSettled: (data, error, updatedTodo) => {
        queryClient.invalidateQueries(['todos', updatedTodo.id]);
      }
    }
  );
}
```

This pattern handles the happy path and rollback. It doesn't handle conflicts when two users edit the same item.

### Last-Write-Wins with Optimistic Locking

```javascript
// Backend - Optimistic locking with version numbers
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { version, ...updates } = req.body;

  const result = await db.query(
    `UPDATE todos
     SET title = $1, completed = $2, version = version + 1, updated_at = NOW()
     WHERE id = $3 AND version = $4
     RETURNING *`,
    [updates.title, updates.completed, id, version]
  );

  if (result.rows.length === 0) {
    // Version mismatch - someone else updated it
    const current = await db.query('SELECT * FROM todos WHERE id = $1', [id]);
    return res.status(409).json({
      error: 'Conflict',
      current: current.rows[0]
    });
  }

  res.json(result.rows[0]);
});

// Frontend - Handle conflicts
function useTodoUpdateWithConflict() {
  const queryClient = useQueryClient();

  return useMutation(
    (updatedTodo) => fetch(`/api/todos/${updatedTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTodo)
    }).then(async res => {
      if (res.status === 409) {
        const conflict = await res.json();
        throw new ConflictError(conflict.current);
      }
      return res.json();
    }),
    {
      onMutate: async (updatedTodo) => {
        await queryClient.cancelQueries(['todos', updatedTodo.id]);
        const previousTodo = queryClient.getQueryData(['todos', updatedTodo.id]);
        queryClient.setQueryData(['todos', updatedTodo.id], updatedTodo);
        return { previousTodo };
      },

      onError: (err, updatedTodo, context) => {
        if (err instanceof ConflictError) {
          // Show merge UI or force refresh
          queryClient.setQueryData(['todos', updatedTodo.id], err.serverVersion);
          showConflictDialog(context.previousTodo, err.serverVersion);
        } else {
          queryClient.setQueryData(['todos', updatedTodo.id], context.previousTodo);
        }
      }
    }
  );
}

class ConflictError extends Error {
  constructor(serverVersion) {
    super('Conflict detected');
    this.serverVersion = serverVersion;
  }
}
```

Version-based locking catches conflicts but requires user intervention. For collaborative editing, you need operational transformation or CRDTs.

### Operational Transformation for Real-Time Collaboration

```javascript
// Simplified OT for text editing (production use libraries like Yjs or ShareDB)
class TextOT {
  // Transform operation A against operation B
  // Returns transformed A that can be applied after B
  static transform(opA, opB) {
    if (opA.position < opB.position) {
      return opA; // A comes before B, no change
    }

    if (opB.type === 'insert') {
      // B inserted text before A's position
      return {
        ...opA,
        position: opA.position + opB.text.length
      };
    }

    if (opB.type === 'delete') {
      // B deleted text before A's position
      return {
        ...opA,
        position: Math.max(opA.position - opB.length, opB.position)
      };
    }

    return opA;
  }
}

// Client applies local operation immediately (optimistic)
function handleLocalEdit(operation) {
  applyOperationToEditor(operation);

  // Send to server
  socket.emit('operation', {
    docId: currentDocId,
    operation,
    version: localVersion
  });

  pendingOperations.push(operation);
}

// Server broadcasts to other clients
socket.on('operation', ({ operation, userId }) => {
  if (userId === currentUserId) return; // Ignore our own ops

  // Transform pending operations against incoming one
  const transformedPending = pendingOperations.map(op =>
    TextOT.transform(op, operation)
  );

  // Transform incoming operation against our pending ones
  let transformedIncoming = operation;
  for (const pending of pendingOperations) {
    transformedIncoming = TextOT.transform(transformedIncoming, pending);
  }

  applyOperationToEditor(transformedIncoming);
  pendingOperations = transformedPending;
});
```

Operational transformation is complex. Use libraries like Yjs, Automerge, or ShareDB for production collaborative editing. They handle the transform logic, conflict resolution, and edge cases you'll spend months debugging.

## 3. Caching Strategies

Caching is invalidation. The hard part isn't storing data, it's knowing when to throw it away.

### Multi-Layer Cache Strategy

```javascript
// Frontend cache with React Query
import { QueryClient } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Retry failed requests
      retry: 2
    }
  }
});

// Backend cache with Redis
import Redis from 'ioredis';

const redis = new Redis();

async function getCachedUser(userId) {
  const cacheKey = `user:${userId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - fetch from database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

  if (user.rows[0]) {
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(user.rows[0]));
  }

  return user.rows[0];
}

// Invalidate cache on update
async function updateUser(userId, updates) {
  const result = await db.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
    [updates.name, updates.email, userId]
  );

  // Invalidate cache
  await redis.del(`user:${userId}`);

  return result.rows[0];
}
```

This gives you client-side caching (React Query) and server-side caching (Redis). Still need to handle cache invalidation across multiple servers.

### Cache Invalidation Patterns

**Time-based expiration** - Simple but can serve stale data:

```javascript
// Cache for fixed duration
await redis.setex('key', 300, value); // 5 minutes
```

**Event-based invalidation** - Accurate but requires coordination:

```javascript
// Publisher (write path)
async function updateProduct(productId, updates) {
  await db.query('UPDATE products SET ... WHERE id = $1', [productId]);

  // Publish invalidation event
  await redis.publish('cache:invalidate', JSON.stringify({
    type: 'product',
    id: productId
  }));
}

// Subscriber (all app instances)
redis.subscribe('cache:invalidate');

redis.on('message', (channel, message) => {
  const { type, id } = JSON.parse(message);

  if (type === 'product') {
    // Invalidate in local cache
    localCache.delete(`product:${id}`);

    // Invalidate in Redis
    redis.del(`product:${id}`);
  }
});
```

**Write-through cache** - Always consistent but slower writes:

```javascript
async function updateProductWriteThrough(productId, updates) {
  // Update database
  const result = await db.query(
    'UPDATE products SET ... WHERE id = $1 RETURNING *',
    [productId]
  );

  // Update cache immediately
  await redis.setex(
    `product:${productId}`,
    3600,
    JSON.stringify(result.rows[0])
  );

  return result.rows[0];
}
```

**Cache-aside with versioning** - Handles race conditions:

```javascript
async function getCachedWithVersion(key, fetchFn) {
  const cached = await redis.get(key);

  if (cached) {
    const { version, data, timestamp } = JSON.parse(cached);

    // Fetch new data in background if stale
    if (Date.now() - timestamp > 60000) {
      fetchAndUpdateCache(key, version, fetchFn);
    }

    return data;
  }

  return fetchAndUpdateCache(key, 0, fetchFn);
}

async function fetchAndUpdateCache(key, expectedVersion, fetchFn) {
  const data = await fetchFn();
  const version = expectedVersion + 1;

  await redis.set(key, JSON.stringify({
    version,
    data,
    timestamp: Date.now()
  }));

  return data;
}
```

## 4. Session Management

Sessions tie stateful interactions to users. They fail in interesting ways across server restarts, load balancers, and time zones.

### JWT vs Server Sessions

**JWT - Stateless but can't be revoked easily**

```javascript
import jwt from 'jsonwebtoken';

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user });
});

// Middleware to verify JWT
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

JWTs work across servers without shared state. The problem: you can't revoke them before expiration. If someone steals a token, it's valid until it expires.

**Server sessions with Redis - Stateful but revocable**

```javascript
import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

const redis = new Redis();

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict'
  }
}));

// Login
app.post('/auth/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Store user in session
  req.session.userId = user.id;
  req.session.email = user.email;

  res.json({ user });
});

// Logout - actually destroys session
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Revoke all sessions for a user
async function revokeUserSessions(userId) {
  const keys = await redis.keys('sess:*');

  for (const key of keys) {
    const session = await redis.get(key);
    const data = JSON.parse(session);

    if (data.userId === userId) {
      await redis.del(key);
    }
  }
}
```

Server sessions let you revoke access immediately. Trade-off is Redis becomes a single point of failure (use Redis Sentinel or Cluster for production).

### Hybrid Approach - JWT with Blacklist

```javascript
// Short-lived JWT + Redis blacklist for revocation
const TOKEN_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

app.post('/auth/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);

  const accessToken = jwt.sign(
    { userId: user.id, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );

  // Store refresh token in Redis for revocation
  await redis.setex(
    `refresh:${user.id}:${refreshToken}`,
    7 * 24 * 60 * 60,
    'valid'
  );

  res.json({ accessToken, refreshToken, user });
});

// Refresh endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if token is blacklisted
    const valid = await redis.get(`refresh:${decoded.userId}:${refreshToken}`);
    if (!valid) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Issue new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout - blacklist refresh token
app.post('/auth/logout', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    await redis.del(`refresh:${decoded.userId}:${refreshToken}`);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
});
```

This gives you stateless access tokens (fast) with revocable refresh tokens (secure). Access tokens are short-lived so stolen tokens expire quickly.

## 5. State Synchronization for Real-Time Features

Real-time synchronization means handling out-of-order messages, reconnection, and keeping state consistent across clients.

### WebSocket State Sync Pattern

```javascript
// Server - Broadcasting state changes
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Track connections per document
const documentConnections = new Map();

wss.on('connection', (ws, req) => {
  let currentDocId = null;

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    if (data.type === 'subscribe') {
      currentDocId = data.docId;

      if (!documentConnections.has(currentDocId)) {
        documentConnections.set(currentDocId, new Set());
      }
      documentConnections.get(currentDocId).add(ws);

      // Send current state
      const doc = await getDocument(currentDocId);
      ws.send(JSON.stringify({
        type: 'snapshot',
        data: doc
      }));
    }

    if (data.type === 'update') {
      // Apply update to database
      await updateDocument(data.docId, data.changes);

      // Broadcast to all subscribers except sender
      const subscribers = documentConnections.get(data.docId) || new Set();
      subscribers.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'update',
            changes: data.changes,
            userId: data.userId
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    if (currentDocId) {
      documentConnections.get(currentDocId)?.delete(ws);
    }
  });
});
```

**Client - Handling reconnection and message ordering**

```javascript
class DocumentSync {
  constructor(docId, userId) {
    this.docId = docId;
    this.userId = userId;
    this.ws = null;
    this.messageQueue = [];
    this.connected = false;
    this.reconnectAttempts = 0;

    this.connect();
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;

      // Subscribe to document
      this.send({
        type: 'subscribe',
        docId: this.docId
      });

      // Send queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.ws.send(JSON.stringify(msg));
      }
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'snapshot') {
        // Initial state
        this.handleSnapshot(data.data);
      }

      if (data.type === 'update') {
        // Remote update
        this.handleRemoteUpdate(data.changes, data.userId);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.reconnect();
    };

    this.ws.onerror = () => {
      this.ws.close();
    };
  }

  reconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  send(message) {
    if (this.connected) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  localUpdate(changes) {
    // Apply optimistically
    this.applyChanges(changes);

    // Send to server
    this.send({
      type: 'update',
      docId: this.docId,
      userId: this.userId,
      changes
    });
  }

  handleSnapshot(data) {
    // Replace local state with server snapshot
    this.setState(data);
  }

  handleRemoteUpdate(changes, userId) {
    // Apply changes from other users
    if (userId !== this.userId) {
      this.applyChanges(changes);
    }
  }

  applyChanges(changes) {
    // Implementation depends on your state structure
  }

  setState(data) {
    // Implementation depends on your state structure
  }
}
```

This handles reconnection with exponential backoff and queues messages while disconnected. Production systems need message IDs to detect duplicates and handle out-of-order delivery.

## 6. Offline-First Patterns

Offline-first means the app works without network, then syncs when connection returns. This requires local storage, conflict resolution, and sync strategies.

### Service Worker Cache Strategy

```javascript
// service-worker.js
const CACHE_NAME = 'app-v1';
const OFFLINE_URL = '/offline.html';

// Install - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/app.js',
        '/styles.css',
        '/manifest.json'
      ]);
    })
  );
});

// Fetch - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // API requests - network only with offline indicator
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### Local-First Data with IndexedDB

```javascript
// db.js - IndexedDB wrapper
class LocalDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AppDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        const todos = db.createObjectStore('todos', { keyPath: 'id' });
        todos.createIndex('syncStatus', 'syncStatus');
        todos.createIndex('updatedAt', 'updatedAt');
      };
    });
  }

  async saveTodo(todo) {
    const tx = this.db.transaction('todos', 'readwrite');
    const store = tx.objectStore('todos');

    await store.put({
      ...todo,
      syncStatus: 'pending',
      updatedAt: Date.now()
    });
  }

  async getTodos() {
    const tx = this.db.transaction('todos', 'readonly');
    const store = tx.objectStore('todos');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSync() {
    const tx = this.db.transaction('todos', 'readonly');
    const store = tx.objectStore('todos');
    const index = store.index('syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(id) {
    const tx = this.db.transaction('todos', 'readwrite');
    const store = tx.objectStore('todos');

    const todo = await store.get(id);
    if (todo) {
      todo.syncStatus = 'synced';
      await store.put(todo);
    }
  }
}
```

### Background Sync for Offline Actions

```javascript
// Register background sync
async function saveOffline(todo) {
  await localDB.saveTodo(todo);

  if ('sync' in registration) {
    // Request background sync
    await registration.sync.register('sync-todos');
  } else {
    // Fallback - sync immediately
    await syncTodos();
  }
}

// Service worker - handle sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncTodos());
  }
});

async function syncTodos() {
  const db = new LocalDB();
  await db.init();

  const pending = await db.getPendingSync();

  for (const todo of pending) {
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todo)
      });

      if (response.ok) {
        await db.markSynced(todo.id);
      }
    } catch (err) {
      // Will retry on next sync
      console.error('Sync failed for todo', todo.id, err);
    }
  }
}
```

Background Sync API runs even after the user closes the tab. The browser retries failed syncs with exponential backoff. This works for Android and recent Chrome versions. iOS doesn't support it - you need to sync when the app opens.

### Conflict Resolution for Offline Edits

```javascript
// Client - Track local and server versions
async function syncWithConflictResolution() {
  const pending = await localDB.getPendingSync();

  for (const localTodo of pending) {
    try {
      const response = await fetch(`/api/todos/${localTodo.id}`);
      const serverTodo = await response.json();

      if (serverTodo.updatedAt > localTodo.serverUpdatedAt) {
        // Server has newer version - conflict!
        const resolution = await resolveConflict(localTodo, serverTodo);

        if (resolution === 'keep-local') {
          await pushToServer(localTodo);
        } else if (resolution === 'keep-server') {
          await localDB.saveTodo({ ...serverTodo, syncStatus: 'synced' });
        } else if (resolution === 'merge') {
          const merged = await mergeConflict(localTodo, serverTodo);
          await pushToServer(merged);
        }
      } else {
        // No conflict - push our changes
        await pushToServer(localTodo);
      }
    } catch (err) {
      console.error('Sync failed', err);
    }
  }
}

async function resolveConflict(local, server) {
  // Show UI for user to resolve
  return new Promise((resolve) => {
    showConflictDialog({
      local,
      server,
      onResolve: (choice) => resolve(choice)
    });
  });
}
```

Automatic conflict resolution works for some data (timestamps, counters). For user-generated content, you usually need to ask the user to decide.

## 7. State Machines for Complex Workflows

State machines make complex flows predictable. They prevent invalid states like "loading and error at the same time."

### XState for Robust State Management

```javascript
import { createMachine, interpret } from 'xstate';

const paymentMachine = createMachine({
  id: 'payment',
  initial: 'idle',
  context: {
    amount: 0,
    paymentMethod: null,
    error: null
  },
  states: {
    idle: {
      on: {
        START_PAYMENT: {
          target: 'validating',
          actions: 'setPaymentDetails'
        }
      }
    },
    validating: {
      invoke: {
        src: 'validatePayment',
        onDone: {
          target: 'processing',
          actions: 'clearError'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    processing: {
      invoke: {
        src: 'processPayment',
        onDone: {
          target: 'success',
          actions: 'saveReceipt'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    success: {
      type: 'final'
    },
    error: {
      on: {
        RETRY: 'validating',
        CANCEL: 'idle'
      }
    }
  }
}, {
  actions: {
    setPaymentDetails: (context, event) => {
      context.amount = event.amount;
      context.paymentMethod = event.paymentMethod;
    },
    setError: (context, event) => {
      context.error = event.data;
    },
    clearError: (context) => {
      context.error = null;
    },
    saveReceipt: (context, event) => {
      context.receipt = event.data;
    }
  },
  services: {
    validatePayment: async (context) => {
      if (context.amount <= 0) {
        throw new Error('Invalid amount');
      }
      if (!context.paymentMethod) {
        throw new Error('No payment method');
      }
      return true;
    },
    processPayment: async (context) => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: context.amount,
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

// Use in React
import { useMachine } from '@xstate/react';

function PaymentForm() {
  const [state, send] = useMachine(paymentMachine);

  const handleSubmit = (amount, paymentMethod) => {
    send({ type: 'START_PAYMENT', amount, paymentMethod });
  };

  if (state.matches('success')) {
    return <div>Payment successful!</div>;
  }

  if (state.matches('error')) {
    return (
      <div>
        <p>Error: {state.context.error.message}</p>
        <button onClick={() => send('RETRY')}>Retry</button>
        <button onClick={() => send('CANCEL')}>Cancel</button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(100, 'card');
    }}>
      <button disabled={state.matches('validating') || state.matches('processing')}>
        {state.matches('processing') ? 'Processing...' : 'Pay'}
      </button>
    </form>
  );
}
```

State machines eliminate impossible states. You can't be both loading and showing an error. You can visualize the entire flow. Testing becomes checking transitions.

## 8. Race Condition Prevention

Race conditions happen when multiple operations access shared state. The fixes involve ordering, locking, or eliminating shared state.

### Request Cancellation Pattern

```javascript
// React - Cancel previous requests
import { useEffect, useState } from 'react';

function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    async function search() {
      if (!query) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/search?q=${query}`, {
          signal: abortController.signal
        });

        const data = await response.json();
        setResults(data);
      } catch (err) {
        if (err.name === 'AbortError') {
          // Request was cancelled - this is fine
          return;
        }
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }

    search();

    // Cleanup - cancel request if query changes
    return () => {
      abortController.abort();
    };
  }, [query]);

  return <div>...</div>;
}
```

AbortController cancels in-flight requests when inputs change. Without this, fast typing causes results to arrive out of order. User types "cat", then "cats" - but "cat" results arrive last and overwrite "cats" results.

### Debouncing and Request Deduplication

```javascript
// Debounce to reduce requests
import { useState, useEffect } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function SearchWithDebounce() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      // Only fires 300ms after user stops typing
      fetch(`/api/search?q=${debouncedQuery}`);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

Debouncing prevents excessive requests. Still need cancellation for when debounced value changes before request completes.

### Database-Level Locking

```javascript
// PostgreSQL - Row-level locking
app.post('/api/transfer', async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock rows in consistent order to prevent deadlocks
    const accountIds = [fromAccount, toAccount].sort();

    const accounts = await client.query(
      'SELECT * FROM accounts WHERE id = ANY($1) FOR UPDATE',
      [accountIds]
    );

    const from = accounts.rows.find(a => a.id === fromAccount);
    const to = accounts.rows.find(a => a.id === toAccount);

    if (from.balance < amount) {
      throw new Error('Insufficient funds');
    }

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromAccount]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccount]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});
```

`FOR UPDATE` locks rows until the transaction completes. Sorting account IDs prevents deadlocks when two transfers happen in opposite directions simultaneously.

## 9. State Persistence and Hydration

Hydration means loading server state into client without flicker or mismatch. It fails when server and client render different content.

### SSR with State Hydration

```javascript
// Server - Next.js getServerSideProps
export async function getServerSideProps(context) {
  const todos = await db.query('SELECT * FROM todos WHERE user_id = $1', [
    context.req.session.userId
  ]);

  return {
    props: {
      initialTodos: todos.rows
    }
  };
}

// Client - Hydrate React Query
import { QueryClient, QueryClientProvider, Hydrate } from 'react-query';

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <Component {...pageProps} />
      </Hydrate>
    </QueryClientProvider>
  );
}

// Page component
function TodoList({ initialTodos }) {
  const { data: todos } = useQuery(
    'todos',
    fetchTodos,
    {
      // Use server data initially, refetch in background
      initialData: initialTodos,
      staleTime: 0 // Consider server data stale immediately
    }
  );

  return <div>{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}</div>;
}
```

Server renders with initial data, client hydrates and continues from there. Set `staleTime: 0` to refetch in background for fresh data.

### Local Storage Persistence

```javascript
// Persist Zustand store to localStorage
import create from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      preferences: {
        theme: 'light',
        language: 'en'
      },
      setTheme: (theme) => set((state) => ({
        preferences: { ...state.preferences, theme }
      })),
      setLanguage: (language) => set((state) => ({
        preferences: { ...state.preferences, language }
      }))
    }),
    {
      name: 'app-preferences',
      // Only persist preferences, not derived state
      partialize: (state) => ({ preferences: state.preferences })
    }
  )
);
```

Persist preferences and draft content. Don't persist server data - that goes stale.

## 10. Common Mistakes

### Prop Drilling Through Six Levels

```javascript
// Bad - passing props through every level
function App() {
  const [user, setUser] = useState(null);

  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Sidebar user={user} setUser={setUser} />;
}

function Sidebar({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />;
}

function UserMenu({ user, setUser }) {
  return <div>{user.name}</div>;
}

// Good - context or state management
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Layout />
    </UserContext.Provider>
  );
}

function UserMenu() {
  const { user } = useContext(UserContext);
  return <div>{user.name}</div>;
}
```

### Everything in Global State

```javascript
// Bad - modal state doesn't need to be global
const useStore = create((set) => ({
  user: null,
  todos: [],
  isModalOpen: false, // This should be local!
  modalContent: null,
  openModal: (content) => set({ isModalOpen: true, modalContent: content })
}));

// Good - local state for UI
function TodoItem({ todo }) {
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setEditModalOpen(true)}>Edit</button>
      {isEditModalOpen && <EditModal todo={todo} onClose={() => setEditModalOpen(false)} />}
    </>
  );
}
```

Use local state for UI that doesn't need sharing. Global state for auth, server data, and cross-component coordination.

### Stale Closures in Effects

```javascript
// Bad - count is stale inside interval
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count); // Always logs 0
      setCount(count + 1); // Always sets to 1
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Empty deps - interval never updates

  return <div>{count}</div>;
}

// Good - use functional update
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1); // Uses current value
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>{count}</div>;
}
```

Functional updates access current state without capturing it in closure.

### Ignoring Cache Invalidation

```javascript
// Bad - cache never updates after mutation
function TodoList() {
  const { data: todos } = useQuery('todos', fetchTodos);

  const addTodo = async (text) => {
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    // Todo added but list doesn't update!
  };

  return <div>...</div>;
}

// Good - invalidate cache after mutation
function TodoList() {
  const queryClient = useQueryClient();
  const { data: todos } = useQuery('todos', fetchTodos);

  const addTodo = async (text) => {
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    // Refetch todos
    queryClient.invalidateQueries('todos');
  };

  return <div>...</div>;
}
```

Always invalidate or update cache after mutations. Otherwise users see stale data until manual refresh.

## Key Takeaways

1. **Choose state management based on sharing needs and update frequency** - Context for rare updates, Zustand for simple cases, Redux for complex debugging needs

2. **Optimistic updates need rollback strategies** - Save previous state, handle conflicts, show clear error states

3. **Multi-layer caching is standard** - Client cache (React Query), server cache (Redis), CDN cache. Each layer needs invalidation strategy

4. **Sessions can't be stateless and revocable** - Choose JWTs for stateless, server sessions for revocation, or hybrid with refresh tokens

5. **Real-time sync requires conflict resolution** - Operational transformation for collaborative editing, version numbers for simple cases, CRDTs for distributed systems

6. **Offline-first needs local storage and background sync** - IndexedDB for data, service workers for sync, conflict resolution UI for user decisions

7. **State machines prevent impossible states** - Can't be loading and error simultaneously, explicit transitions, visualizable flows

8. **Race conditions hide in async operations** - Cancel stale requests, debounce inputs, lock database rows, order operations consistently

9. **Hydration fails on client/server mismatch** - Same initial data, same render logic, refetch in background for freshness

10. **Most state should be local** - Global state for sharing across components, local state for UI, server state in query libraries

State management complexity grows with your application. Start simple, add layers as needed, and always have a strategy for when things go wrong - because they will.
---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick start
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/mid-depth/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/mid-depth/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/mid-depth/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
