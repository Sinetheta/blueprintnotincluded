#!/bin/bash
# Development setup script for ARM64 Mac

echo "🚀 Starting Blueprint Not Included development environment..."

# Check if .env exists, if not copy from sample
if [ ! -f .env ]; then
  echo "📄 Creating .env file from .env.sample..."
  cp .env.sample .env
  echo "✅ .env file created. You may need to customize it for your needs."
fi

# Start only the dependencies with Docker
echo "📦 Starting database and mail services..."
docker compose up -d database mailhog

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
until docker compose exec database mongo --eval "print('MongoDB is ready')" >/dev/null 2>&1; do
  sleep 2
done

echo "✅ Development dependencies are ready!"
echo ""
echo "🔧 To start the application:"
echo "  Backend:  npm run dev"
echo "  Frontend: cd frontend && npm start"
echo ""
echo "🌐 Access points:"
echo "  Frontend: http://localhost:4200"
echo "  Backend:  http://localhost:3000"
echo "  Database: mongodb://localhost:27017"
echo "  Mail UI:  http://localhost:8025"
echo ""
echo "🛑 To stop dependencies: docker compose down"