
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9002', // Your app's development URL
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false, // Disable if you don't have a support file or set its path
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
  // Increase default command timeout if needed
  defaultCommandTimeout: 5000,
  // Configure viewport size if needed
  // viewportWidth: 1280,
  // viewportHeight: 720,
});
