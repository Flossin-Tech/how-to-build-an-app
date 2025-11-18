# Option 2: Vite Module Federation - Research Summary

## Overview

Vite Module Federation is a plugin-based implementation that brings Webpack's Module Federation capabilities to Vite. It enables sharing code and components dynamically at runtime between applications, but unlike Webpack, it requires third-party plugins and has limited production track record.

---

## Available Plugins

Two main plugins provide Module Federation for Vite:

### 1. @originjs/vite-plugin-federation
- **Source:** OriginJS community
- **Compatibility:** Inspired by and compatible with Webpack Module Federation
- **Status:** Earlier plugin with more community usage
- **GitHub:** github.com/originjs/vite-plugin-federation

### 2. @module-federation/vite
- **Source:** Official Module Federation project
- **Compatibility:** Official plugin from Module Federation team
- **Status:** Newer, more actively maintained
- **GitHub:** github.com/module-federation/vite

---

## Key Differences: Vite vs Webpack Module Federation

### Built-in Support
- **Webpack:** Native Module Federation support in Webpack 5+ (built-in)
- **Vite:** Requires third-party plugins (NOT built-in)

### Bundler Technology
- **Webpack:** Uses Webpack bundler
- **Vite:** Uses esbuild for fast bundling (different under the hood)

### Performance & DX
- **Webpack:** Slower dev server, highly configurable, mature
- **Vite:** Faster dev server using esbuild, lightweight setup
- **Trade-off:** Vite's speed comes with limitations (see Production Issues below)

### Module Federation Capabilities
- **Webpack:** Robust, built-in, production-proven
- **Vite:** Limited support via plugins, less mature

### Interoperability
- **Cross-compatibility:** Vite and Webpack apps CAN work together in Module Federation
- **Warning:** "It is NOT recommended to mix Vite and Webpack in React projects" - no guarantee of same chunk generation for commonjs dependencies

### Development Experience
- **Webpack Module Federation:** Seamless dev mode
- **Vite Module Federation:** "A nightmare in dev mode, there's no way to work with it without doing deploying/previewing process"
  - **Reason:** Only host supports dev mode; remotes require build (`vite build`) to generate remoteEntry.js
  - **Workaround:** Use `vite build --watch` for hot updates (not true HMR)

---

## Implementation Details

### Basic Configuration

**Installation:**
```bash
npm install @originjs/vite-plugin-federation --save-dev
# OR
npm install @module-federation/vite --save-dev
```

**Configuration Structure:**
- **name**: Application identifier
- **remotes**: Remote applications to consume
- **exposes**: Components/modules to share with others
- **shared**: Common dependencies (React, React-DOM, etc.) with singleton options

**Key Note:** The filename represents the manifest for exposed modules (remoteEntry.js), referenced within host application.

### State Management Integration

**Challenge:** State sharing is NOT a native feature in Module Federation.

**Redux Sharing Approaches:**

1. **Shared Redux Store Pattern**
   - Create global Redux store in shared application
   - Export wrapper component that configures store
   - Remote components wrap with provider for store access

2. **Federated Store Module**
   - Provide Redux store as federated module
   - Keeps data in sync across microfrontends

3. **Alternative State Managers**
   - **Zustand:** Can be shared via Module Federation
   - **Jotai:** Supports state sharing across federations
   - **Custom Events/Broadcast Channels:** For decoupled communication
   - **PubSub:** Custom implementations

**Best Practice:** "Share as little information as possible to maintain decoupling between microfrontends."

**Common Errors:**
- "Cannot destructure property 'store'" when transferring Redux Toolkit stores
- Complex configuration required for proper singleton sharing

---

## Monorepo Considerations

### Monorepo vs Polyrepo

**Monorepo Tools for Vite + Module Federation:**

#### pnpm Workspaces
- **Capabilities:** Basic shared dependencies, project linking, script execution
- **Best for:** Smaller projects, solo developers, flexibility
- **Integration:** Works well with Vite's native ES modules
- **Limitation:** Not as comprehensive as Nx or Turborepo

#### Turborepo
- **Focus:** Raw speed, intelligent caching, task management
- **Performance:** "Initial build: 30s → From cache: 0.2s" (massive time saver)
- **Philosophy:** Agnostic model, can fall back to npm/yarn/pnpm if needed
- **Best for:** JavaScript/TypeScript monorepos prioritizing speed
- **Polyrepo Support:** Now supports both monorepo and polyrepo

#### Nx
- **Power:** Extensive features, comprehensive tooling
- **Drawbacks:** Steep learning curve, opinionated structure, potential performance impact
- **Customization:** "Difficult to customize for majority of organization needs"
- **Best for:** Large organizations with complex needs

**Popular Combination:** Turborepo + pnpm + Vite for solo devs or small teams

**Industry Examples:**
- Vite and Vue projects use pnpm directly
- Many teams establish baseline with pnpm workspaces + Vite for flexibility

### Shared Component Library

