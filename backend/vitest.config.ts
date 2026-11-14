import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          env: {
            DATABASE_URL: 'postgresql://db:db@localhost:5432/mediachest_test',
            FRONT_URL: 'http://localhost:5173',
            BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long',
          },
          fileParallelism: false, // une seule base partagée entre les fichiers
        },
      },
    ],
  },
});
