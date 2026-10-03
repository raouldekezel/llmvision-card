import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// Inherits the build-time defines (e.g. __LLMVISION_VERSION__) so tests load the
// same sources the bundle is built from.
export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.js'],
    },
}));
