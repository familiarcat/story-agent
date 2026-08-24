# Architecture Design Document

## 1. Executive Summary

### Conservative Approach
- Minimal dependencies
- Simple markdown parsing
- Limited customization
- Focuses on stability over features
- Lower maintenance overhead
- Potential limitations in extensibility

### Balanced Approach
- Moderate dependency tree  
- Plugin-based architecture
- Customization through themes
- Security-focused processing pipeline
- Balance between features and stability
      - Supports common markdown extensions
      - Built-in syntax highlighting

### Aggressive Approach  
- Comprehensive markdown ecosystem
- Full plugin extensibility  
- Advanced AST transformations
- Real-time collaboration support
- Maximum flexibility and features
      - Potentially higher maintenance complexity
      - Larger attack surface area

### Consensus Choice: Balanced Approach
The balanced approach was selected as it provides:
1. Sufficient extensibility through plugins
2. Strong security guarantees via strict content filtering
3. Moderate performance overhead with optimizations
4. Clear upgrade paths for future requirements

## 2. Plugin Architecture & Theme Support

### Unified.js Stack
The system leverages the `unified.js` ecosystem for processing markdown content through a pipeline of plugins:
1. **Parse**: `remark-parse` converts markdown to syntax tree  
2. **Transform**: Plugins modify AST (e.g. `remark-gfm` for tables)  
3. **Compile**: `rehype-stringify` renders HTML  

### Core Integration Points
- **Theming**: `unified-themer` applies CSS classes based on AST node types  
- **Linting**: `unified-lint` validates content against schema rules  
- **Security**: Custom remark/rehype plugins sanitize content  

### Architecture Diagram
```
[markdown]  
  → remark-parse → AST  
  → remark-gfm (extensions)  
  → unified-themer (styling)  
  → unified-lint (validation)  
  → rehype-sanitize (security)  
  → rehype-stringify → [html]
```

### Performance Considerations
- Plugin ordering impacts throughput  
- Heavy transforms (e.g. syntax highlighting) are async  
- Caching layer for repeated content

## 3. XSS Prevention Strategy

### Defense Layers
1. **DOMPurify Configuration**
   - Allowlist for HTML elements/attributes (see Threat Model section)
   - Strict URI filtering (`href/src` attributes)
   - Custom hooks to block `javascript:` URIs

2. **Content Security Policy (CSP)**
   ```http
   Content-Security-Policy: 
     default-src 'none';
     script-src 'self';
     style-src 'self' 'unsafe-inline';
     img-src 'self' data:;
     connect-src 'self'
   ```

3. **Runtime Protections**
   - Seccomp filter blocks `execve`/`fork` syscalls
   - Chroot jail for render worker processes

### Security Flow Diagram
```
[raw input]  
  → DOMPurify (sanitize)  
  → Schema validation  
  → CSP-enforced render  
  → Sandboxed iframe (optional)
```

### Testing Requirements
- OWASP ZAP baseline scan (zero high-severity findings)
- Fuzzing with 10k malicious payload samples
- Weekly dependency audits (npm audit)

## 4. Threat Model & Security Assumptions

### Attack Scenarios
1. **Malicious Payload Injection**  
   - SVG with embedded scripts  
   - HTML attribute smuggling (`onload`, `style=javascript:`)  
   - Markdown link spoofing (`[safe](javascript:alert())`)  

2. **Denial of Service**  
   - Billion laughs attack via deeply nested markdown  
   - Regex backtracking bombs in parsers  
   - Memory exhaustion via oversized documents  

3. **Supply Chain Attacks**  
   - Compromised markdown plugins  
   - Typosquatting in npm dependencies  
   - CI/CD pipeline poisoning  

### Mitigations  
- **Input Validation**: Strict schema enforcement  
- **Resource Limits**:  
  ```yaml
  max_depth: 20  
  max_size: 1MB  
  timeout: 500ms  
  ```
- **Dependency Controls**:  
  - Frozen lockfiles  
  - Sigstore attestations  
  - Air-gapped builds for critical releases  

