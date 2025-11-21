---
title: "Frontend Architecture - Mid-Depth"
phase: "02-design"
topic: "frontend-architecture"
depth: "mid-depth"
reading_time: 25
prerequisites: ["job-to-be-done", "architecture-design"]
related_topics: ["state-management-design", "performance-scalability-design", "api-design"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-20"
---

# Frontend Architecture - Mid-Depth

You've built frontends that work. Now you're facing questions like "Why does our app feel slow as it grows?" or "How do we prevent the checkout team from breaking the product catalog?" or "Should we migrate to micro-frontends?" This guide covers the practical decisions that determine whether your frontend stays maintainable as it scales.

## 1. Component Architecture Patterns

### Atomic Design and Component Hierarchies

Brad Frost's Atomic Design provides a useful mental model for organizing components. The taxonomy goes: atoms (buttons, inputs), molecules (search forms, cards), organisms (headers, product grids), templates (page layouts), pages (specific instances).

The value isn't the names - it's the thinking. Components at lower levels should be more generic and reusable. Components at higher levels become more specific and compositional.

A practical structure that follows this thinking:

```
src/
  components/
    primitives/           # Atoms - pure UI building blocks
      Button/
        Button.tsx
        Button.test.tsx
        Button.module.css
      Input/
      Icon/

    patterns/             # Molecules - combinations of primitives
      FormField/          # Label + Input + Error message
      SearchBar/          # Input + Button + Icon
      Card/

    features/             # Organisms - business functionality
      ProductGrid/
      CheckoutSummary/
      UserProfileEditor/

    layouts/              # Templates - page structures
      DashboardLayout/
      MarketingLayout/

  pages/                  # Specific page instances
    HomePage/
    ProductPage/
```

**The dependency rule**: components can only import from the same level or below. `ProductGrid` can use `Card` and `Button`, but `Button` can never import `ProductGrid`. This keeps your dependency graph sane.

### Container vs Presentational Components

Dan Abramov popularized this pattern in 2015, then somewhat walked it back, but the core insight remains useful: separate what things look like from what they do.

**Presentational components** - Concerned with appearance. Receive data via props, render UI, emit events. No state management, no API calls, no business logic.

```typescript
// Presentational - just renders what it's given
function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <Button onClick={() => onAddToCart(product.id)}>
        Add to Cart
      </Button>
    </div>
  );
}
```

**Container components** - Concerned with data and logic. Handle API calls, state management, and pass data to presentational components.

```typescript
// Container - handles data fetching and state
function ProductCatalogContainer() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const handleAddToCart = async (productId) => {
    await cartApi.addItem(productId);
    // Update local state, show notification, etc.
  };

  if (loading) return <Spinner />;

  return (
    <ProductGrid>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </ProductGrid>
  );
}
```

Modern hooks blur this distinction somewhat - you can use `useQuery` in a component that also renders UI. The principle still holds: keeping data logic separate from rendering logic makes components easier to test and reuse.

### Composition Over Configuration

Prefer composing components together over building components with many configuration props.

**Configuration approach** (brittle):

```typescript
// Modal with 15 props, hard to extend
<Modal
  title="Confirm Delete"
  body="Are you sure?"
  confirmText="Delete"
  cancelText="Cancel"
  confirmColor="red"
  showCloseButton={true}
  size="medium"
  onConfirm={handleDelete}
  onCancel={handleCancel}
/>
```

**Composition approach** (flexible):

```typescript
// Modal is just a container, you compose the contents
<Modal onClose={handleCancel}>
  <Modal.Header>
    <h2>Confirm Delete</h2>
    <Modal.CloseButton />
  </Modal.Header>

  <Modal.Body>
    <p>Are you sure you want to delete this item?</p>
  </Modal.Body>

  <Modal.Footer>
    <Button variant="secondary" onClick={handleCancel}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </Modal.Footer>
</Modal>
```

The composition approach is more verbose but infinitely more flexible. Need a modal with three buttons? A form inside? A custom header? You just compose what you need without touching the Modal component.

## 2. State Management Strategies

### Categorizing State

Not all state is the same, and different types benefit from different management approaches:

**Server state** - Data fetched from APIs. Has concepts like caching, background refetching, optimistic updates, and stale-while-revalidate. Tools like React Query, SWR, and Apollo Client handle this specifically and well.

**UI state** - Interface status: which tab is selected, whether a modal is open, current form values. Usually local to components.

**Client state** - Application data that doesn't come from the server: shopping cart contents (before checkout), draft documents, user preferences that haven't been saved.

**URL state** - Current route, query parameters, hash. This is state too - and it should be the source of truth for anything that should persist through refresh or be shareable via URL.

A common mistake is putting server state into Redux or Zustand. If you're manually tracking loading, error, and data states for API calls, you're reinventing what React Query does better. Server state has specific needs (caching, deduplication, background updates) that general state libraries don't address.

```typescript
// Don't do this - managing server state manually
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetchProducts()
    .then(setProducts)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);

// Do this - let a purpose-built tool handle it
const { data: products, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
});
```

### Redux vs Zustand vs Others

The state library landscape has settled into a few main approaches:

**Redux Toolkit** - The mature, full-featured option. Strict unidirectional data flow, excellent DevTools, large ecosystem. The boilerplate that plagued old Redux is mostly gone. Choose this when you need middleware, time-travel debugging, or have a large team that benefits from strict conventions.

**Zustand** - Minimal setup, hooks-based, no providers needed. The Zustand docs summarize it well: direct state updates without reducers, components only re-render when their specific slice of state changes. Choose this when you want simple shared state without ceremony.

```typescript
// Zustand store - minimal boilerplate
import { create } from 'zustand';

const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  clearCart: () => set({ items: [] }),
}));

// Usage in component
function CartButton() {
  const items = useCartStore((state) => state.items);
  return <button>Cart ({items.length})</button>;
}
```

**Jotai / Recoil** - Atomic state management. State is split into small, independent atoms that components subscribe to individually. Good for apps with many small, interrelated pieces of state.

**MobX / Valtio** - Proxy-based reactivity. State is mutable (the library tracks changes). Less common in new projects but can feel more natural if you're coming from Vue or don't like immutability.

The state management comparison from Zustand's docs puts it simply: Zustand and Redux are conceptually similar (immutable state model), but Zustand doesn't require context providers and has less boilerplate.

### Finite State Machines for Complex UI

When your component has multiple boolean flags (`isLoading`, `isError`, `isSubmitting`, `isSuccess`), you can end up with "impossible states" - combinations that should never happen but technically can. A form that's simultaneously loading and errored. A modal that's both open and closed.

Finite state machines prevent this by ensuring exactly one state at a time. The CSS-Tricks analysis explains: "By having boolean flags, you technically have 2^n possible states where n is the number of boolean flags."

XState is the most popular library for this pattern:

```typescript
import { createMachine, assign } from 'xstate';

const formMachine = createMachine({
  id: 'form',
  initial: 'idle',
  context: {
    data: null,
    error: null,
  },
  states: {
    idle: {
      on: { SUBMIT: 'submitting' }
    },
    submitting: {
      invoke: {
        src: 'submitForm',
        onDone: {
          target: 'success',
          actions: assign({ data: (_, event) => event.data })
        },
        onError: {
          target: 'error',
          actions: assign({ error: (_, event) => event.data })
        }
      }
    },
    success: {
      on: { RESET: 'idle' }
    },
    error: {
      on: {
        RETRY: 'submitting',
        RESET: 'idle'
      }
    }
  }
});
```

This is more code than boolean flags, but the states are explicit and transitions are defined. You can visualize the machine, test each state, and guarantee impossible states can't happen.

You don't always need XState - a simple state variable with string values (`'idle' | 'loading' | 'success' | 'error'`) is often enough. The XState approach pays off for genuinely complex flows: multi-step forms, payment processing, real-time collaboration features.

## 3. Build Tooling and Bundling

### Why Vite Wins for New Projects

Vite's speed advantage comes from its development architecture. Traditional bundlers like Webpack bundle your entire app before serving - every file, every dependency. Vite uses native ES modules in development, serving files directly to the browser and only transforming them on demand.

Kinsta's benchmarks show Vite with 5-6x faster builds and minimal performance degradation as projects grow, while Webpack slows significantly with project size.

Vite configuration is also simpler:

```typescript
// vite.config.ts - usually this simple
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

### When Webpack Still Makes Sense

Vite isn't always the answer:

- **Existing large projects** - Migration isn't free. If Webpack is working, the speed gain may not justify the effort.
- **Module Federation** - For micro-frontends, Webpack's Module Federation is more mature than Vite's alternatives.
- **Specific plugin needs** - Webpack's plugin ecosystem is larger. Some specialized transformations only exist for Webpack.
- **Legacy browser support** - Vite targets modern browsers by default. If you need IE11 support (please don't), Webpack handles this better.

### Bundle Analysis and Optimization

Regardless of your bundler, understand what you're shipping:

```bash
# Webpack
npx webpack-bundle-analyzer stats.json

# Vite
npx vite-bundle-visualizer
```

Common findings:
- Moment.js including every locale (switch to date-fns or Luxon)
- Lodash imported wholesale instead of specific functions
- Multiple versions of the same library due to dependencies
- Development tools accidentally in production bundles

Set a performance budget and enforce it:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500, // KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split vendor code by package
            return id.split('node_modules/')[1].split('/')[0];
          }
        },
      },
    },
  },
});
```

## 4. Performance Optimization Techniques

### Code Splitting Strategies

Code splitting isn't just for routes. Consider splitting:

**By route** (baseline):
```typescript
// React with lazy loading
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
```

**By feature**:
```typescript
// Heavy chart library only when needed
const AnalyticsDashboard = lazy(() => import('./features/Analytics'));
```

**By interaction**:
```typescript
// Load editor only when user clicks "Edit"
const handleEdit = async () => {
  const { RichTextEditor } = await import('./components/RichTextEditor');
  setEditor(RichTextEditor);
};
```

### Rendering Strategies: When to Use What

**Static Site Generation (SSG)**
- Best for: Marketing pages, documentation, blogs
- Trade-off: Content is fixed until rebuild. Can't personalize without client-side hydration.
- Tools: Next.js `getStaticProps`, Astro, Gatsby

**Server-Side Rendering (SSR)**
- Best for: Dynamic content that needs SEO, personalized pages, fresh data on each request
- Trade-off: Server must render each request. Higher infrastructure costs.
- Tools: Next.js `getServerSideProps`, Nuxt, Remix

**Incremental Static Regeneration (ISR)**
- Best for: Content that changes periodically but doesn't need real-time freshness
- Trade-off: First user after cache expiry gets stale content while regeneration happens
- Tools: Next.js with `revalidate`

```typescript
// Next.js ISR - regenerate at most every 60 seconds
export async function getStaticProps() {
  const products = await fetchProducts();
  return {
    props: { products },
    revalidate: 60, // seconds
  };
}
```

**Client-Side Rendering (CSR)**
- Best for: Highly interactive apps behind authentication, real-time features
- Trade-off: Blank page until JS loads. Poor SEO without additional work.
- Tools: Create React App, Vite (default mode)

**Islands Architecture**
- Best for: Content-heavy sites with isolated interactive components
- Trade-off: Requires thinking about hydration boundaries explicitly
- Tools: Astro, Fresh

Jason Miller (creator of Preact) explains islands: "The guiding principle is to default to server-side rendering and only send what is absolutely necessary to the client for interactivity."

### Hydration Strategies

Full hydration (making server-rendered HTML interactive) can be expensive. Progressive and selective hydration strategies help:

**Lazy hydration** - Hydrate components when they enter viewport
**Partial hydration** - Only hydrate interactive components, not static content
**Progressive hydration** - Hydrate in priority order: critical UI first, below-fold later

```typescript
// Lazy hydration example with Nuxt
<template>
  <LazyHydrate when-visible>
    <HeavyChart :data="chartData" />
  </LazyHydrate>
</template>
```

## 5. Testing Frontend Architecture Decisions

### What to Test at Each Level

**Component tests** - Does the component render correctly with given props? Do interactions trigger the right callbacks?

```typescript
// React Testing Library approach
test('ProductCard shows add to cart button', () => {
  const onAddToCart = jest.fn();
  render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

  fireEvent.click(screen.getByText('Add to Cart'));

  expect(onAddToCart).toHaveBeenCalledWith(mockProduct.id);
});
```

**Integration tests** - Do components work together? Does the page load data and display it correctly?

**E2E tests** - Does the full user flow work? Can a user browse products, add to cart, and checkout?

The testing pyramid applies: many unit/component tests, fewer integration tests, even fewer E2E tests. But for frontends, the line between component and integration tests is fuzzy. Test at the level where you get useful confidence.

### Testing State Logic

Complex state logic is much easier to test when separated from components:

```typescript
// Zustand store test
import { useCartStore } from './cartStore';

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

test('addItem adds product to cart', () => {
  useCartStore.getState().addItem({ id: 1, name: 'Widget', price: 10 });

  expect(useCartStore.getState().items).toHaveLength(1);
  expect(useCartStore.getState().items[0].name).toBe('Widget');
});
```

XState machines are particularly testable - you can verify all transitions:

```typescript
test('form transitions from idle to submitting on SUBMIT', () => {
  const nextState = formMachine.transition('idle', { type: 'SUBMIT' });
  expect(nextState.value).toBe('submitting');
});
```

## 6. Common Pitfalls and How to Avoid Them

### Premature Abstraction

Creating abstractions before you understand the patterns leads to the wrong abstractions. Building a "generic form component" before you've built five specific forms usually results in a component that doesn't quite fit any of them.

**Wait for the pattern to emerge.** When you find yourself copying code the third time, then consider abstracting. The duplication shows you what actually varies and what stays the same.

### Over-Centralized State

Not everything needs to be in global state. A modal's open/closed state, a form's draft values, a component's loading indicator - these are local concerns.

Redux stores that track `isLoginModalOpen` and `searchInputValue` become maintenance nightmares. Every component change requires store updates. Every state interaction requires actions and reducers.

**Keep state as local as possible.** Only lift it when genuinely needed across components.

### God Components

Components that do everything: fetch data, manage state, handle routing, render UI. The 1000-line component file.

Signs you have god components:
- You can't explain what it does in one sentence
- It imports from a dozen different modules
- Changes to unrelated features require editing it
- New team members are afraid to touch it

**Split by responsibility.** Extract custom hooks for data fetching. Extract subcomponents for distinct UI sections. Use composition to assemble them.

### Neglecting Loading and Error States

The "happy path" is maybe 20% of the UI work. Real applications need:
- Loading states (skeleton screens, spinners)
- Error states (user-friendly messages, retry options)
- Empty states (helpful guidance when no data exists)
- Partial failure states (some data loaded, some failed)

Design these upfront. A component that only handles the success case isn't done.

## Making Architecture Decisions

Your frontend architecture should match your team and product:

**Solo developer or small team?** Component-based monolith with simple state management. Don't add complexity you don't have people to maintain.

**Multiple teams on one product?** Consider Module Federation or micro-frontends, but only if teams genuinely need to deploy independently.

**Content-heavy with some interactivity?** Islands architecture (Astro) minimizes JavaScript while enabling rich interactive components where needed.

**Highly interactive app?** SPA with robust state management. Consider SSR for initial load performance.

The right architecture is the simplest one that solves your actual problems. Teams repeatedly report that migrating to micro-frontends solved organizational issues but added technical complexity. If you don't have the organizational issues, keep the simpler architecture.

## Next Steps

With your component architecture and state management approach decided, consider:

- **API Design** - How your frontend communicates with backends
- **Performance & Scalability Design** - Deeper optimization strategies
- **State Management Design** - Domain-specific state patterns

For implementation:
- Set up your build tooling (Vite for most new projects)
- Establish component organization conventions
- Configure testing infrastructure
- Implement basic performance monitoring

The architecture decisions you make now set the trajectory. Get the fundamentals right - clear component boundaries, sensible state management, and good build tooling - and you'll be able to evolve the system as you learn what it needs.
