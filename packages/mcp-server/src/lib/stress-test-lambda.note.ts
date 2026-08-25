/**
 * Story Agent: Stress Testing Lambda Handler
 * 
 * This file is deployed to AWS Lambda separately and does NOT need to compile
 * with the main pnpm monorepo. It's included here for reference and will be
 * deployed via terraform apply or manual Lambda deployment.
 * 
 * This is a standalone Node.js file for AWS Lambda runtime.
 * 
 * See: lambda/stress-test-handler.js (the actual deployable version)
 */

// This is the TypeScript source version. The actual Lambda deployment uses:
// lambda/stress-test-handler.js (JavaScript)
//
// The JavaScript version can be built by running:
// cd terraform && npm install && npx esbuild stress-test-handler.js --bundle --platform=node --target=node20 --outfile=dist/stress-test-handler.zip

console.log(
  'See lambda/stress-test-handler.js for the actual Lambda implementation'
);
