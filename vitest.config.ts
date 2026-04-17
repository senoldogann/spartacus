import { defineConfig } from "vitest/config";
import workspace from "./vitest.workspace.js";

export default defineConfig({
  test: {
    projects: workspace,
  },
});
