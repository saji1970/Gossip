import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3100', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gossip',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openaiKey: process.env.OPENAI_API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@gossipapp.com',
  },
  inviteBaseUrl: process.env.INVITE_BASE_URL || 'https://gossip.app/invite',
  redis: {
    contextTtl: 3600, // 1 hour
  },
};
