---
title: "Frontend Architecture - Deep Water"
phase: "02-design"
topic: "frontend-architecture"
depth: "deep-water"
reading_time: 45
prerequisites: ["job-to-be-done", "architecture-design", "state-management-design"]
related_topics: ["performance-scalability-design", "api-design", "deployment-strategy"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-20"
---

# Frontend Architecture - Deep Water

You're architecting frontends that serve millions of users, coordinating multiple teams, or dealing with systems that have outgrown their original design. This guide covers the advanced patterns and organizational structures that matter at scale.

Most teams never need micro-frontends or custom build orchestration. But if you're facing the problems they solve - teams blocking each other, deploy queues measured in days, codebases where nobody understands the whole thing - these patterns become essential tools.

## 1. Micro-Frontend Architectures

### When Micro-Frontends Actually Make Sense

Frontend Mastery puts it directly: "Micro frontends are all about solving organizational issues, rather than performance ones." If you don't have these organizational problems, you're adding complexity without benefit.

**Signs you might need micro-frontends:**

- **Deploy bottlenecks** - Multiple teams queued waiting to deploy because everything's in one repo
- **Team coordination overhead** - Changes require cross-team meetings and coordination
- **Technology lock-in** - You can't modernize one part without rewriting everything
- **Scaling hiring** - New teams can't be productive because the codebase is too complex to learn

**Signs you definitely don't need micro-frontends:**

- One or two frontend developers
- Single team with good communication
- Application complexity is manageable
- No specific scaling problems yet

Contentsquare's engineering team migrated to micro-frontends when they hit half a million lines of code with 40+ frontend developers. IKEA did it to enable independent feature releases across teams. These are organizational scale problems.

### Composition Patterns

There are several ways to compose micro-frontends into a cohesive application:

#### Build-time Composition

Micro-frontends are npm packages that a shell application installs and composes at build time.

```typescript
// Shell application package.json
{
  "dependencies": {
    "@company/header": "^2.1.0",
    "@company/product-catalog": "^1.5.0",
    "@company/checkout": "^3.0.0"
  }
}

// Shell composes them
import { Header } from '@company/header';
import { ProductCatalog } from '@company/product-catalog';
import { Checkout } from '@company/checkout';

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/products/*" element={<ProductCatalog />} />
        <Route path="/checkout/*" element={<Checkout />} />
      </Routes>
    </>
  );
}
```

**Pros:** Simple mental model, standard npm tooling, type safety across boundaries.

**Cons:** Still requires coordinated deployments. Version conflicts between micro-frontends. Build times increase with more packages.

#### Runtime Composition with Module Federation

Webpack 5's Module Federation enables true runtime integration. Each micro-frontend is deployed independently, and the shell loads them at runtime.

```javascript
// webpack.config.js for the shell
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    productCatalog: 'productCatalog@https://products.example.com/remoteEntry.js',
    checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
});

// Shell loads micro-frontends dynamically
const ProductCatalog = React.lazy(() => import('productCatalog/Catalog'));
const Checkout = React.lazy(() => import('checkout/CheckoutFlow'));
```

```javascript
// webpack.config.js for product catalog micro-frontend
new ModuleFederationPlugin({
  name: 'productCatalog',
  filename: 'remoteEntry.js',
  exposes: {
    './Catalog': './src/Catalog',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
});
```

**Pros:** True independent deployments. Teams can release without coordinating. Different teams can even use different framework versions (with care).

**Cons:** Runtime errors possible if contracts break. Versioning of shared dependencies is tricky. More infrastructure complexity.

#### Server-Side Composition

A server assembles the page from fragments served by different micro-frontends.

```typescript
// Server fetches fragments from each micro-frontend service
app.get('/products/:id', async (req, res) => {
  const [header, productDetails, recommendations] = await Promise.all([
    fetch('https://header-service/fragment').then(r => r.text()),
    fetch(`https://product-service/fragment/${req.params.id}`).then(r => r.text()),
    fetch(`https://recs-service/fragment/${req.params.id}`).then(r => r.text()),
  ]);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>...</head>
      <body>
        ${header}
        <main>
          ${productDetails}
          ${recommendations}
        </main>
      </body>
    </html>
  `);
});
```

