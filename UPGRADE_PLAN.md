# Blueprint Not Included - Dependency Upgrade Plan

**Status**: In Progress  
**Created**: 2025-08-06  
**Target Completion**: TBD  
**Current Phase**: Planning Complete

## 🎯 Upgrade Objectives

Transform this legacy Node.js application to modern standards while maintaining functionality and minimizing risk:
- Upgrade from Node.js 14/16 to Node.js 20+ 
- Modernize all dependencies to latest stable versions
- Maintain test coverage and functionality
- Improve security posture and developer experience

## 📊 Current State Analysis

### Project Structure
```
blueprintnotincluded/
├── app/                    # Express.js backend (Node 14.18.3)
├── frontend/              # Angular 13 application (Node 16.20.2) 
├── lib/                   # Shared TypeScript library
├── __tests__/             # Jest test suite
└── build/                 # Compiled output
```

### Environment Status
- **Local Node.js**: v18.20.8
- **Backend Requirements**: ^14.18 (.nvmrc: 14, volta: 14.18.3)
- **Frontend Requirements**: volta: 16.20.2
- **Test Status**: ✅ All tests passing (6 tests in blueprints.test.ts)

### Testing Framework Status
- **Framework**: Jest 27.5.1 with ts-jest
- **Config**: jest.config.js with TypeScript support
- **Coverage**: Basic API endpoint tests
- **Commands**: 
  - `npm run test` - Run tests with DB setup
  - `npm run test:only` - Run tests without DB setup
  - `npm run test:db-setup` - Setup test database

### Key Commands Reference
```bash
# Backend Development
npm run dev              # Start dev server with auto-reload
npm run tsc              # Compile TypeScript
npm run build            # Full build (backend + frontend + lib)
npm run serve:prod       # Run production build

# Testing
npm run test             # Run tests with database setup
npm run test:only        # Run tests without database setup

# Frontend (from frontend/)
npm start                # Angular dev server
npm run build            # Build for production
npm run lint             # Angular linting

# Asset Processing
npm run generateIcons    # Generate sprite icons
npm run generateGroups   # Process sprite groupings
```

## 📈 Current vs Target Versions

### Critical Dependencies Matrix

| Component | Current | Latest | Gap | Node Req | Breaking Changes | Risk Level |
|-----------|---------|--------|-----|----------|------------------|------------|
| **Platform** |
| Node.js (Backend) | 14.18.3 | 22 LTS | 8 major | - | Multiple | 🟡 Medium |
| Node.js (Frontend) | 16.20.2 | 22 LTS | 6 major | - | Multiple | 🟡 Medium |
| **Backend Core** |
| TypeScript | 4.9.5 | 5.9.2 | 1 major | - | Stricter types | 🟢 Low |
| Express | 4.17.1 | 5.1.0 | 1 major | 18+ | Middleware changes | 🟡 Medium |
| Mongoose | 5.7.7 | 8.17.0 | 3 major | 16.20.1+ | Schema/API changes | 🔴 High |
| Jest | 27.5.1 | 30.0.5 | 3 major | - | Config changes | 🟡 Medium |
| Canvas | 2.6.1 | 3.1.2 | 1 major | - | Build issues on Node 22 | 🔴 High |
| **Frontend Core** |
| Angular | 13.1.1 | 20.0 | 7 major | 20+ | Massive changes | 🔴 High |
| TypeScript (FE) | 4.5.4 | 5.9.2 | 1 major | - | Stricter types | 🟢 Low |
| **Lib Dependencies** |
| TypeScript (Lib) | 3.5.3 | 5.9.2 | 2 major | - | Major syntax changes | 🔴 High |

### Specific Version Research Notes

#### Node.js Platform
- **Current LTS**: Node.js 22.17.0 (Active LTS until Oct 2025)
- **Recommended Target**: Node.js 20 LTS (due to canvas compatibility issues)
- **Canvas Issue**: Known Node.js 22 installation failures, prebuilds unavailable

#### Framework Versions
- **Express 5.1.0**: Requires Node.js 18+, dropped legacy middleware support
- **Angular 20**: Released May 29, 2025, requires TypeScript 5.8+ and Node.js 20+
- **TypeScript 5.9.2**: Latest stable, significant type system improvements

#### Testing Framework Concern
⚠️ **Critical Decision Point**: Mongoose team strongly discourages Jest usage:
> "Jest is designed primarily for testing React applications... using it to test Node.js server-side applications comes with a lot of caveats. The Mongoose team strongly recommends using a different testing framework, like Mocha"

## 🚨 Major Challenges & Risks

