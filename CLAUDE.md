# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the source repository for blueprintnotincluded.org, a web application for creating and sharing blueprints for the game Oxygen Not Included. It's a full-stack TypeScript application with an Express.js backend and Angular frontend.

## Architecture

- **Backend**: Express.js with TypeScript (`app/` directory)
  - Main server entry: `app/server.ts`
  - API routes in `app/api/`
  - MongoDB with Mongoose for data persistence
  - JWT authentication for user sessions
  - Blueprint processing and image generation using Canvas and PIXI.js
  - Batch processing scripts for assets in `app/api/batch/`
  
- **Frontend**: Angular application (`frontend/` directory)
  - Blueprint visualization and editing interface
  - Multi-language support (English, Chinese, Russian, Korean)
  - Uses PrimeNG components

- **Shared Library**: TypeScript library (`lib/` directory)
  - Blueprint data structures and utilities
  - Drawing and rendering helpers
  - Shared between frontend and backend

## Development Commands

### Backend Development
- `npm run dev` - Start development server with auto-reload
- `npm run tsc` - Compile TypeScript
- `npm run build` - Full build (backend + frontend + lib)
- `npm run serve:prod` - Run production build

### Testing
- `npm run test` - Run tests with database setup
- `npm run test:only` - Run tests without database setup
- `npm run test:db-setup` - Setup test database only

### Frontend Development (from frontend/ directory)
- `npm start` - Start Angular development server
- `npm run build` - Build for production
- `npm run lint` - Run Angular linting

### Asset Processing
The application processes game assets for blueprint visualization:
- `npm run generateIcons` - Generate sprite icons from game assets
- `npm run generateGroups` - Process sprite groupings
- `npm run generateWhite` - Generate white-background variants
- `npm run generateRepack` - Repack asset database
- `npm run fixHtmlLabels` - Fix HTML formatting in labels

### Docker
- `docker-compose up` - Full development environment with database
- `docker build . -t bpni:latest` - Build production image

## Environment Configuration

Copy `.env.sample` to `.env` and configure:
- `DB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CAPTCHA_SITE`/`CAPTCHA_SECRET` - reCAPTCHA configuration
- `ENV_NAME` - Environment identifier

## Database

Uses MongoDB 4.2 with Mongoose models in `app/api/models/`:
- `blueprint.ts` - Blueprint documents
- `user.ts` - User accounts

## Key Libraries and Technologies

- **Canvas**: Server-side image generation
- **PIXI.js**: Sprite rendering and manipulation
- **Mongoose**: MongoDB ODM
- **Express-JWT**: Token-based authentication
- **Jimp**: Image processing
- **node-mailjet**: Email service (switched from SendGrid)

## Testing

Uses Mocha with Chai and TypeScript support. Test files in `__tests__/` directory. The test database setup script creates a clean test environment.

### Testing Framework Notes
- **Framework**: Mocha with Chai (recommended by Mongoose team for MongoDB testing)
- **Expected Warnings**: 
  - MongoDB driver 3.x circular dependency warnings (will be resolved when upgrading Mongoose in Phase 2)
  - Blueprint API cast error logs in one test (documents existing backend validation bug)
- **Maintenance**: When removing large dependency sets, regenerate package-lock.json with `rm package-lock.json && npm install` to prevent corruption