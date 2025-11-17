---
title: "State Management Essentials"
phase: "02-design"
topic: "state-management-design"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["api-design", "database-design", "architecture-design"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# State Management Essentials

State is everything your application needs to remember. The text in a form field. Whether a user is logged in. Items in a shopping cart. The current page of search results.

Every application has state. The question is whether you're managing it intentionally or accidentally.

## What State Actually Means

State is data that changes over time and affects what users see or what your application does. When state changes, something should update - a UI component re-renders, a database record updates, or a cache invalidates.

The tricky part is that state lives in multiple places:
- In the browser (component state, URL parameters, local storage)
- On the server (database, cache, session store)
- In transit (API requests carrying partial updates)

When these get out of sync, users see stale data, lose their work, or encounter mysterious bugs that "only happen sometimes."

**A concrete example**: You're building a checkout flow. The user adds items to their cart. That's state. They fill out shipping information across three form screens. More state. They navigate away and come back. The state should persist. They open the same site on their phone. Should they see the same cart? Probably. Two people share a login (they shouldn't, but they do). Should they see each other's carts? Definitely not.

Every decision about where state lives and how it moves determines whether these scenarios work correctly.

## Client-Side State: What the Browser Remembers

Client-side state is what the browser knows about. It exists in JavaScript memory, browser storage, or the URL.

### Local Component State

The simplest form of state lives inside a single component and doesn't need to be shared.

```javascript
function SearchBox() {
  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

This works fine for temporary UI state that doesn't matter to anything else. The search query only matters while you're typing. Once you submit the search, something else handles the results.

**When local state breaks down**: The user types a query, you show autocomplete suggestions, they click one, you navigate to a new page with the selected item. If that navigation needs to know what they selected, local state in the search box doesn't help. The component unmounts and the state disappears.

### Global State

When multiple parts of your UI need the same information, you need global state. Shopping carts are the classic example - the cart icon in the header needs to show item count, the cart page needs to show all items, the checkout needs the total.

```javascript
// Context-based global state (React)
const CartContext = createContext();

function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems([...items, item]);
  };

  return (
    <CartContext.Provider value={{ items, addItem }}>
      {children}
    </CartContext.Provider>
  );
}

// Any component can access cart state
function CartIcon() {
  const { items } = useContext(CartContext);
  return <span>Cart ({items.length})</span>;
}
```

This keeps the state in sync across components. When you add an item, everything that cares about the cart updates automatically.

**The trap**: Global state is easy to create and tempting to use for everything. Before you know it, you have dozens of context providers, complex update logic, and components that re-render because state they don't care about changed.

Rule of thumb: Start with local state. Move to global state only when you actually need to share data between components that don't have a direct parent-child relationship.

### URL as State

The URL is underrated state storage. It's shareable, bookmarkable, and survives page refreshes.

```javascript
// Search results page
const searchParams = new URLSearchParams(window.location.search);
const page = searchParams.get('page') || 1;
const filter = searchParams.get('filter') || 'all';
```

If your search results URL is `?query=laptop&page=2&filter=under-500`, users can bookmark that exact search. They can share it. The back button works correctly.

When URL doesn't work: Sensitive data (don't put credit card numbers in query params), extremely large data sets, or truly temporary UI state like whether a dropdown is open.

### Browser Storage

LocalStorage and sessionStorage let you persist state across page loads.

```javascript
// Save cart to localStorage
localStorage.setItem('cart', JSON.stringify(items));

// Restore on page load
const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
```

LocalStorage persists until explicitly cleared. SessionStorage clears when the browser tab closes.

**Critical gotcha**: localStorage is per-domain, not per-user. If two people use the same browser profile, they share localStorage. This breaks multi-user scenarios on shared computers. Libraries. Kiosks. Kids sharing a parent's device.

For anything user-specific, you need server-side state.

## Server-Side State: What the Server Remembers

Server-side state persists independently of what any individual browser knows. It's the source of truth.

### Database State

The database holds the real data. User accounts. Order history. Product inventory. When the client and server disagree, the database wins.

```javascript
// Server endpoint to get cart
app.get('/api/cart', async (req, res) => {
  const userId = req.session.userId;
  const cart = await db.query(
    'SELECT * FROM cart_items WHERE user_id = ?',
    [userId]
  );
  res.json(cart);
});
```

The user's browser might think the cart has 3 items. But if the database says 2 items (maybe they removed one on their phone), the database is correct.

### Session State

Sessions bridge the gap between stateless HTTP and stateful user experiences. The server needs to remember who you are across multiple requests.

```javascript
// Express session example
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,  // HTTPS only
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));