### 🔴 High Risk Items
1. **Canvas + Node 22**: Known compatibility issues requiring source compilation
2. **Angular 13 → 20**: 7 major version jump with breaking changes in:
   - Component architecture (standalone components)
   - Routing system
   - Forms and validation
   - Build system changes
3. **Mongoose 5 → 8**: Breaking changes in:
   - Schema definitions
   - Query API
   - Connection handling
   - Middleware system

### 🟡 Medium Risk Items
4. **Jest + Mongoose**: Known incompatibilities, may require test framework migration
5. **Express 4 → 5**: Middleware API changes, route handler updates
6. **Interdependency Chain**: lib → backend → frontend sharing TypeScript versions

### ⚠️ Technical Debt Concerns
- **Lib TypeScript 3.5.3**: Extremely outdated, blocking other upgrades
- **Limited Test Coverage**: Only basic API endpoint tests
- **Asset Generation Dependencies**: Complex Canvas-based image generation

## 📋 Phased Upgrade Strategy

### Phase 1: Foundation & Environment Setup
**Goal**: Establish stable Node.js environment and basic tooling  
**Duration**: 2-3 days  
**Branch**: `upgrade/phase-1-foundation`

#### Phase 1A: Node.js Environment Upgrade
**Commands to Execute**:
```bash
# 1. Update .nvmrc
echo "20" > .nvmrc

# 2. Update package.json engines
# Backend package.json: "node": "^20.0.0"
# Frontend package.json: volta.node: "20.x.x"

# 3. Update volta configs
volta pin node@20

# 4. Test with new Node version
nvm use 20  # or volta install node@20
npm run test
npm run dev  # Test backend startup
cd frontend && npm start  # Test frontend startup
```

**Validation Steps**:
- [ ] All tests pass with Node 20
- [ ] Backend starts without errors
- [ ] Frontend builds and serves
- [ ] Asset generation scripts work

#### Phase 1B: TypeScript Library Foundation
**Commands to Execute**:
```bash
# 1. Upgrade lib TypeScript (most critical dependency)
cd lib
npm install typescript@5.9.2 @types/node@20 --save

# 2. Update lib/tsconfig.json target
# Change "target": "es5" to "target": "ES2020"
# Update "lib": ["ES2020"]

# 3. Compile and test
npm run tsc

# 4. Test backend integration
cd ..
npm run tsc
npm run test
```

**Expected Issues & Fixes**:
- TypeScript strict mode errors: Add type annotations
- ES5 → ES2020 syntax changes: Update async/await usage
- Node types incompatibility: Update @types/node versions

**Commit**: `upgrade: Node.js 20 LTS and lib TypeScript 5.9`

### Phase 2: Backend Core Dependencies
**Goal**: Upgrade backend to modern, stable versions  
**Duration**: 3-4 days  
**Branch**: `upgrade/phase-2-backend-core`

#### Phase 2A: Core Backend Tooling
**Testing Framework Decision Point**:

**Option A: Keep Jest (Easier)**
```bash
npm install jest@30.0.5 ts-jest@29 @types/jest@29 --save-dev
# Update jest.config.js for v30 compatibility
```

**Option B: Switch to Mocha (Recommended by Mongoose team)**
```bash
# Remove Jest
npm uninstall jest ts-jest @types/jest

# Install Mocha + Chai
npm install mocha@10 chai@4 @types/mocha @types/chai ts-mocha --save-dev

# Update package.json scripts:
# "test": "ts-mocha __tests__/**/*.test.ts"
```

**TypeScript Backend Upgrade**:
```bash
npm install typescript@5.9.2 --save-dev
# Update tsconfig.json target to ES2020
npm run tsc  # Test compilation
```

#### Phase 2B: Database & Core Services
**Mongoose Upgrade Strategy (Incremental)**:

```bash
# Step 1: 5.x → 6.x
npm install mongoose@6
# Follow migration guide: https://mongoosejs.com/docs/migrating_to_6.html
npm run test

# Step 2: 6.x → 7.x  
npm install mongoose@7
npm run test

# Step 3: 7.x → 8.x
npm install mongoose@8.17.0
# Update schema definitions for v8 changes
npm run test
```

**Key Mongoose Migration Areas**:
- Schema type definitions
- Query result types  
- Connection string handling
- Middleware function signatures

**Commits**: 
- `upgrade: backend TypeScript 5.9 and testing framework`
- `upgrade: Mongoose to v8 with migration fixes`

### Phase 3: Backend Web Framework
**Goal**: Upgrade Express and related middleware  
**Duration**: 2-3 days  
**Branch**: `upgrade/phase-3-express`

