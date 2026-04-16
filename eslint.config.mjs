import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
    {
        ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "**/.turbo/**"],
    },
    ...tseslint.configs.strict,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],
            "no-console": "warn",
        },
    },
]);
