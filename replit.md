# Overview

CasaBot is an AI-powered real estate application that combines a React frontend with an Express.js backend to provide intelligent property search and recommendations. The system features a conversational chat interface powered by OpenAI's GPT-5 model, enabling users to find properties through natural language queries. The application includes property management capabilities, vector-based semantic search, and real-time WebSocket communication for an interactive user experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React 18 using TypeScript and follows a modern component-based architecture:

- **UI Framework**: Utilizes shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **State Management**: React Query (@tanstack/react-query) for server state management with built-in caching and synchronization
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds
- **Component Structure**: Organized into reusable UI components, page components, and business logic hooks

## Backend Architecture
The server follows a RESTful API design with WebSocket support for real-time features:

- **Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints for property CRUD operations with additional search capabilities
- **Real-time Communication**: WebSocket server for live chat functionality with session management
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Development Tools**: Hot reloading with Vite integration in development mode

## Data Storage Solutions
The application uses a hybrid storage approach:

- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **In-Memory Storage**: Fallback memory storage implementation for development/testing
- **Vector Storage**: Custom vector database implementation for semantic property search
- **Session Storage**: PostgreSQL-based session management for WebSocket connections

## Authentication and Authorization
Currently implements a basic foundation for user management:

- **User Schema**: Defined user tables with username/password fields
- **Session Management**: Server-side session handling for WebSocket connections
- **Future-Ready**: Architecture prepared for JWT or session-based authentication implementation

## AI and Search Integration
Advanced search capabilities powered by machine learning:

- **OpenAI Integration**: GPT-5 model for natural language processing and property recommendations
- **Vector Embeddings**: Automatic generation of property embeddings for semantic search
- **Semantic Search**: Cosine similarity matching for finding properties based on natural language queries
- **Chat Intelligence**: Context-aware responses with property recommendations and reasoning

## Real-time Features
WebSocket-based communication system:

- **Chat Sessions**: Persistent chat sessions with unique identifiers
- **Live Responses**: Real-time AI responses with typing indicators
- **Property Integration**: Chat messages can reference and display property information
- **Connection Management**: Automatic reconnection and session recovery

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL hosting service (@neondatabase/serverless)
- **Connection Management**: Environment-based database URL configuration

## AI and Machine Learning
- **OpenAI API**: GPT-5 model for chat responses and embeddings generation
- **Vector Processing**: Custom implementation for embedding storage and similarity search

## UI and Design System
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix primitives

## Development and Build Tools
- **Vite**: Frontend build tool with React plugin
- **ESBuild**: Backend bundling for production deployment
- **PostCSS**: CSS processing with Tailwind CSS integration
- **TypeScript**: Type checking and compilation across the entire stack

## Form and Validation
- **React Hook Form**: Form state management with validation
- **Zod**: Schema validation library integrated with Drizzle ORM
- **Hookform Resolvers**: Bridge between React Hook Form and Zod validation

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time chat
- **Custom Protocol**: Application-specific message types for chat functionality

## Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional CSS class composition
- **class-variance-authority**: Type-safe variant styling system