#### Express.js 5.x Migration
**Commands**:
```bash
# 1. Upgrade Express
npm install express@5.1.0

# 2. Update middleware
npm install helmet@7 express-jwt@8 --save

# 3. Check breaking changes in middleware
# - express-jwt: API changes in v8
# - helmet: configuration changes
```

**Breaking Changes to Address**:
- `express-jwt` v8: Different error handling, configuration format
- Express 5: Removed `res.sendfile()`, use `res.sendFile()`
- Middleware mounting order may need adjustment

**Migration Guide References**:
- https://expressjs.com/en/guide/migrating-5.html
- Update route handlers for deprecated methods
- Test all API endpoints: `/api/getblueprints`, auth routes, etc.

**Validation Steps**:
- [ ] All API endpoints respond correctly
- [ ] Authentication still works  
- [ ] File uploads/downloads work
- [ ] Error handling maintains expected behavior

**Commit**: `upgrade: Express 5 with middleware updates`

### Phase 4: Canvas and Asset Processing  
**Goal**: Address canvas compatibility carefully  
**Duration**: 2-3 days  
**Branch**: `upgrade/phase-4-canvas`

#### Canvas Upgrade Strategy
**Recommended Approach**: Stay on Node 20 + Canvas 3.x

```bash
# 1. Attempt canvas upgrade
npm install canvas@3.1.2

# 2. Test asset generation scripts
npm run generateIcons
npm run generateGroups  
npm run generateWhite

# 3. If Node 22 needed later, monitor:
# https://github.com/Automattic/node-canvas/issues/2377
```

**Asset Generation Testing**:
```bash
# Test all asset processing commands
npm run generateIcons 2>&1 | tee test-icons.log
npm run generateGroups 2>&1 | tee test-groups.log
npm run generateWhite 2>&1 | tee test-white.log
npm run generateRepack 2>&1 | tee test-repack.log

# Verify output files exist and are valid
ls -la build/app/public/icons/
```

**Fallback Plan**:
If Canvas 3.x fails on Node 20:
- Stay on Canvas 2.6.1 temporarily  
- Monitor upstream Node.js 22 support
- Consider alternative image processing libraries (Sharp, Jimp)

**Commit**: `upgrade: canvas and asset processing dependencies`

### Phase 5: Frontend Incremental Upgrade
**Goal**: Carefully upgrade Angular through major versions  
**Duration**: 5-7 days  
**Branch**: `upgrade/phase-5-angular`

#### Phase 5A: Angular 13 → 16 (Incremental)
**Angular 13 → 14**:
```bash
cd frontend
npx @angular/cli@14 update @angular/core@14 @angular/cli@14
npm run build  # Test build
npm run test   # Test if frontend tests exist
```

**Angular 14 → 15**:
```bash
npx @angular/cli@15 update @angular/core@15 @angular/cli@15
# Address standalone components migration
npm run build
```

**Angular 15 → 16**:
```bash
npx @angular/cli@16 update @angular/core@16 @angular/cli@16
# Update to standalone components where beneficial
npm run build
```

#### Phase 5B: Angular 16 → 20 (Major Jump)
**Angular 16 → 18**:
```bash
# Update to Angular 18 (significant changes)
npx @angular/cli@18 update @angular/core@18 @angular/cli@18

# Major changes in v18:
# - New application builder
# - Material Design Components updates  
# - Improved hydration
```

**Angular 18 → 20**:
```bash
# Final upgrade to Angular 20
npx @angular/cli@20 update @angular/core@20 @angular/cli@20

# Angular 20 requires:
# - TypeScript 5.8+
# - Node.js 20+
```

**Key Migration Areas per Version**:
- **v14**: Angular Packages Format, Ivy renderer default
- **v15**: Standalone APIs, optional dependency injection
- **v16**: Standalone ng new, required providers in routes  
- **v17**: New branding, new lifecycle hooks
- **v18**: Material Design Components, new control flow
- **v19**: Event replay, hydration improvements
- **v20**: TBD (latest features)

**Frontend Validation Steps** (after each version):
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] Application loads in browser
- [ ] Core features work: blueprint view, upload, user auth
- [ ] Multi-language support intact

**Commits**:
- `upgrade: Angular 13-16 incremental updates`
- `upgrade: Angular 16-20 with modern features`

### Phase 6: Final Optimizations
**Goal**: Complete upgrade and optimize  
**Duration**: 1-2 days  
**Branch**: `upgrade/phase-6-final`