**Pros:** Works without JavaScript. Good for content-heavy sites. Each fragment can be cached independently.

**Cons:** Requires server infrastructure. Hydration and client-side interactivity is more complex. Communication between fragments is limited.

#### Web Components

Framework-agnostic custom elements that encapsulate micro-frontends.

```typescript
// Product catalog team defines their web component
class ProductCatalog extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    // Mount React/Vue/Svelte app into shadow DOM
    ReactDOM.render(<CatalogApp />, root);
  }

  disconnectedCallback() {
    // Cleanup
  }
}
customElements.define('product-catalog', ProductCatalog);
```

```html
<!-- Shell uses it like any HTML element -->
<header-component></header-component>
<main>
  <product-catalog category="electronics"></product-catalog>
</main>
<checkout-widget></checkout-widget>
```

**Pros:** True framework independence. Browser-native standard. Style encapsulation via Shadow DOM.

**Cons:** Shadow DOM complicates global styles. Cross-component communication requires custom events. Framework hydration in Shadow DOM has edge cases.

### Shared Dependencies and Version Management

The trickiest part of micro-frontends is managing shared code. If every micro-frontend bundles React, you ship React 10 times. If they share React but have version mismatches, things break in mysterious ways.

**Strategies:**

**Externals + CDN:**
```javascript
// Each micro-frontend treats React as external
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
}

// Shell loads shared dependencies from CDN
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
```

**Module Federation shared:**
```javascript
shared: {
  react: {
    singleton: true,
    requiredVersion: '^18.0.0',
    eager: true,
  },
}
```

**Monorepo with shared packages:**
Keep shared code in packages that all micro-frontends depend on. This works well with build-time composition but adds coupling.

### Communication Between Micro-Frontends

Micro-frontends need to communicate: user authentication state, navigation events, shared data.

**Custom Events (loosely coupled):**
```typescript
// Publish
window.dispatchEvent(new CustomEvent('user-logged-in', {
  detail: { userId: '123', name: 'Alice' }
}));

// Subscribe
window.addEventListener('user-logged-in', (event) => {
  setCurrentUser(event.detail);
});
```

**Shared State Store:**
```typescript
// All micro-frontends import from the same store
import { globalStore } from '@company/shared-state';

// Product catalog reads user
const user = globalStore.getState().user;

// Auth micro-frontend writes user
globalStore.setState({ user: loggedInUser });
```

**Props from Shell (parent-child):**
```typescript
// Shell passes data to micro-frontends as props
<ProductCatalog user={currentUser} onNavigate={handleNavigate} />
```

**URL as shared state:**
Query parameters and route segments are naturally shared across micro-frontends. This works well for filters, selected items, and view modes.

### Migration from Monolith

The Contentsquare and IKEA migrations both followed incremental approaches. A full rewrite is almost never the right choice.

**The Strangler Fig Pattern:**

1. **Identify a bounded slice** - Pick one vertical feature (checkout, settings, a specific dashboard). It should have clear boundaries and limited dependencies on the rest of the app.

2. **Build the new micro-frontend** - Implement the feature as a standalone application with its own build, tests, and deployment.

3. **Route to the new micro-frontend** - Behind a feature flag or for specific users, serve the new implementation instead of the old.

4. **Migrate incrementally** - Once stable, expand rollout. Then pick the next slice.

5. **Shrink the monolith** - As features move out, the monolith shrinks. Eventually it may become just a shell or disappear entirely.

**Practical advice from teams who've done it:**

RST Software's guide emphasizes: "Migration is not a one-time process. It starts by decomposing the existing monolithic app into micro-frontends, but it can repeat itself when boundaries need to change."

The Medium engineering blog notes: "The key takeaway is that while completely rewriting a monolith can be a tempting option, it's often not the most practical or cost-effective solution."

**Common mistakes:**

- Slicing too thin - Micro-frontends should be small enough to own but big enough to be meaningful. A micro-frontend per component is microservices anti-pattern all over again.
- Ignoring the shell - The shell (orchestration layer) needs thoughtful design. It's not just plumbing.
- Underestimating operational overhead - Each micro-frontend needs its own CI/CD, monitoring, and error tracking.

## 2. Design Systems at Scale

