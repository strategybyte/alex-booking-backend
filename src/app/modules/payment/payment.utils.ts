import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

// Initialize Stripe
export const stripe = new Stripe(config.stripe_secret_key!);

// Convert dollars to cents
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

// Convert cents to dollars
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

// Calculate Stripe processing fee and total charge amount
// Stripe fee: 2.9% + $0.30 (added on top of base amount)
export const calculateStripeFee = (
  baseAmount: number,
): { stripeFee: number; total: number } => {
  const stripeFee = Math.round((baseAmount * 0.029 + 0.3) * 100) / 100;
  const total = Math.round((baseAmount + stripeFee) * 100) / 100;
  return { stripeFee, total };
};

// Validate webhook signature
export const constructWebhookEvent = (
  payload: Buffer | string,
  signature: string,
): Stripe.Event => {
  // Check if webhook secret is configured
  if (!config.stripe_webhook_secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Webhook secret not configured',
    );
  }

  try {
    // Ensure payload is a Buffer
    const body = typeof payload === 'string' ? Buffer.from(payload) : payload;

    console.log('Webhook verification attempt:', {
      payloadType: typeof payload,
      payloadLength: body.length,
      hasSignature: !!signature,
      signatureFormat: signature.substring(0, 20) + '...',
    });

    return stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe_webhook_secret,
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      payloadType: typeof payload,
      payloadPreview:
        typeof payload === 'string'
          ? payload.substring(0, 100)
          : payload.toString().substring(0, 100),
      signature: signature.substring(0, 50) + '...',
    });

    // In development, you might want to skip verification for testing
    if (
      config.node_env === 'development' &&
      process.env.SKIP_WEBHOOK_VERIFICATION === 'true'
    ) {
      console.warn('⚠️  DEVELOPMENT: Skipping webhook signature verification');
      try {
        return JSON.parse(payload.toString());
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid JSON payload');
      }
    }

    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid webhook signature: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