#### Final Dependency Cleanup
```bash
# 1. Update all remaining dependencies
npm update
cd frontend && npm update
cd ../lib && npm update

# 2. Security audit
npm audit fix
cd frontend && npm audit fix

# 3. Remove deprecated packages
# Review package.json for unused dependencies
npm uninstall <unused-packages>

# 4. Update lock files
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json  
npm install
cd frontend && npm install
```

#### Node.js 22 Future Evaluation
```bash
# If canvas Node.js 22 support is available:
# 1. Test canvas@latest with Node 22
# 2. Update .nvmrc to "22"
# 3. Comprehensive testing
# 4. Performance comparison
```

**Final Validation Checklist**:
- [ ] All tests pass
- [ ] Full application functionality verified
- [ ] Performance benchmarks maintained
- [ ] Security vulnerabilities resolved
- [ ] Documentation updated

**Commit**: `upgrade: final dependency cleanup and optimizations`

## 🧪 Testing Strategy & Safety Measures

### Pre-Phase Checklist
- [ ] Create feature branch: `upgrade/phase-X-description`
- [ ] Run full test suite: `npm run test`
- [ ] Document current functionality
- [ ] Backup database if applicable

### Post-Phase Validation
- [ ] Run full test suite: `npm run test`  
- [ ] Manual QA critical features:
  - [ ] Blueprint upload/download functionality
  - [ ] Image generation (`npm run generateIcons`)
  - [ ] User authentication flow
  - [ ] Database CRUD operations
  - [ ] Frontend loads and navigates properly
- [ ] Performance smoke test
- [ ] Check for console errors/warnings
- [ ] Commit with detailed changelog

### Critical Manual Testing Scenarios
```bash
# Backend API Testing
curl -X GET http://localhost:3000/api/getblueprints?olderthan=2023-01-01
# Should return paginated blueprint data

# Asset Generation Testing  
npm run generateIcons && ls -la build/app/public/icons/
# Should generate icon files without errors

# Frontend Integration Testing
cd frontend && npm start
# Navigate to http://localhost:4200
# Test blueprint viewing, user login, language switching
```

### Rollback Strategy
- Each phase = separate commit with clear message
- Git tags for stable milestones: `stable/pre-upgrade`, `stable/phase-1`, etc.
- Database backup before Mongoose upgrades
- Keep previous Node.js version available via nvm/volta

```bash
# Rollback examples
git reset --hard stable/phase-X
nvm use 14  # or volta pin node@14.18.3
npm install  # Restore old dependencies
```

## 🔄 Alternative Approaches Considered

### Option 1: "Big Bang" Approach
❌ **Rejected**: Upgrade everything at once
- **Pros**: Faster completion
- **Cons**: Too risky with 7+ major version gaps, difficult debugging

### Option 2: "Backend First" Approach ✅ **SELECTED**
✅ **Current Plan**: Backend → Frontend progression
- **Pros**: Establishes stable API foundation, easier debugging
- **Cons**: Longer overall timeline

### Option 3: "Frontend First" Approach
⚠️ **Considered but Rejected**: Frontend → Backend progression  
- **Pros**: User-visible improvements first
- **Cons**: May break lib integration, unstable foundation

### Option 4: "Parallel Track" Approach
⚠️ **Too Complex**: Upgrade backend and frontend simultaneously
- **Pros**: Faster completion
- **Cons**: Complex dependency management, merge conflicts

## 📊 Progress Tracking

### Phase Completion Checklist

#### ✅ Planning Phase 
- [x] Current state analysis
- [x] Dependency research  
- [x] Risk assessment
- [x] Strategy planning
- [x] Documentation created

#### ⏳ Phase 1: Foundation (Not Started)
- [ ] Node.js 20 environment setup
- [ ] .nvmrc and volta configs updated  
- [ ] Lib TypeScript 5.9 upgrade
- [ ] Basic functionality validated
- [ ] Commits created

#### ⏳ Phase 2: Backend Core (Not Started)  
- [ ] Testing framework decision made
- [ ] TypeScript backend upgraded
- [ ] Mongoose incremental upgrade completed
- [ ] All tests passing
- [ ] Commits created

#### ⏳ Phase 3: Express Framework (Not Started)
- [ ] Express 5.x upgraded
- [ ] Middleware compatibility fixed
- [ ] API endpoints tested
- [ ] Authentication verified
- [ ] Commit created

#### ⏳ Phase 4: Canvas & Assets (Not Started)
- [ ] Canvas upgrade completed
- [ ] Asset generation tested
- [ ] Image processing verified
- [ ] Performance validated
- [ ] Commit created