### Why Design Systems Become Essential

The Nielsen Norman Group defines a design system as "a complete set of standards intended to manage design at scale using reusable components and patterns."

At scale, design systems solve:
- **Inconsistency** - Without shared components, the same button looks different on every page
- **Duplication** - Teams rebuild the same UI patterns instead of sharing
- **Communication overhead** - Designers and developers speak different languages about UI
- **Onboarding time** - New developers must learn custom patterns for every team

IBM's Carbon, Atlassian's design system, and the US Web Design System are public examples of design systems enabling consistency across large organizations.

### Architecture of a Design System

A production design system has multiple layers:

**Design Tokens:**
The primitive values that define your visual language.

```json
// tokens.json
{
  "color": {
    "primary": {
      "base": { "value": "#0066CC" },
      "hover": { "value": "#0052A3" },
      "active": { "value": "#003D7A" }
    },
    "semantic": {
      "error": { "value": "{color.red.600}" },
      "success": { "value": "{color.green.600}" }
    }
  },
  "spacing": {
    "xs": { "value": "4px" },
    "sm": { "value": "8px" },
    "md": { "value": "16px" }
  },
  "typography": {
    "heading": {
      "1": {
        "fontSize": { "value": "32px" },
        "lineHeight": { "value": "40px" },
        "fontWeight": { "value": "700" }
      }
    }
  }
}
```

These tokens are transformed into CSS variables, JavaScript constants, iOS/Android values - whatever platforms need them.

**Core Components:**
The foundational UI elements built with tokens.

```typescript
// Button component consuming tokens
const Button = styled.button`
  background: var(--color-primary-base);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--typography-body-fontSize);
  border-radius: var(--radius-md);

  &:hover {
    background: var(--color-primary-hover);
  }
`;
```

**Patterns:**
Combinations of components that solve common problems - form layouts, card grids, navigation patterns.

**Documentation:**
Usage guidelines, do/don't examples, accessibility requirements, code snippets.

### Multi-Platform Design Systems

Nathan Curtis's analysis of design systems managing multiple platforms notes that large organizations often need parallel implementations for web, iOS, and Android.

IBM's Carbon, for example, provides:
- React components for web
- Angular and Vue wrappers
- Sketch and Figma libraries for designers
- Documentation that covers all platforms

**Shared principles, platform-native implementation:**

The design tokens and patterns are shared. The implementations are native to each platform.

```
tokens/
  colors.json        # Single source of truth
  spacing.json
  typography.json

platforms/
  web/
    react/           # React components
    vue/             # Vue components
  ios/
    swift/           # SwiftUI components
  android/
    kotlin/          # Jetpack Compose components
  figma/
    components.fig   # Figma component library
```

### Governance and Contribution

A design system without governance becomes a dumping ground. With too much governance, teams route around it.

**The federated model:**

A core team maintains the foundations (tokens, core components). Product teams contribute patterns and compositions that solve their specific needs. Contributions go through a review process before becoming part of the official system.

Nathan Curtis describes this as moving from "solitary teams making a library available" toward "a federated approach" where domain teams contribute.

**Minimum viable team:**

At minimum: one interaction designer, one visual designer, one developer. This team defines guidelines, builds examples, and reviews contributions. Larger organizations have dedicated design system teams with product managers, technical writers, and platform specialists.

**Contribution workflow:**

1. Team identifies a missing component or pattern
2. Team proposes the addition with use cases
3. Design system team reviews for generality and consistency
4. Contribution is built following system conventions
5. Documentation is added
6. Component is released with proper versioning

### Versioning and Breaking Changes

Component libraries need semantic versioning. Breaking changes in a button component shouldn't silently break ten applications.

**Versioning strategies:**

- **Semantic versioning** - MAJOR.MINOR.PATCH. Breaking changes bump MAJOR.
- **Independent component versions** - Each component versioned separately. More complex but finer-grained.
- **Changelogs** - Document what changed and migration paths.

```typescript
// Package.json for design system
{
  "name": "@company/design-system",
  "version": "4.2.1",
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0"
  }
}
```

**Deprecation process:**

1. Mark old API as deprecated with console warnings
2. Document migration path
3. Maintain deprecated API for N major versions
4. Remove in future major version

