import { z } from 'zod';

const envSchema = z.object({
  JWT_ACCESS_SECRET: z.string().default('dev-secret'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  DATABASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
