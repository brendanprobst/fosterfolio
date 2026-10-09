import express, { Router } from 'express';
import { InquiryController } from '@api/controllers/InquiryController';
import { Container } from '@api/infrastructure/container';

export function createInquiryRouter(container: Container): Router {
  const router = express.Router();
  const controller = new InquiryController(container);
  router.post('/', (req, res) => controller.createInquiry(req, res));
  router.patch('/:id/self-reported-source', (req, res) => controller.reportSource(req, res));
  return router;
}