## 3. Advanced State Patterns

### Finite State Machines and Statecharts

When UI logic becomes genuinely complex - multi-step forms, real-time collaboration, payment flows - ad-hoc state management creates bugs. State machines provide formal correctness guarantees.

XState implements Harel statecharts, which extend finite state machines with:

- **Hierarchical states** - States can contain substates
- **Parallel states** - Multiple state machines running simultaneously
- **Guards** - Conditional transitions
- **Actions** - Side effects on transitions or state entry/exit

**Example: Payment flow with retry logic**

```typescript
import { createMachine, assign } from 'xstate';

const paymentMachine = createMachine({
  id: 'payment',
  initial: 'idle',
  context: {
    amount: 0,
    retries: 0,
    error: null,
  },
  states: {
    idle: {
      on: {
        START_PAYMENT: {
          target: 'validating',
          actions: assign({ amount: (_, event) => event.amount }),
        },
      },
    },
    validating: {
      invoke: {
        src: 'validatePayment',
        onDone: 'processing',
        onError: {
          target: 'error',
          actions: assign({ error: (_, event) => event.data.message }),
        },
      },
    },
    processing: {
      invoke: {
        src: 'processPayment',
        onDone: 'success',
        onError: [
          {
            // Retry up to 3 times
            target: 'retrying',
            cond: (context) => context.retries < 3,
          },
          {
            target: 'failed',
          },
        ],
      },
    },
    retrying: {
      after: {
        // Exponential backoff
        RETRY_DELAY: {
          target: 'processing',
          actions: assign({ retries: (ctx) => ctx.retries + 1 }),
        },
      },
    },
    success: {
      type: 'final',
      entry: 'notifySuccess',
    },
    failed: {
      type: 'final',
      entry: 'notifyFailure',
    },
    error: {
      on: {
        RETRY: 'validating',
        CANCEL: 'idle',
      },
    },
  },
}, {
  delays: {
    RETRY_DELAY: (context) => Math.pow(2, context.retries) * 1000,
  },
});
```

This is more code than `useState` booleans, but the states are explicit, transitions are defined, and impossible states literally cannot happen. The machine can be visualized, tested exhaustively, and reasoned about.

### Signals and Fine-Grained Reactivity

The signals pattern, popularized by Solid.js and adopted by Preact, Angular, and others, provides fine-grained reactivity that avoids unnecessary re-renders.

In React, changing state re-renders the component and its children. With signals, only the specific DOM nodes that read the signal update.

```typescript
// Solid.js signal example
import { createSignal } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);

  // This whole component doesn't re-render on count change
  // Only the specific text node updates
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**Trade-offs:**

- **Pros:** Better performance for frequent updates, less work for the framework
- **Cons:** Different mental model than React, less ecosystem tooling (for now)

Angular's signals, Preact's signals, and Vue's reactivity system all implement variations of this pattern. If you're building apps with many frequently-updating values (real-time dashboards, collaborative editing), signals provide performance benefits.

### Event Sourcing on the Frontend

For applications where audit trails matter (collaborative documents, financial applications), event sourcing captures every state change as an immutable event.

```typescript
// Events are the source of truth
type Event =
  | { type: 'ITEM_ADDED'; payload: { id: string; name: string; price: number } }
  | { type: 'ITEM_REMOVED'; payload: { id: string } }
  | { type: 'QUANTITY_CHANGED'; payload: { id: string; quantity: number } }
  | { type: 'DISCOUNT_APPLIED'; payload: { code: string; percentage: number } };

