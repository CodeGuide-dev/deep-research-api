import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { deepResearch, writeFinalReport } from '../deep-research.js';
import { specs } from './swagger.js';
import { validateApiKey } from './middleware/auth.js';
import dotenv from 'dotenv';
import { generateFeedback, FeedbackResult } from '../feedback.js';
import { clerkMiddleware } from '@clerk/express'

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: [
      'https://app.codeguide.dev',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  }),
);

app.use(express.json());
app.use(clerkMiddleware())

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Types
interface ResearchQuestionsRequest {
    query: string;
    numQuestions?: number;
}

interface ResearchRequest {
    query: string;
    breadth: number;
    depth: number;
    firecrawlKey?: string;
    questionAnswers?: { question: string; answer: string }[];
}

interface ReportRequest {
    prompt: string;
    learnings: string[];
    visitedUrls: string[];
}

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
};

/**
 * @swagger
 * /api/research/questions:
 *   post:
 *     summary: Generate clarifying questions for research query
 *     description: First step in the research process - generates questions to better understand the research direction
 *     tags: [Research]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResearchQuestionsRequest'
 *     responses:
 *       200:
 *         description: Generated clarifying questions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResearchQuestionsResponse'
 *       400:
 *         description: Missing or invalid parameters
 *       401:
 *         description: API key is missing
 *       403:
 *         description: Invalid API key
 *       500:
 *         description: Server error
 */
const handleResearchQuestions: RequestHandler = async (req, res, next) => {
    try {
        const { query, numQuestions } = req.body as ResearchQuestionsRequest;

        if (!query) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        const result: FeedbackResult = await generateFeedback({
            query,
            numQuestions
        });

        res.json(result);
    } catch (error) {
        console.error('Research questions generation error:', error);
        next(error);
    }
};

/**
 * @swagger
 * /api/research:
 *   post:
 *     summary: Perform deep research on a given query
 *     tags: [Research]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResearchRequest'
 *     responses:
 *       200:
 *         description: Research results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResearchResponse'
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: API key is missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const handleResearch: RequestHandler = async (req, res, next) => {
    try {
        const { query, breadth, depth, questionAnswers, firecrawlKey } = req.body as ResearchRequest;

        if (!query || !breadth || !depth) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        // If we have question answers, append them to the query
        let enhancedQuery = query;
        if (questionAnswers && questionAnswers.length > 0) {
            const answersText = questionAnswers
                .map(qa => `${qa.question}\nAnswer: ${qa.answer}`)
                .join('\n\n');
            enhancedQuery = `${query}\n\nAdditional Context:\n${answersText}`;
        }

        const result = await deepResearch({
            query: enhancedQuery,
            breadth,
            depth,
            firecrawlKey
        });

        res.json(result);
    } catch (error) {
        console.error('Research error:', error);
        next(error);
    }
};

/**
 * @swagger
 * /api/report:
 *   post:
 *     summary: Generate a report from research findings
 *     tags: [Report]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportRequest'
 *     responses:
 *       200:
 *         description: Generated report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportResponse'
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: API key is missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const handleReport: RequestHandler = async (req, res, next) => {
    try {
        const { prompt, learnings, visitedUrls } = req.body as ReportRequest;

        if (!prompt || !learnings || !visitedUrls) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        const result = await writeFinalReport({
            prompt,
            learnings,
            visitedUrls
        });

        res.json({
            report: result.reportMarkdown,
            usage: result.usage,
        });
    } catch (error) {
        console.error('Report generation error:', error);
        next(error);
    }
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Register routes
app.post('/api/research/questions', validateApiKey, handleResearchQuestions);
app.post('/api/research', validateApiKey, handleResearch);
app.post('/api/report', validateApiKey, handleReport);

// Error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`API documentation available at http://localhost:${port}/api-docs`);
}); 