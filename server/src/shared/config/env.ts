import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
    PORT: z.string().default('4000'),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    DATABASE_URL: z.string(),

    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('7d'),

    MINIO_ENDPOINT: z.string().default('localhost'),
    MINIO_PORT: z.string().default('9000'),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    MINIO_BUCKET: z.string().default('flipmemory'),
    MINIO_USE_SSL: z.string().default('false'),
    MINIO_PUBLIC_ENDPOINT: z.string().default(''),
    MINIO_PUBLIC_PORT: z.string().default(''),

    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379'),
    REDIS_PASSWORD: z.string().default(''),
    REDIS_DB: z.string().default('0'),

    RESEND_API_KEY: z.string().default(''),

    FRONTEND_URL: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
    process.exit(1)
}

export const env = {
    port: parseInt(parsed.data.PORT, 10),
    host: parsed.data.HOST,
    nodeEnv: parsed.data.NODE_ENV,
    isDev: parsed.data.NODE_ENV === 'development',
    isProd: parsed.data.NODE_ENV === 'production',

    databaseUrl: parsed.data.DATABASE_URL,

    jwt: {
        secret: parsed.data.JWT_SECRET,
        expiresIn: parsed.data.JWT_EXPIRES_IN,
    },

    minio: {
        endpoint: parsed.data.MINIO_ENDPOINT,
        port: parseInt(parsed.data.MINIO_PORT, 10),
        accessKey: parsed.data.MINIO_ACCESS_KEY,
        secretKey: parsed.data.MINIO_SECRET_KEY,
        bucket: parsed.data.MINIO_BUCKET,
        useSSL: parsed.data.MINIO_USE_SSL === 'true',
        publicEndpoint: parsed.data.MINIO_PUBLIC_ENDPOINT || parsed.data.MINIO_ENDPOINT,
        publicPort: parseInt(parsed.data.MINIO_PUBLIC_PORT || parsed.data.MINIO_PORT, 10),
    },

    redis: {
        host: parsed.data.REDIS_HOST,
        port: parseInt(parsed.data.REDIS_PORT, 10),
        password: parsed.data.REDIS_PASSWORD || undefined,
        db: parseInt(parsed.data.REDIS_DB, 10),
    },

    resendApiKey: parsed.data.RESEND_API_KEY,

    frontendUrl: parsed.data.FRONTEND_URL,
}