// Current state is derived by replaying events
function deriveCartState(events: Event[]): CartState {
  return events.reduce((state, event) => {
    switch (event.type) {
      case 'ITEM_ADDED':
        return {
          ...state,
          items: [...state.items, {
            id: event.payload.id,
            name: event.payload.name,
            price: event.payload.price,
            quantity: 1,
          }],
        };
      case 'ITEM_REMOVED':
        return {
          ...state,
          items: state.items.filter(i => i.id !== event.payload.id),
        };
      // ... handle other events
    }
  }, initialState);
}
```

**Benefits:**
- Complete audit trail
- Time-travel debugging (replay to any point)
- Easy undo/redo
- Events can sync across devices/users

**Costs:**
- More storage
- Deriving state from events has computational cost
- Requires careful event schema design

## 4. Performance at Scale

### Performance Budgets

A performance budget sets limits on metrics that matter. This makes performance a feature requirement, not an afterthought.

**Common budget metrics:**

- **JavaScript size:** Max 300KB gzipped for initial bundle
- **Total page weight:** Max 1.5MB including images
- **Time to Interactive (TTI):** Under 5s on 3G
- **Largest Contentful Paint (LCP):** Under 2.5s
- **Cumulative Layout Shift (CLS):** Under 0.1

```javascript
// Webpack budget enforcement
module.exports = {
  performance: {
    maxAssetSize: 300000,      // 300KB
    maxEntrypointSize: 500000, // 500KB
    hints: 'error',            // Fail build if exceeded
  },
};
```

**Process enforcement:**

- Budgets in CI - builds fail if budgets are exceeded
- Lighthouse CI for automated performance testing
- Performance monitoring in production (Real User Monitoring)

### Runtime Performance Patterns

**Virtualization for long lists:**

Rendering 10,000 list items is slow. Virtualization renders only visible items.

```typescript
import { useVirtual } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef();

  const virtualizer = useVirtual({
    size: items.length,
    parentRef,
    estimateSize: useCallback(() => 50, []),
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.totalSize}px`, position: 'relative' }}>
        {virtualizer.virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Debouncing and throttling:**

For frequent events (scrolling, resizing, typing), limit how often handlers run.

```typescript
// Debounce search input - only search after user stops typing
const debouncedSearch = useMemo(
  () => debounce((query) => performSearch(query), 300),
  []
);

// Throttle scroll handler - run at most every 100ms
const throttledScroll = useMemo(
  () => throttle((position) => updateHeader(position), 100),
  []
);
```

**Memoization:**

React's `useMemo` and `useCallback` prevent recalculations. But don't memoize everything - the overhead can exceed the benefit for simple operations.

```typescript
// Worth memoizing - expensive calculation
const sortedProducts = useMemo(
  () => products.sort((a, b) => complexSortLogic(a, b)),
  [products]
);

// Not worth memoizing - simple operation
const fullName = firstName + ' ' + lastName; // Just compute it
```

**Web Workers for heavy computation:**

Move CPU-intensive work off the main thread.

```typescript
// main.js
const worker = new Worker('./heavy-computation.worker.js');

worker.postMessage({ data: largeDataset });

worker.onmessage = (event) => {
  setResults(event.data);
};

// heavy-computation.worker.js
self.onmessage = (event) => {
  const result = expensiveOperation(event.data);
  self.postMessage(result);
};
```

### Monitoring and Observability

You can't improve what you don't measure. Production performance monitoring is essential at scale.

**Real User Monitoring (RUM):**

Collect performance metrics from actual users in production.

```typescript
// Web Vitals collection
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }) {
  analytics.track('web-vital', { name, value, id });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```

**Error tracking:**

Capture and aggregate frontend errors with stack traces and context.

```typescript
// Sentry, Bugsnag, or similar
Sentry.init({
  dsn: 'your-dsn',
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1, // 10% of transactions
});

// Capture React error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
}
```

**Performance dashboards:**

Aggregate RUM data into actionable dashboards showing:
- P50, P75, P95 load times
- Performance by geography, device type, connection speed
- Trends over time
- Correlation with deployments

## 5. Multi-Team Coordination

### Code Ownership and Boundaries

With multiple teams, unclear ownership creates conflicts and gaps. Someone changes a component another team depends on. Nobody owns the shared utilities, so they rot.

**CODEOWNERS:**

```
# .github/CODEOWNERS
/src/features/checkout/    @checkout-team
/src/features/catalog/     @catalog-team
/src/components/ui/        @design-system-team
/src/shared/               @platform-team
```

**Architectural boundaries:**

Define which code can import from which. Enforce with tooling.

```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-feature-cross-import',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/(?!$1)' },
    },
  ],
};
```

### Consistent Tooling

When each team chooses their own linting rules, testing frameworks, and build configurations, integration becomes painful.

**Shared configurations:**

```typescript
// packages/eslint-config/index.js
module.exports = {
  extends: ['airbnb', 'prettier'],
  rules: {
    // Company-wide rules
  },
};

