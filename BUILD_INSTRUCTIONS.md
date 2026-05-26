# Docker Build Instructions

## Issues Fixed

### 1. Backend TypeScript Compilation Error
**Problem**: Docker build fails with `error TS2688: Cannot find type definition file for 'jest'`

**Root Cause**: The TypeScript configuration includes test files ("tests/**/*") and references Jest types in the "types" array. During Docker build, TypeScript tries to compile test files but Jest types are not available in the production environment.

**Solution**: Created `tsconfig.build.json` that excludes test files and updated Dockerfile to use this config instead of the default one.

### 2. Frontend Dockerfile Location
**Problem**: Docker cannot find Dockerfile when running from root directory

**Root Cause**: Dockerfiles are located in subdirectories (Backend-app/ and Frontend-app/), not in the root directory.

**Solution**: 
- Created docker-compose.yml in root directory to orchestrate both services
- Created build scripts to handle builds from correct directories
- Provided clear instructions for building from subdirectories

## Quick Start

### Option 1: Using docker-compose (Recommended)
```bash
# From the Admin-Records root directory
docker-compose up --build
```

### Option 2: Using PowerShell (Windows)
```powershell
# From the Admin-Records root directory
.\build-docker.ps1
```

### Option 3: Using Bash (Linux/Mac)
```bash
# From the Admin-Records root directory
./build-docker.sh
```

### Option 4: Manual Build
```bash
# Build backend (from Backend-app directory)
cd Backend-app
docker build -t backend-app .

# Build frontend (from Frontend-app directory)
cd ../Frontend-app
docker build -t frontend-app .
```

## Detailed Build Steps

### Backend Build
The backend Dockerfile now:
1. Installs all dependencies (including devDependencies for migrations)
2. Uses `tsconfig.build.json` which excludes test files
3. Compiles only production source code
4. Runs database migrations on container start

### Frontend Build
The frontend Dockerfile:
1. Uses multi-stage build (build stage + nginx serve stage)
2. Builds the React/TypeScript application
3. Serves the built files via nginx
4. Optimized for production deployment

## Running the Application

### Using docker-compose
```bash
docker-compose up -d
```

Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:3000
- Backend WebSocket: http://localhost:3001

### Using Individual Containers
```bash
# Start backend
docker run -d \
  --name admin-records-backend \
  -p 3000:3000 \
  -p 3001:3001 \
  -v backend-storage:/app/storage \
  -e NODE_ENV=production \
  backend-app

# Start frontend
docker run -d \
  --name admin-records-frontend \
  -p 80:80 \
  frontend-app
```

## Troubleshooting

### If backend build fails with TypeScript errors:
- Ensure you're using the updated Dockerfile that references `tsconfig.build.json`
- Check that `tsconfig.build.json` exists in the Backend-app directory
- Verify that the build command is `npx tsc -p tsconfig.build.json`

### If frontend build fails with "Dockerfile not found":
- Make sure you're in the Frontend-app directory when building
- Or use docker-compose from the root directory

### If you get "Cannot find type definition file for 'jest'":
- This means the build is trying to compile test files
- Use the updated Dockerfile or `tsconfig.build.json` to exclude tests

### If containers fail to start:
- Check logs: `docker logs admin-records-backend` or `docker logs admin-records-frontend`
- Ensure required environment variables are set
- Verify port availability (3000, 3001, 80)

## Files Changed
- `Backend-app/tsconfig.build.json` (new file)
- `Backend-app/Dockerfile` (updated to use tsconfig.build.json)
- `docker-compose.yml` (new file in root directory)
- `build-docker.sh` (new convenience script)
- `build-docker.ps1` (new PowerShell script)
- `BUILD_INSTRUCTIONS.md` (this file)