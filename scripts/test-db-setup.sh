#!/bin/bash

# Check if MongoDB is running on port 27017
if ! nc -z localhost 27017; then
    echo "MongoDB is not running on localhost:27017"
    echo "Starting MongoDB via Docker..."

    # Use docker compose (v2) instead of docker-compose (v1)
    docker compose up -d mongodb-bpni

    # Wait for MongoDB to be ready
    echo "Waiting for MongoDB to be ready..."
    timeout=30
    while ! nc -z localhost 27017; do
        timeout=$((timeout - 1))
        if [ $timeout -eq 0 ]; then
            echo "Timeout waiting for MongoDB to start"
            exit 1
        fi
        sleep 1
    done

    echo "MongoDB is ready!"
else
    echo "MongoDB is already running on localhost:27017"
fi
