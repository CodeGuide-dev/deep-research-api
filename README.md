# CodeGuide Deep Research API

[![CodeGuide](codeguide-backdrop.svg)](https://codeguide.dev)

> This is a fork of [Open Deep Research](https://github.com/dzhng/deep-research) by [@dzhng](https://x.com/dzhng), enhanced with REST API implementation and integrated into the CodeGuide platform.

An AI-powered research assistant that performs iterative, deep research on any topic by combining search engines, web scraping, and large language models. This enhanced version provides a REST API interface and is integrated into the [CodeGuide platform](https://app.codeguide.dev).

The core functionality remains true to the original project's goal of providing a simple implementation of a deep research agent - one that can refine its research direction overtime and deep dive into a topic.

## Access
<img width="692" alt="Screenshot 2025-02-07 at 22 37 01" src="https://github.com/user-attachments/assets/9f7566f6-860e-41fc-9e68-54b6e9ca09a6" />

This service is available to all CodeGuide members at [app.codeguide.dev](https://app.codeguide.dev).
You'll have access to the following features:
- User-friendly interface for conducting research
- Real-time results and generated reports
- Integrations with other CodeGuide features (coming soon)



## How It Works
```mermaid
flowchart TB
    subgraph Input
        Q[User Query]
        B[Breadth Parameter]
        D[Depth Parameter]
    end

    DR[Deep Research] -->
    SQ[SERP Queries] -->
    PR[Process Results]

    subgraph Results[Results]
        direction TB
        NL((Learnings))
        ND((Directions))
    end

    PR --> NL
    PR --> ND

    DP{depth > 0?}

    RD["Next Direction:
    - Prior Goals
    - New Questions
    - Learnings"]

    MR[Markdown Report]

    %% Main Flow
    Q & B & D --> DR

    %% Results to Decision
    NL & ND --> DP

    %% Circular Flow
    DP -->|Yes| RD
    RD -->|New Context| DR

    %% Final Output
    DP -->|No| MR

    %% Styling
    classDef input fill:#7bed9f,stroke:#2ed573,color:black
    classDef process fill:#70a1ff,stroke:#1e90ff,color:black
    classDef recursive fill:#ffa502,stroke:#ff7f50,color:black
    classDef output fill:#ff4757,stroke:#ff6b81,color:black
    classDef results fill:#a8e6cf,stroke:#3b7a57,color:black

    class Q,B,D input
    class DR,SQ,PR process
    class DP,RD recursive
    class MR output
    class NL,ND results
```

## Features

- **REST API Implementation**: Full REST API support with comprehensive documentation
- **CodeGuide Integration**: Seamlessly integrated with the CodeGuide platform
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Iterative Research**: Performs deep research by iteratively generating search queries, processing results, and diving deeper based on findings
- **Intelligent Query Generation**: Uses LLMs to generate targeted search queries based on research goals and previous findings
- **Depth & Breadth Control**: Configurable parameters to control how wide (breadth) and deep (depth) the research goes
- **Smart Follow-up**: Generates follow-up questions to better understand research needs
- **Comprehensive Reports**: Produces detailed markdown reports with findings and sources
- **Concurrent Processing**: Handles multiple searches and result processing in parallel for efficiency

## API Usage

You can access the API locally or by self-hosting it.

### Authentication

All API requests require authentication that will be defined in the `.env` file.

```bash
# .env
API_KEY="your_development_api_key"
```

### Research Flow

The research process consists of three main steps:

1. **Generate Clarifying Questions**
```bash
# Step 1: Generate questions to better understand the research direction
curl -X POST http://localhost:3000/api/research/questions \
  -H "x-api-key: API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Your research query",
    "numQuestions": 3
  }'
```

2. **Perform Deep Research**
```bash
# Step 2: Conduct the research with your answers to the clarifying questions
curl -X POST http://localhost:3000/api/research \
  -H "x-api-key: API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Your research query",
    "breadth": 6,
    "depth": 3,
    "questionAnswers": [
      {
        "question": "Question from step 1",
        "answer": "Your answer to the question"
      }
    ]
  }'
```

3. **Generate Final Report**
```bash
# Step 3: Generate a comprehensive report using the research results
curl -X POST http://localhost:3000/api/report \
  -H "x-api-key: API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Original research query",
    "learnings": ["Learning 1", "Learning 2"],  # From research response
    "visitedUrls": ["url1", "url2"]            # From research response
  }'
```

The flow allows for an iterative and thorough research process:
1. First, generate clarifying questions to better understand the research needs
2. Use these questions and your answers to guide the deep research process
3. Finally, generate a comprehensive report based on the research findings

## Local Development Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables in a `.env` file:

```bash
FIRECRAWL_KEY="your_firecrawl_key"
# If you want to use your self-hosted Firecrawl, add the following below:
# FIRECRAWL_BASE_URL="http://localhost:3002"

OPENAI_KEY="your_openai_key"

# API Configuration
PORT=3000
API_KEY="your_development_api_key"
```

## Running Locally

Start the API server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000` with documentation at `http://localhost:3000/api-docs`.

## License

MIT License - feel free to use and modify as needed.

## Acknowledgments

This project is a fork of [Open Deep Research](https://github.com/dzhng/deep-research) by [@dzhng](https://x.com/dzhng). We've extended it with REST API capabilities and integrated it into the CodeGuide platform while maintaining the core functionality of the original project.
