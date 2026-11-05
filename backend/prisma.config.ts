import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

config();

export default defineConfig({
  prisma: {
    migrations: {
      dir: 'prisma/migrations',
    },
    seed: 'tsx prisma/seed.ts',
  },
});
