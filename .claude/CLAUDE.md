# HiSi DevTool Frontend

## Project Overview

**Version**: 0.0.0 (Development)
**Tech Stack**: Vue 3.5+ + TypeScript 5.x + Element Plus + Pinia
**Purpose**: Frontend UI for HiSi DevTool - log analysis, call chain visualization, project management.

## Quick Start

```bash
# Install dependencies
cd hisi-dev-tool-frontend
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Default Dev Port**: 5173
**API Proxy**: Configured in `vite.config.ts` → `http://localhost:8080`

## Architecture

```
src/
├── api/             # API service modules (Axios-based)
├── components/      # Reusable components
│   └── layout/      # Layout components (AppLayout, AppHeader, AppSidebar)
├── router/          # Vue Router configuration
├── stores/          # Pinia stores (if needed)
├── types/           # TypeScript type definitions
├── views/           # Page components
│   ├── log-analysis/   # Log query and report views
│   ├── call-chain/     # Call chain visualization
│   ├── project/        # Project management
│   └── ops/            # Ops monitoring
├── App.vue          # Root component
└── main.ts          # Entry point
```

## Modules

### 1. Log Analysis (`/log-analysis`)
- **LogQuery.vue**: Query logs with filters, pagination
- **ReportDetail.vue**: View analysis report details

### 2. Call Chain (`/call-chain`)
- **ProjectList.vue**: Select project for analysis
- **UriList.vue**: View URIs for selected project
- **CallChainGraph.vue**: ECharts visualization of call chains

### 3. Project Management (`/project`)
- **ProjectList.vue**: Clone, pull, delete projects

### 4. Ops Monitoring (`/ops`)
- **HealthCheck.vue**: System health dashboard
- **ImpactAnalysis.vue**: Code impact analysis
- **ApiDocs.vue**: Interface documentation viewer

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vue | ^3.5.30 | Core framework |
| vue-router | ^4.6.4 | Routing |
| pinia | ^3.0.4 | State management |
| element-plus | ^2.13.5 | UI components |
| axios | ^1.13.6 | HTTP client |
| echarts | ^6.0.0 | Charts/visualization |

## API Configuration

API calls are configured in `src/api/` files. Base URL is set via Axios defaults.

```typescript
// src/api/logAnalysis.ts
import axios from 'axios'
axios.defaults.baseURL = 'http://localhost:8080'
```

## Code Conventions

1. **Composition API**: Use `<script setup lang="ts">` for all components
2. **TypeScript**: Strong typing with interfaces in `types/` directory
3. **Naming**: PascalCase for components, camelCase for functions
4. **Styling**: Scoped CSS within `<style scoped>` blocks
5. **Error Handling**: Use `ElMessage` for user feedback

## Related Projects

- **Backend**: `../hisi-dev-tool` - Spring Boot API server

## Common Tasks

### Adding a New View

1. Create Vue component in appropriate `views/` subdirectory
2. Add route in `router/index.ts`
3. Add navigation item in `components/layout/AppSidebar.vue`
4. Create API module in `api/` if needed
5. Add types in `types/`

### Adding a New API Endpoint

1. Define types in `types/`
2. Create/update API function in appropriate `api/` file
3. Use in component with async/await and error handling