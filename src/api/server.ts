import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { deepResearch, writeFinalReport } from '../deep-research';
import { specs } from './swagger';
import { validateApiKey } from './middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Types
interface ResearchRequest {
    query: string;
    breadth: number;
    depth: number;
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
 * /api/research:
 *   post:
 *     summary: Perform deep research on a given query
 *     tags: [Research]
 *     security:
 *       - ApiKeyAuth: []
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
        const { query, breadth, depth } = req.body as ResearchRequest;

        if (!query || !breadth || !depth) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        const result = await deepResearch({
            query,
            breadth,
            depth
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

        const report = await writeFinalReport({
            prompt,
            learnings,
            visitedUrls
        });

        res.json({ report });
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
app.post('/api/research', validateApiKey, handleResearch);
app.post('/api/report', validateApiKey, handleReport);

// Error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`API documentation available at http://localhost:${port}/api-docs`);
}); 