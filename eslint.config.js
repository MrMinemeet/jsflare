import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**"]
  },
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly"
      }
    }
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "quotes": ["error", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
      "semi": ["error", "always"],
      "curly": ["error", "all"],
      "no-var": "error",
      "prefer-const": ["error", { "destructuring": "all" }],
      "object-shorthand": ["error", "always"],
      "no-implicit-coercion": "error",
      "yoda": "error",
      "prefer-template": "error",
      "no-useless-concat": "error",
      "radix": "error",
      "no-undef-init": "error",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ExportDefaultDeclaration",
          "message": "Do not use default exports; use named exports."
        },
        {
          "selector": "TSEnumDeclaration",
          "message": "Google TS style discourages enums; prefer union types or const objects."
        },
        {
          "selector": "TSModuleDeclaration",
          "message": "Do not use TypeScript namespaces; use ES modules instead."
        }
      ],
      "no-array-constructor": "error",
      "no-new-object": "error",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-wrapper-object-types": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": "allow-with-description" }]
    }
  }
];
