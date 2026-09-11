import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

const commaList = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(200).default(10),

  JWT_SECRET: z.string().min(32, 'секрет должен быть не короче 32 символов'),
  JWT_TTL: z.string().default('7d'),

  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGINS: commaList('http://localhost:3000'),

  UPLOADS_DIR: z.string().min(1).default('./uploads'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(200 * 1024 * 1024),
  PREVIEW_WIDTH: z.coerce.number().int().min(64).max(4096).default(640),
  PREVIEW_QUALITY: z.coerce.number().int().min(1).max(100).default(82),

  PLATFORM_HANDLE: z.string().min(2).default('discography'),
  PLATFORM_EMAIL: z.string().min(3).default('admin@diskographia.test'),
  PLATFORM_PASSWORD: z.string().min(8).default('diskographia-admin'),
  HOME_SELECTION_SLUG: z.string().min(1).default('home-selection'),
  HOME_SHOWCASE_SLUG: z.string().min(1).default('home-showcase'),
  PLATFORM_MANIFEST_SLUG: z.string().min(1).default('manifest'),

  SEARCH_PAGE_SIZE: z.coerce.number().int().min(1).max(200).default(24),
  SEARCH_PAGE_SIZE_MAX: z.coerce.number().int().min(1).max(500).default(100),
  PARTICIPANT_ROLE_NAME: z.string().min(1).default('участник'),
  SIMILAR_LIMIT: z.coerce.number().int().min(1).max(100).default(12),
  SEARCH_TAG_FACETS: z.coerce.number().int().min(1).max(500).default(40),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),

  REGISTRATION_OPEN: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) {
    return cached;
  }

  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`неверные переменные окружения:\n${details}`);
  }

  cached = parsed.data;

  return cached;
}
