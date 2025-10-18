# Contributing

We welcome contributions! Please follow these guidelines to ensure quality and consistency.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`

## Development Workflow

### Build & Test

```bash
# Install dependencies
pnpm install

# Build all targets
pnpm run build

# Run tests
pnpm test

# Watch mode for development
pnpm run dev
pnpm run test:watch

# Production readiness tests
pnpm run test:production

# Coverage report
pnpm run test:coverage
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Type checking
pnpm run build:types
```

## Development Guidelines

### Test Coverage
- Maintain test coverage above 90%
- Write tests for all new features
- Include edge cases and error scenarios
- Use the testing utilities provided

### Security Best Practices
- Follow OWASP Top 10 guidelines
- Validate all inputs
- Use secure defaults
- Include security tests for new features
- Never expose sensitive data in logs

### Performance
- Include performance benchmarks for new features
- Ensure operations are optimized
- Use caching where appropriate
- Add metrics collection for monitoring

### Logging
- Add structured logging for all operations
- Use appropriate log levels (debug, info, warn, error)
- Include context in log messages
- Never log sensitive data

### Documentation
- Update API documentation for changes
- Include examples in docstrings
- Update relevant markdown files
- Add inline comments for complex logic

## Pull Request Process

1. **Run Quality Gates**
   ```bash
   # Ensure all tests pass
   pnpm test
   
   # Check production readiness
   pnpm run test:production
   
   # Verify linting
   pnpm run lint
   
   # Run security audit
   pnpm run test:security
   ```

2. **Update Documentation**
   - Update README.md if needed
   - Update relevant docs in `/docs`
   - Add examples for new features
   - Update CHANGELOG.md

3. **Commit Your Changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
   
   Use clear, descriptive commit messages:
   - `feat: Add new agent capability`
   - `fix: Resolve memory leak in cache`
   - `docs: Update configuration guide`
   - `test: Add security tests`
   - `perf: Optimize batch processing`

4. **Push to Branch**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open Pull Request**
   - Provide clear description of changes
   - Reference related issues
   - Include test results
   - Add screenshots for UI changes

## Code Style

### TypeScript
- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces for public APIs
- Follow existing patterns

### Naming Conventions
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case

### Structure
- Keep files under 400 lines
- One class per file (with exceptions)
- Group related functionality
- Use dependency injection

## Testing Requirements

### Unit Tests
```typescript
describe('FeatureName', () => {
  it('should handle expected case', () => {
    // Test implementation
  });
  
  it('should handle error case', () => {
    // Test error handling
  });
});
```

### Integration Tests
```typescript
describe('Integration: FeatureName', () => {
  beforeEach(async () => {
    // Setup
  });
  
  it('should work end-to-end', async () => {
    // Integration test
  });
});
```

### Production Tests
```typescript
describe('Production: FeatureName', () => {
  it('should meet performance requirements', async () => {
    // Performance test
  });
  
  it('should handle production load', async () => {
    // Load test
  });
});
```

## Release Process

Maintainers will handle releases:

1. Version bump following semver
2. Update CHANGELOG.md
3. Create release tag
4. Publish to npm
5. Update documentation

## Questions or Issues?

- **Discord**: Join our community
- **GitHub Issues**: For bugs and features
- **Discussions**: For questions and ideas

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.



