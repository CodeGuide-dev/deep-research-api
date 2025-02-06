import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;
    const auth = getAuth(req);

    // Check for API key authentication
    if (apiKey) {
        if (!validApiKey) {
            console.error('API_KEY is not set in environment variables');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }

        if (apiKey !== validApiKey) {
            res.status(403).json({ error: 'Invalid API key' });
            return;
        }

        return next();
    }
    
    // Check for Clerk authentication
    if (auth.userId) {;
        return next();
    }

    // Neither authentication method is valid
    res.status(401).json({ error: 'Unauthorized - Provide either a valid API key or Clerk session token' });
}; 