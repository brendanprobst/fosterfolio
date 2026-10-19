import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "client/components/inbox/**/*.{ts,tsx}",
      "client/components/charts/**/*.{ts,tsx}",
      "client/components/qr/**/*.{ts,tsx}",
      "client/components/markdown/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@client/features/*", "@client/pages/*"],
              message:
                "Harvestable component: no app/feature imports. Pass data in via props.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