**Requirements:**
- Monorepo OR custom component library needed for uniform UI
- Ensures consistent design system across federated modules
- Can be published as separate package or shared in monorepo

---

## Learning Curve

### Prerequisites
- **Required Knowledge:**
  - Vite fundamentals (not just basic usage)
  - Module Federation concepts (how runtime sharing works)
  - Understanding of virtual modules
  - ESM vs CommonJS implications

### Documentation Quality

**Official Documentation:**
- Module-federation.io/guide/basic/vite provides official guide
- GitHub repos have examples and configuration docs
- "With @module-federation/vite, the process becomes delightfully simple"

**Community Resources:**
- Multiple beginner guides on DEV.to and Medium (2023-2025)
- Frontend Masters course covering implementation
- Active community creating tutorials

**Gap:** "The practical guide I wish I had" - indicates some friction in learning

### Time to Proficiency

**Estimate for React developers with basic Vite knowledge:**
- **Understanding concepts:** 1-2 weeks
- **First working implementation:** 2-4 weeks
- **Production-ready proficiency:** 6-10 weeks
- **Troubleshooting production issues:** Additional 2-4 weeks

**Compared to Webpack Module Federation:**
- Vite version has steeper curve due to plugin limitations
- Development workflow more cumbersome (build-required for remotes)

---

## Production Readiness & Maturity (2024)

### Maturity Status

**Overall Assessment:**
- "Vite has matured since 2020 to a frontend tool that can now be safely used for production"
- **However:** "We're still using Webpack in production" (as of late 2023)

**Plugin Maintenance:**
- **@originjs/vite-plugin-federation:** "Not actively maintained, issues beginning to accumulate"
- **@module-federation/vite:** More actively maintained (official plugin)

### Known Production Issues (2024)

#### 1. Critical: Caching Issues with remoteEntry.js
**Problem:**
- Browsers cache remoteEntry.js file
- Users load outdated code after deployment
- **Only resolved by manual browser cache clear**
- "Causing poor user experience in production environments"

**Status:** Open GitHub issues as of 2024, no clear resolution

#### 2. Critical: CSS/Style Loading Problems
**Problem:**
- Remote component styles go missing in production
- Only host CSS loads; remotes appear unstyled
- **Root cause:** Vite splits CSS into separate files; Module Federation only loads JS chunks

**Workarounds exist but add complexity**

#### 3. Development Workflow Limitations
**Problem:**
- Only host supports true dev mode
- Remotes require `vite build` to generate remoteEntry.js
- No hot module replacement for remotes
- **Workaround:** `vite build --watch` (not same DX as HMR)

**Impact:** Significantly slower development iteration for remote apps

#### 4. Framework Compatibility
**Warning:** "Not recommended to mix Vite and Webpack in React projects"
- No guarantee of same chunk generation for commonjs dependencies
- Shared dependency conflicts possible

#### 5. Virtual Module Loading Issues
**Problem:**
- Production builds fail with `virtual:__federation__` module
- Path resolution errors in runtime loading

### Companies Using in Production

**Evidence of Production Use:**
- **Limited named case studies** for Vite Module Federation specifically
- Organizations using **Webpack** Module Federation successfully at scale
- Vite Module Federation still emerging pattern
- Most organizations "exploring Vite for development environments" while keeping Webpack in production

**Conclusion:** Production adoption is LIMITED compared to Webpack Module Federation

---

## Performance Implications