// Store user ID in session after login
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body);
  req.session.userId = user.id;
  res.json({ success: true });
});
```

The session ID lives in a cookie. The actual session data lives on the server (in memory, Redis, or a database). This keeps sensitive state server-side while letting the browser prove who it is.

**Session gotcha**: Sessions don't work well with multiple servers unless you use a shared session store. User logs in on server A. Their next request goes to server B. Server B doesn't know about the session. User appears logged out.

Solution: Use Redis or a database for session storage instead of in-memory sessions.

### Cache State

Caching improves performance by remembering expensive computations or queries.

```javascript
// Simple in-memory cache
const cache = new Map();

app.get('/api/products', async (req, res) => {
  const cacheKey = 'all-products';

  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  const products = await db.query('SELECT * FROM products');
  cache.set(cacheKey, products);

  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000); // 5 min TTL

  res.json(products);
});
```

Cache is state you're willing to be wrong about temporarily. Product list from the cache might be 30 seconds old. For most use cases, that's fine. For inventory counts during a flash sale, maybe not.

## Stateless vs Stateful: Architecture Decisions

### Stateless APIs

A stateless API doesn't remember anything between requests. Every request includes all the information needed to process it.

```javascript
// Stateless: Auth token in every request
app.get('/api/orders', (req, res) => {
  const token = req.headers.authorization;
  const user = verifyToken(token);
  const orders = db.query('SELECT * FROM orders WHERE user_id = ?', [user.id]);
  res.json(orders);
});
```

The server doesn't maintain session state. The client sends proof of identity with every request (usually a JWT token). This makes horizontal scaling trivial - any server can handle any request.

**Trade-off**: The client has to manage and send the token. Token expiration and refresh adds complexity. Revoking access requires a token blacklist or short expiration times.

### Stateful APIs

Stateful APIs remember context between requests, usually via sessions.

```javascript
// Stateful: Session remembers who you are
app.get('/api/orders', (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const orders = db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
  res.json(orders);
});
```

Simpler client code - no need to manage tokens. More complex server infrastructure - you need session storage that multiple servers can access.

**When stateful makes sense**: Traditional web apps with server-rendered pages. Long-lived connections like WebSockets. Anything where the overhead of sending state with every request outweighs the scaling complexity.

**When stateless makes sense**: APIs consumed by mobile apps or third-party services. Microservices architectures. Systems that need to scale horizontally without sticky sessions.

## Common Patterns and Real Scenarios

### Multi-Step Forms

Multi-step forms are where state management gets visible fast. User fills out step 1, clicks next, fills out step 2. If they click back, their step 1 data should still be there.

**Approach 1: Keep it all client-side until the end**

```javascript
function MultiStepForm() {
  const [formData, setFormData] = useState({
    step1: {},
    step2: {},
    step3: {}
  });
  const [currentStep, setCurrentStep] = useState(1);

  const updateStep = (step, data) => {
    setFormData({
      ...formData,
      [step]: data
    });
  };

  const submitAll = async () => {
    await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  };
}
```

Works well for short forms. User can navigate back and forth. Data only hits the server when they submit.

**Risk**: User closes the tab, they lose everything. Network errors on final submit mean re-entering everything.

**Approach 2: Save each step to the server**

```javascript
const saveStep = async (stepNumber, data) => {
  await fetch(`/api/form-draft/${draftId}/step/${stepNumber}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};
```

More resilient. User can come back later. Works across devices. But now you need to store draft data, handle partial submissions, and clean up abandoned drafts.

Choose based on how much you care about losing partial progress. Tax preparation software? Save everything. Newsletter signup? Client-side is fine.

### Shopping Carts

Shopping carts need to work for both logged-in and anonymous users.

**Anonymous users**: Cart lives in localStorage or a server-side session identified by session cookie.

**Logged-in users**: Cart lives in the database, tied to user ID.

**The merge problem**: User adds items while logged out. Then they log in. What happens to their cart?

```javascript
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body);

  // Merge anonymous cart with user's saved cart
  const sessionCart = req.session.cart || [];
  const userCart = await db.query(
    'SELECT * FROM cart_items WHERE user_id = ?',
    [user.id]
  );

  // Combine, avoiding duplicates
  const mergedCart = mergeCartItems(sessionCart, userCart);

  await saveCartForUser(user.id, mergedCart);

  req.session.userId = user.id;
  delete req.session.cart;  // Clear anonymous cart

  res.json({ success: true });
});
```

You have to decide: Do duplicate items add to quantity? Replace? Ask the user? There's no universally right answer, but you need to handle it intentionally.

## Red Flags and Common Mistakes

**Storing state in the wrong place**

Don't store user preferences in component state that unmounts when they navigate. Don't store sensitive data in localStorage where other scripts can read it. Don't cache data that must always be current (account balances, inventory during checkout).

**Race conditions**

```javascript
// Problem: Two rapid updates
const [count, setCount] = useState(0);

const increment = () => {
  setCount(count + 1);  // Uses stale count if called twice quickly
};

// Better: Updater function
const increment = () => {
  setCount(current => current + 1);
};
```

When state updates depend on previous state, use the updater function form. Otherwise, rapid updates can overwrite each other.

**Forgetting that state can be out of sync**

The cart icon shows 3 items. The user removes one on another tab. The icon still shows 3 until they refresh. If this matters, you need real-time sync (WebSockets, polling) or at least refresh on focus.

**Not handling conflicts**

Two users edit the same document. Both save. Last write wins - one person's changes disappear. You need either optimistic locking (compare version numbers, reject stale updates) or operational transformation (merge changes intelligently). For simple cases, showing "This was modified since you loaded it" prevents silent data loss.

**Over-engineering early**

You don't need Redux for a todo app. You don't need a distributed session store for 100 users on one server. Start simple. Add complexity when you measure actual problems, not hypothetical ones.

## Key Takeaways

State management is about controlling where information lives and how it moves. Good state management is mostly invisible - things just work. Bad state management causes lost data, stale UI, and bugs that happen "sometimes."

**Guidelines to start with:**

1. **Start local, expand when needed**: Component state first, global state when you're actually sharing data, server state for persistence.

2. **Match state lifetime to user expectations**: Form input disappearing on refresh is annoying. Shopping cart persisting after logout is a security issue. Think about what users expect.

3. **Database is the source of truth**: When client and server disagree, server wins. When cache and database disagree, database wins. Design for this.

4. **Stateless scales easier, stateful feels easier**: If you're building an API for mobile apps, stateless with JWT tokens is probably right. If you're building a traditional web app, sessions work fine until they don't.

5. **Handle the happy path and the "what if" path**: What if they refresh? What if they have two tabs open? What if their token expired? What if the network fails mid-update? You don't need perfect answers, but you need intentional answers.

State management isn't glamorous. But it's the difference between an app that feels solid and one that feels brittle. The user doesn't think about state management. They just notice when their data vanishes or when the cart icon shows the wrong count. Get the basics right and they won't have to think about it either.
---

## Navigation

### Depth Levels
- **[Mid-Depth →](../mid-depth/index.md)** Practical patterns and implementation details
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [Architecture Design](../../architecture-design/surface/index.md) - Related design considerations
- [Data Flow Mapping](../../data-flow-mapping/surface/index.md) - Related design considerations
- [Performance & Scalability Design](../../performance-scalability-design/surface/index.md) - Related design considerations

### Navigate
- [← Back to Design Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
