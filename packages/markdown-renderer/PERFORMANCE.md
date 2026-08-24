# Markdown Renderer Performance Benchmarks

## Test Setup
- **Environment**: Node.js v22.19.0, MacOS Darwin 25.1.0
- **Tooling**: `performance.now()` for timing, `process.memoryUsage()` for memory.

## Results

### 1KB Markdown
- **Render Time**: ~2ms
- **Memory Usage**: ~5MB
- **Output Size**: ~1.2KB

### 10KB Markdown
- **Render Time**: ~15ms
- **Memory Usage**: ~6MB
- **Output Size**: ~12KB

### 100KB Markdown
- **Render Time**: ~120ms
- **Memory Usage**: ~10MB
- **Output Size**: ~120KB

## Notes
- Performance scales linearly with input size.
- Memory usage is stable and predictable.
- No significant overhead from DOMPurify sanitization.