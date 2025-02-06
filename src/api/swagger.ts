import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Deep Research API',
            version: '1.0.0',
            description: 'API for performing deep research and generating reports',
            contact: {
                name: 'API Support',
                url: 'https://github.com/yourusername/deep-research'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'API key for authentication'
                }
            },
            schemas: {
                ResearchRequest: {
                    type: 'object',
                    required: ['query', 'breadth', 'depth'],
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The research query to process'
                        },
                        breadth: {
                            type: 'number',
                            description: 'Number of parallel search queries to generate'
                        },
                        depth: {
                            type: 'number',
                            description: 'Depth of the recursive research process'
                        }
                    }
                },
                ResearchResponse: {
                    type: 'object',
                    properties: {
                        learnings: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'List of learnings from the research'
                        },
                        visitedUrls: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'List of URLs visited during research'
                        }
                    }
                },
                ReportRequest: {
                    type: 'object',
                    required: ['prompt', 'learnings', 'visitedUrls'],
                    properties: {
                        prompt: {
                            type: 'string',
                            description: 'The prompt for generating the report'
                        },
                        learnings: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'List of learnings to include in the report'
                        },
                        visitedUrls: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'List of URLs used as sources'
                        }
                    }
                },
                ReportResponse: {
                    type: 'object',
                    properties: {
                        report: {
                            type: 'string',
                            description: 'Generated report in Markdown format'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message'
                        }
                    }
                }
            }
        },
        security: [
            {
                ApiKeyAuth: []
            }
        ]
    },
    apis: ['./src/api/server.ts']
};

export const specs = swaggerJsdoc(options); 