### Permitted HTML Elements and Attributes

| Element     | Permitted Attributes          | Notes                           |
|------------|-------------------------------|--------------------------------|
| `<a>`      | `href`, `title`, `target`     | Only absolute URLs are allowed. |
| `<strong>` | none                          |                                 |
| `<em>`     | none                          |                                 |
| `<ul>`, `<ol>` | none                     |                                 |
| `<li>`     | none                          |                                 |
| `<p>`      | none                          |                                 |
| `<h1>` to `<h6>` | none              |                                 |

This table is cross-referenced with DOMPurify v3.1 configuration.

## 5. Performance Model & SLO Targets

### Key Metrics
- **Render Latency**: <100ms (95th percentile)  
- **Output Size**: <10KB per rendered page (compressed)  
- **Throughput**: 500 req/sec per core  

### Optimization Strategies
1. **WASM Pipeline**  
   - Critical path operations compiled to WebAssembly  
   - Memory-safe hot paths (e.g. markdown parsing)  
   - 50MB memory cap per render process  

2. **Benchmark Approach**  
   - K6 load tests with realistic document samples  
   - Flamegraph analysis for optimization targets  
   - Comparative profiling (WASM vs native)  

### SLO Monitoring
```ascii
[Prometheus] ←─ [Render Metrics]  
   ↓  
[Grafana Dashboards]  
   ↓  
[PagerDuty Alerts]
```

### Degradation Protocol  
1. Automatic fallback to simplified parser  
2. Cache warm-up for frequent documents  
3. Horizontal scaling trigger at 70% CPU

## 6. Integration Points

### Adapter Interfaces
1. **Chat Integration**  
   - Markdown message rendering  
   - Typing indicator support  
   - Threaded reply formatting  

2. **Vision System**  
   - SVG/diagram embedding  
   - Alt-text generation hooks  
   - ARIA attribute injection  

3. **Dashboard**  
   - Real-time update streaming  
   - Metric embedding syntax  
   - Conditional rendering  

4. **Browser Extension**  
   - Content script isolation  
   - Cross-origin CSP rules  
   - Dark mode synchronization  

### Interface Contracts
```typescript
interface RenderAdapter {
  render(markdown: string): Promise<RenderResult>;
  validate?(input: string): boolean;
  version: string;
}
```

### Error Handling  
- Fallback to plaintext on adapter failure  
- Circuit breaker pattern for unhealthy integrations  
- Versioned adapter registry

## 7. Rollback & Compatibility Strategy

### Version Locking
- Exact versions in `package.json` (no caret/ranges)  
- Immutable releases with content hashes  
- Blockchain-notarized build artifacts  

### Monitoring  
```ascii
[Renderer] → [Prometheus Metrics]  
               ↓  
[Version Health Dashboard]  
               ↓  
[Auto-Rollback Trigger]
```

### Rollback Protocol  
1. **Detection**: 5xx errors or perf degradation  
2. **Verification**: Compare metrics to baseline  
3. **Execution**:  
   - Hot-swap to last known-good version  
   - Preserve session state where possible  
   - Post-mortem within 24 hours  

### Compatibility Guarantees  
- **Patch Releases**: Full backward compatibility  
- **Minor Releases**: Deprecation notices for 90 days  
- **Major Releases**: Parallel run period (2 weeks)

## 8. Success Criteria & Approval Checklist

### Implementation Requirements
- [ ] All security mitigations pass OWASP ZAP scan  
- [ ] Performance targets met in staging environment  
- [ ] Integration tests cover 100% of adapter interfaces  
- [ ] Threat model reviewed by security team  

### Documentation Requirements
- [ ] Architecture diagram updated  
- [ ] Rollback procedures documented in RUNBOOK.md  
- [ ] API contracts versioned in OpenAPI format  

### Approval Signoffs  
| Role          | Name       | Date | Notes |  
|---------------|------------|------|-------|  
| Security Lead | Worf       |      |       |  
| Perf Engineer | O'Brien    |      |       |  
| Tech Lead     | Data       |      |       |  
| PM            | Picard     |      |       |