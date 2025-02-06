import { Request, Response, NextFunction } from 'express';

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;

    if (!validApiKey) {
        console.error('API_KEY is not set in environment variables');
        res.status(500).json({ error: 'Server configuration error' });
        return;
    }

    if (!apiKey) {
        res.status(401).json({ error: 'API key is missing' });
        return;
    }

    if (apiKey !== validApiKey) {
        res.status(403).json({ error: 'Invalid API key' });
        return;
    }

    next();
}; 