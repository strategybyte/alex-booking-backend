import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import notFound from './app/middlewares/notFound';
import router from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { PaymentController } from './app/modules/payment/payment.controller';

const app = express();

// Stripe webhook - MUST be before express.json() middleware
app.use(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook,
);

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://103.121.217.80:3316',
      'http://103.121.217.80:3315',
      'https://alex-booking-frontend.vercel.app',
      'https://alex-booking-admin-frontend.vercel.app',
      'https://portal.alexrodriguez.com.au',
      'https://www.alexrodriguez.com.au',
      'https://alexrodriguez.com.au',
      'https://new.alexrodriguez.com.au'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Authorization, Origin, X-Requested-With, Accept',
    credentials: true,
  }),
);

// application routes
app.use('/api/v1', router);

app.get('/health', (_req, res) => {
  res.json({ message: 'api is working' });
});

//global error handler
app.use(globalErrorHandler);

// handle not found routes
app.use(notFound);

export default app;
