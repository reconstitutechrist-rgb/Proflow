# Proflow

A project management application with AI-powered features built with Vite+React and Supabase.

## AI Models Used

Proflow integrates multiple AI models to power its intelligent features:

### Language Models

- **Anthropic Claude (claude-sonnet-4-20250514)**: Used for the AI Research Assistant, providing research capabilities, document analysis, and intelligent responses with optional web search functionality.

### Embeddings

- **OpenAI text-embedding-ada-002**: Used for document embeddings in the RAG (Retrieval Augmented Generation) system, enabling semantic search and intelligent document Q&A in the "Ask AI" feature.

### AI Features

- **AI Research Assistant**: Powered by Anthropic Claude for research queries and document analysis
- **Ask AI (RAG)**: Uses OpenAI embeddings for semantic document search with advanced chunking strategies
- **AI Assistant Widget**: Context-aware assistant using the ProjectFlowExpert agent
- **Document Generation**: AI-assisted document creation and content generation

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

For more information and support, please contact the development team.
