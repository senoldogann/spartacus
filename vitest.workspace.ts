import type { TestProjectConfiguration } from "vitest/config";

const workspace: TestProjectConfiguration[] = [
  "packages/*/vitest.config.ts",
  "apps/*/vitest.config.ts",
  "services/*/vitest.config.ts",
  {
    test: {
      name: "integration",
      include: ["tests/integration/**/*.spec.ts"],
    },
  },
];

export default workspace;
