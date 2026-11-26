import type { NextFunction, Request, Response } from 'express';

/**
 * Logs one searchable line for every 5xx response, including handled ones that never throw.
 * CloudWatch's metric filter counts `API_5XX` lines, which drives the api-5xx alarm.
 */
export function logServerErrorResponses(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      console.error(`API_5XX status=${res.statusCode} ${req.method} ${req.path}`);
    }
  });
  next();
}
