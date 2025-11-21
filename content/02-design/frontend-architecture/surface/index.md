---
title: "Frontend Architecture"
phase: "02-design"
topic: "frontend-architecture"
depth: "surface"
reading_time: 8
prerequisites: ["job-to-be-done"]
related_topics: ["architecture-design", "state-management-design", "performance-scalability-design"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-20"
---

# Frontend Architecture

## What This Is About

Frontend architecture is how you organize the code that users actually see and interact with. It's the decisions about how your components talk to each other, where your application state lives, and how you structure things so that adding a new feature doesn't require rewriting half the app.

The stakes here are real. A poorly organized frontend turns every small change into archaeology - digging through tangled dependencies, wondering why changing a button style breaks the shopping cart. Good frontend architecture means you can find things, change things, and ship things without dreading the next deploy.

Most frontend problems aren't about choosing the "right" framework. They're about organizing your code in ways that make sense to humans. React, Vue, Angular, Svelte - they all work fine if you structure things sensibly. They all become nightmares if you don't.

## The Big Decision: How to Split Your App

Just like backend architecture has monoliths and microservices, frontend architecture has similar choices about how to organize code at the highest level.

**Monolithic frontend** - One big application. All your features, pages, and components live in one codebase, built together, deployed together. Most apps start here, and many stay here successfully.

**Component-based architecture** - Still one application, but organized into reusable, self-contained pieces. This is what React, Vue, and most modern frameworks encourage. You build buttons, forms, and data displays as independent components that you compose into pages.

**Micro-frontends** - Multiple separate frontend applications that combine to form one user experience. Different teams can build different parts with different technologies, deploying independently. Think: the header is one app, the product catalog is another, checkout is a third.

Here's the honest assessment: start with a component-based monolith. Micro-frontends solve organizational problems that come with having many teams working on one product simultaneously. If you don't have those problems, you don't need that complexity. Frontend Mastery's analysis puts it plainly: "Micro frontends are all about solving organizational issues, rather than performance ones."

## Component Architecture Basics

Modern frontends are built from components - self-contained pieces that combine markup, styles, and behavior. A well-designed component system makes your life dramatically easier.

**What makes a good component:**

- **Single responsibility** - A component does one thing well. A `UserAvatar` displays a user's image. It doesn't also handle user authentication or store user preferences.

- **Clear inputs and outputs** - Props go in, events come out. A `SearchBox` takes a placeholder text and emits search queries. Nothing hidden.

- **Self-contained styles** - The component looks right regardless of where you put it. CSS modules, styled-components, or Tailwind - pick something that scopes styles to the component.

A common structure that works:

```
src/
  components/
    ui/                    # Generic building blocks
      Button/
      Input/
      Modal/
    features/              # Business-specific components
      ProductCard/
      CheckoutForm/
      UserProfile/
  pages/                   # Page-level compositions
    Home/
    ProductList/
    Checkout/
  shared/                  # Utilities and hooks
    hooks/
    utils/
```

The principle: UI components are reusable across features. Feature components are specific to your business. Pages compose them together. Each layer only imports from layers below it, never above.

## State Management: Where Your Data Lives

State management is the source of most frontend suffering. It doesn't have to be.

**What is state?** Anything that can change: user input, fetched data, UI toggles, shopping cart contents, authentication status.

**Where should it live?** This is the actual question.

**Local state** - Data that only one component needs. Form input values, whether a dropdown is open, current tab selection. Keep this in the component that uses it. React's `useState`, Vue's `ref`, Svelte's `let` - all work fine.

**Shared state** - Data that multiple components need. Currently logged-in user, shopping cart contents, application theme. This needs to live somewhere accessible to all those components.

The patterns for shared state range from simple to elaborate:

1. **Prop drilling** - Pass data down through component props. Works for shallow hierarchies, becomes painful when you're passing props through five layers of components that don't actually use them.

2. **Context/Provider pattern** - React Context, Vue's provide/inject, Svelte stores. Good for semi-global things like themes, user authentication, or feature flags.

3. **State libraries** - Redux, Zustand, MobX, Jotai. These become valuable when you have lots of shared state with complex update logic. Zustand and Jotai are lighter weight; Redux is more structured with extensive tooling.

The honest guidance: start simple. Use local state by default. Lift state up when components need to share it. Reach for a state library when you're actually feeling the pain of complex shared state, not before.

As the Zustand documentation notes, "The beauty of Zustand lies in its straightforward API and minimal learning curve. There's no need for providers, complex setup, or additional dependencies." That philosophy - using the simplest tool that solves your problem - applies to all state management decisions.

## Build Tools: Vite vs Webpack vs Others

Your build tool bundles your code for the browser, handles hot reloading during development, and optimizes things for production.

**Vite** is now the default choice for new projects. It uses native ES modules during development, which means near-instant server starts regardless of app size. Kinsta's benchmarks show Vite achieving build times 5-6x faster than Webpack. It works with React, Vue, Svelte, and vanilla JavaScript out of the box.

**Webpack** has been the standard for years and powers most existing projects. It's highly configurable and has a massive plugin ecosystem. The downside is slower development server startup as your project grows, and more complex configuration.

**esbuild** and **Turbopack** are newer options focused on raw speed. Turbopack is from the Next.js team and claims even faster performance than Vite.

For new projects, use Vite unless you have a specific reason not to. For existing Webpack projects, migration to Vite is possible but not always worth the effort - Webpack works fine, it's just slower.

## Performance Basics: What Actually Matters

Frontend performance affects whether people use your product. Slow sites lose users. This isn't theoretical - Google's research shows a 3-second load time increases bounce probability by 32%.

**Three things to get right from the start:**

**1. Don't ship unnecessary JavaScript**

Modern build tools have tree shaking - they eliminate code you import but don't use. But they can't eliminate the code you shouldn't have imported in the first place. Be mindful of dependency sizes. Do you need all of lodash, or just one function?

**2. Load things when needed**

Code splitting breaks your app into chunks that load on demand. Users downloading the checkout code before they've even browsed products is wasted bandwidth. React's `lazy()` and `Suspense`, or dynamic imports in Vue and Svelte, handle this.

```javascript
// Instead of importing everything upfront
import { HeavyChartLibrary } from 'charts';

// Load it when the user actually needs it
const HeavyChartLibrary = lazy(() => import('charts'));
```

**3. Choose your rendering strategy**

- **Client-side rendering (CSR)** - Browser downloads JavaScript, JavaScript renders the page. Simple, but users see a blank screen until JS loads.

- **Server-side rendering (SSR)** - Server sends fully rendered HTML. Users see content immediately. Good for SEO and initial load time, more complex to set up.

- **Static site generation (SSG)** - Pages are pre-rendered at build time. Fastest possible load times, but content is static until rebuild.

Next.js, Nuxt, and SvelteKit all support mixing these strategies. A marketing landing page can be SSG for speed, while a user dashboard is SSR for fresh data.

## Three Warning Signs Your Frontend Architecture Is Wrong

**Sign 1: Prop drilling hell**

You're passing data through five components just to get it to the one that needs it. None of the intermediate components use the data; they're just passing it along. This means your state isn't living in the right place.

**Sign 2: Components doing too much**

Your `ProductPage` component is 800 lines and handles fetching products, managing the cart, displaying reviews, and showing related items. This should be multiple components, each with one job.

**Sign 3: Changes cascade everywhere**

You update a user profile field and suddenly need to change the header, the settings page, the dashboard, and three utility functions. This indicates too much coupling - components reaching into each other's business instead of communicating through clean interfaces.

## Your First Frontend Architecture Decision

For your first version, build a component-based single-page application with a sensible folder structure.

- Organize components by type (UI vs features) or by feature (all product-related code together)
- Keep state local to components unless it genuinely needs to be shared
- Use your framework's built-in state primitives before reaching for libraries
- Set up code splitting for routes at minimum

Don't optimize for problems you don't have yet. You can always add Zustand when local state gets unwieldy. You can add micro-frontends when you have multiple teams stepping on each other. You probably won't need either.

The architecture that matters most is the one that lets you and your team find code, understand code, and change code without breaking things. Start simple, stay organized, and evolve as you learn what your specific application actually needs.

## Next Steps

Before making frontend architecture decisions, understand what you're building (see Job-to-be-Done in Discovery & Planning). Your frontend architecture should align with your overall system architecture (see Architecture Design in this phase).

For deeper state management patterns, see State Management Design. For performance-specific guidance, see Performance & Scalability Design.

Right now: pick a modern framework, set up Vite, organize your components sensibly, and keep your state simple. The rest will become clear as you build.