// Each team's project
{
  "extends": ["@company/eslint-config"]
}
```

**Monorepo tooling:**

Nx, Turborepo, or Rush provide:
- Consistent build/test/lint commands
- Dependency graph awareness
- Intelligent caching
- Affected-only builds

### API Contracts Between Teams

When the product catalog team changes their data format, the checkout team's code breaks. API contracts prevent this.

**For micro-frontends sharing data:**

- Define TypeScript interfaces in a shared package
- Version the contracts with semantic versioning
- Consumer-driven contract testing (Pact)

```typescript
// packages/contracts/catalog.ts
export interface Product {
  id: string;
  name: string;
  price: Money;
  inventory: InventoryStatus;
}

export interface Money {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

// Catalog team implements this, checkout team consumes it
```

**For event-based communication:**

- Schema registry for event payloads
- Backward compatibility requirements
- Event versioning

## 6. Migration Strategies

### Strangler Fig Pattern in Detail

Named after strangler figs that grow around trees, eventually replacing them. The old system continues running while the new system gradually takes over.

**Implementation:**

1. **Proxy layer** - All traffic goes through a proxy that can route to old or new system
2. **Feature-by-feature migration** - Move one capability at a time
3. **Data synchronization** - Both systems may need to share data during transition
4. **Gradual rollout** - Use feature flags to control which users see which system

```typescript
// Proxy routing logic
app.use('/checkout/*', (req, res) => {
  if (featureFlags.isEnabled('new-checkout', req.user)) {
    // Route to new micro-frontend
    proxy.web(req, res, { target: 'https://new-checkout.example.com' });
  } else {
    // Route to old monolith
    proxy.web(req, res, { target: 'https://monolith.example.com' });
  }
});
```

### Technology Migrations

Migrating from one framework to another (jQuery to React, Angular to Vue) while maintaining functionality.

**Coexistence pattern:**

Run both frameworks simultaneously. New features use new framework. Old features migrate incrementally.

```typescript
// React component wrapping legacy jQuery widget
function LegacyWidgetWrapper({ config }) {
  const containerRef = useRef();

  useEffect(() => {
    // Initialize jQuery widget
    $(containerRef.current).legacyWidget(config);

    return () => {
      // Cleanup jQuery widget
      $(containerRef.current).legacyWidget('destroy');
    };
  }, [config]);

  return <div ref={containerRef} />;
}
```

**Migration checklist:**

- [ ] Audit current usage - what features, what patterns
- [ ] Map equivalents in new framework
- [ ] Identify shared dependencies that need updating
- [ ] Plan migration order - leaf components first
- [ ] Set up both build pipelines
- [ ] Migrate incrementally with tests
- [ ] Monitor for regressions
- [ ] Deprecate old code as new code proves stable

### Rollback Strategies

Migrations fail. Plan for it.

- **Feature flags** - Toggle between old and new implementations instantly
- **Blue-green deployments** - Run both versions, route traffic to one
- **Database migrations** - Ensure data format changes are backward compatible
- **Version compatibility** - New code should handle old data gracefully

## Making Deep Architecture Decisions

At this level, technical decisions are organizational decisions. The right micro-frontend split depends on team structure. The right design system governance depends on company culture. The right performance budget depends on business requirements.

**Questions to answer:**

- What organizational problems are we solving?
- What operational complexity can we handle?
- What's our plan when this doesn't work as expected?
- Who owns this long-term?

The patterns in this guide are powerful tools. But they're tools for specific problems. If you don't have the problem, you don't need the tool. The best architecture is still the simplest one that solves your actual challenges.

## References and Further Reading

**Micro-frontends:**
- Cam Jackson's seminal article on martinfowler.com
- Frontend Mastery's "Understanding Micro Frontends"
- Module Federation documentation

**Design Systems:**
- Nathan Curtis's EightShapes blog
- Atomic Design by Brad Frost
- Storybook documentation for component development

**State Machines:**
- XState documentation and visualizer
- Statecharts.dev
- David Khourshid's talks and articles

**Performance:**
- Web.dev performance guides
- Addy Osmani's work on JavaScript performance
- Core Web Vitals documentation
