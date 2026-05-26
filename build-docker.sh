#!/bin/bash

echo "Building Admin Records Docker images..."
echo "======================================"

# Build backend
echo "Building backend..."
cd Backend-app
docker build -t backend-app .
if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
fi
echo "Backend build completed successfully!"
echo ""

# Build frontend
echo "Building frontend..."
cd ../Frontend-app
docker build -t frontend-app .
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi
echo "Frontend build completed successfully!"
echo ""

# Return to root
cd ..
echo "All builds completed successfully!"
echo ""
echo "To run the application:"
echo "1. Using docker-compose: docker-compose up -d"
echo "2. Using individual containers:"
echo "   - Backend: docker run -d -p 3000:3000 -p 3001:3001 backend-app"
echo "   - Frontend: docker run -d -p 80:80 frontend-app"