### Development Performance
- **Vite's advantages:** Fast HMR, near-instantaneous hot module reloading
- **Module Federation impact:** Remotes require build step (negates Vite's dev speed)

### Production Performance
- Same bundle size and load time considerations as Webpack Module Federation
- Runtime integration overhead
- CSS splitting issues can increase total requests

---

## Security Considerations (Finance Sector Context)

### Same as Webpack Module Federation
- CORS complexity
- CSP policy coordination
- Subresource Integrity (SRI) for remote modules
- Multiple attack surfaces

### Additional Vite-Specific Risks
- **Immature plugins:** Less battle-tested in production security scenarios
- **Caching issues:** Users running outdated code = potential security vulnerabilities not patched
- **Limited community auditing:** Smaller user base = fewer eyes on security issues

### Compliance Implications
- **Change management:** More complex due to production issues (rollback risks)
- **Audit trails:** Same complexity as general microfrontends
- **Vendor risk:** Plugin maintenance concerns = higher vendor risk
- **Production stability:** Known issues = harder to pass security/compliance review

---

## When Vite Module Federation Makes Sense

### Ideal Scenarios (Rare)
- Already using Vite extensively and team is expert
- Need Module Federation features but can't use Webpack
- Development environment only (not production)
- Small-scale experimentation/learning

### More Common Recommendation
- **Use Webpack Module Federation instead** if Module Federation is required
- Better production stability
- More mature ecosystem
- Broader community support

---

## When NOT to Use Vite Module Federation

### Clear Anti-Patterns (Beyond General Microfrontend Anti-Patterns)

1. **Finance or regulated industries**
   - Production issues unacceptable in compliance-heavy environments
   - Caching bugs = users running outdated/insecure code

2. **Production-critical applications**
   - Known issues with CSS loading, caching, dev workflow
   - Limited production case studies

3. **Teams without deep Vite expertise**
   - Learning curve steep
   - Troubleshooting requires understanding Vite internals

4. **Small teams (<5 developers)**
   - All microfrontend anti-patterns apply
   - PLUS additional Vite Module Federation complexity

5. **When mixing with Webpack apps**
   - "Not recommended" due to chunk generation inconsistencies

---

## Estimated Effort for Our Scenario

**Context:** Finance sector, <500 users, small team, currently using Vite + React

### Setup Time
- Initial plugin configuration: 1-2 weeks
- First working host + remote: 2-3 weeks
- CI/CD pipeline adaptation: 2-3 weeks
- Troubleshooting production issues: 2-4 weeks (ongoing)
- Monorepo setup (if chosen): +2-3 weeks
- **Security/compliance review (finance):** +3-4 weeks (higher scrutiny due to immaturity)

### Learning Curve
- Vite Module Federation concepts: 4-6 weeks
- Debugging distributed apps with Vite quirks: 4-8 weeks
- Team standardization: 2-3 weeks

### Production Hardening
- Workarounds for known issues (CSS, caching): 2-4 weeks
- Testing across browsers and scenarios: 2-3 weeks
- Monitoring and observability setup: 2-3 weeks

### Ongoing Maintenance
- **Significantly higher than Option 1 (general microfrontends):**
  - Plugin updates and compatibility: Ongoing risk
  - Workaround maintenance as Vite evolves: Ongoing
  - Production issue firefighting: Unpredictable

**Total estimated effort:** 16-28 weeks initial + 40-60% ongoing overhead + production risk

---

## Summary: Pros and Cons for Our Context

### Pros
- ✅ Leverages existing Vite knowledge (team already uses Vite)
- ✅ Fast development server for host application
- ✅ Modern developer experience (when it works)
- ✅ Active community creating tutorials and guides

### Cons
- ❌ **Production issues:** Caching bugs, CSS loading problems (critical for finance)
- ❌ **Limited production adoption:** Few named companies using it
- ❌ **Development workflow:** Remotes require build step (negates Vite DX benefit)
- ❌ **Plugin maturity:** Not actively maintained (originjs), newer official plugin less proven
- ❌ **Learning curve:** Steeper than Webpack Module Federation due to quirks
- ❌ **Mixing risk:** Can't reliably mix with Webpack apps
- ❌ **Compliance risk:** Known production issues = harder security review approval
- ❌ **All microfrontend drawbacks apply:** Overkill for <500 users, small team
- ❌ **Higher risk than Option 1:** Less mature, fewer case studies, known bugs

### Verdict for Our Scenario

**Strongly Not Recommended.** This option combines:
1. **All the drawbacks of microfrontends** (organizational complexity for small team)
2. **PLUS additional Vite Module Federation immaturity** (production bugs, caching issues, CSS problems)
3. **PLUS finance sector risk aversion** (compliance won't approve known production issues)

Even if microfrontends were appropriate for our scale (they're not), Vite Module Federation adds unnecessary technical risk over Webpack Module Federation.

**If microfrontends were required:** Use Webpack Module Federation instead.

**Actual recommendation:** Neither microfrontends nor Module Federation appropriate for our scenario.

---

## Comparison to Webpack Module Federation

| Aspect | Webpack Module Federation | Vite Module Federation |
|--------|---------------------------|------------------------|
| **Maturity** | Production-proven since 2020 | Emerging, limited production use |
| **Built-in Support** | Native in Webpack 5+ | Requires plugins |
| **Dev Experience** | Consistent across host + remotes | Host fast, remotes require build |
| **Production Issues** | Well-understood, documented | Known bugs (caching, CSS) |
| **Documentation** | Extensive, official | Growing, community-driven |
| **Companies Using** | Many at scale (named) | Few (unnamed) |
| **Framework Mixing** | Reliable | Not recommended |
| **Plugin Maintenance** | N/A (built-in) | Concerns (originjs not maintained) |
| **Learning Curve** | Moderate | Steeper (due to quirks) |

**Verdict:** If Module Federation is needed, Webpack is the safer choice.

---

## References

### Official Documentation
- Module Federation official docs: module-federation.io
- @originjs/vite-plugin-federation GitHub
- @module-federation/vite GitHub

### Community Resources
- Frontend Masters Vite Module Federation course
- Multiple DEV.to and Medium tutorials (2023-2025)

### Production Issues
- GitHub Issue #642 (originjs): remoteEntry.js caching
- GitHub Issue #18760 (vitejs): caching discussion
- Stack Overflow: Redux sharing errors
- Medium: CSS loading workarounds

### Known Limitations
- "Not recommended to mix Vite and Webpack"
- "Nightmare in dev mode"
- "Not actively maintained" (originjs plugin)
- Limited named production case studies