#### ⏳ Phase 5: Angular Frontend (Not Started)
- [ ] Angular 13→16 incremental upgrades
- [ ] Angular 16→20 major upgrade
- [ ] Frontend functionality verified
- [ ] Multi-language support tested
- [ ] Commits created

#### ⏳ Phase 6: Final Cleanup (Not Started)
- [ ] All dependencies updated
- [ ] Security audit clean
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] Final commit created

## 🚨 Emergency Procedures

### If Upgrade Breaks Critical Functionality
1. **Immediate Rollback**:
```bash
git stash  # Save current work
git reset --hard HEAD~1  # Go back one commit
npm install  # Restore dependencies
npm run test  # Verify functionality restored
```

2. **Issue Analysis**:
- Check error logs in `npm run dev` output
- Review breaking changes in upgrade notes
- Test specific failing functionality in isolation

3. **Alternative Approach**:
- Skip problematic upgrade temporarily
- Document issue for future resolution
- Continue with other non-dependent upgrades

### If Tests Start Failing
1. **Identify Root Cause**:
```bash
npm run test -- --verbose  # Get detailed test output
npm run test:only  # Skip DB setup to isolate issues
```

2. **Common Issues & Fixes**:
- **TypeScript errors**: Update type definitions
- **Mongoose connection**: Check connection string format
- **Jest compatibility**: Review jest.config.js settings
- **API changes**: Update test expectations

### If Build Fails
1. **Clean Build**:
```bash
rm -rf node_modules package-lock.json
rm -rf build/
npm install
npm run tsc
```

2. **Check TypeScript Issues**:
```bash
npx tsc --noEmit  # Check types without building
```

## 📚 Key Resources & Documentation

### Migration Guides
- [Express 4 → 5 Migration](https://expressjs.com/en/guide/migrating-5.html)
- [Mongoose 5 → 6 Migration](https://mongoosejs.com/docs/migrating_to_6.html)
- [Angular Update Guide](https://update.angular.io/)
- [Node.js Release Schedule](https://nodejs.org/en/about/previous-releases)

### Version Compatibility References
- [Angular/Node.js Compatibility Matrix](https://angular.io/guide/versions)
- [Mongoose MongoDB Compatibility](https://mongoosejs.com/docs/compatibility.html)
- [Canvas Node.js Support Issues](https://github.com/Automattic/node-canvas/issues/2377)

### Testing & Validation
- [Jest → Mocha Migration Guide](https://mochajs.org/#migrating-from-other-frameworks)
- [Mongoose Testing Best Practices](https://mongoosejs.com/docs/jest.html)

## 🎯 Success Criteria

### Technical Requirements ✅
- [ ] All existing tests passing
- [ ] No regression in core functionality  
- [ ] Build process works end-to-end
- [ ] Asset generation pipeline functional
- [ ] Frontend loads and operates correctly

### Quality Requirements ✅  
- [ ] Improved security posture (npm audit clean)
- [ ] Better developer experience (modern tooling)
- [ ] Performance maintained or improved
- [ ] Clear upgrade documentation
- [ ] Rollback procedures verified

### Business Requirements ✅
- [ ] Blueprint upload/download works
- [ ] User authentication system intact
- [ ] Multi-language support functional
- [ ] Image generation for blueprints works
- [ ] Database operations stable

---

## 📝 Session Notes & Context

### Current Session Information
- **Date**: 2025-08-06
- **Local Node.js**: v18.20.8  
- **Project Status**: Planning complete, ready to begin Phase 1
- **Test Status**: All tests passing (6 tests)
- **Git Status**: Clean working directory on master branch

### Key Decision Points for Next Session
1. **Testing Framework**: Decide Jest vs Mocha before Phase 2
2. **Node.js Target**: Confirm Node 20 vs 22 strategy
3. **Angular Upgrade Path**: Confirm incremental vs direct approach
4. **Canvas Strategy**: Address Node.js compatibility proactively

### Commands to Resume Work
```bash
# Quick environment check
node --version  # Should show current Node version
npm run test     # Should pass 6 tests
git status       # Should show clean working tree

# Begin Phase 1A when ready  
echo "20" > .nvmrc
nvm use 20       # Switch to Node 20
```

### Important Context for Future Sessions
- Canvas package has known Node.js 22 issues - stick with Node 20
- Mongoose team discourages Jest - consider switching to Mocha
- Angular 13→20 is 7 major versions - must be incremental  
- Lib TypeScript 3.5→5.9 upgrade is critical path dependency
- All asset generation scripts depend on Canvas working correctly

**Next Action**: Review this plan, then execute Phase 1A (Node.js 20 upgrade)