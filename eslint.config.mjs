import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import angularEslint from "@angular-eslint/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import _import from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import preferArrow from "eslint-plugin-prefer-arrow";
import { fixupPluginRules } from "@eslint/compat";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["projects/**/*", "chatapi/**/*"]), {
    files: ["**/*.ts"],
    extends: compat.extends("plugin:@angular-eslint/template/process-inline-templates"),

    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@angular-eslint": angularEslint,
        "@stylistic": stylistic,
        import: fixupPluginRules(_import),
        jsdoc,
        "prefer-arrow": preferArrow,
    },

    languageOptions: {
        ecmaVersion: 2020,
        sourceType: "module",

        parserOptions: {
            project: ["tsconfig.json"],
            createDefaultProgram: true,
        },
    },

    rules: {
        "@angular-eslint/component-selector": ["error", {
            type: "element",
            prefix: "planet",
            style: "kebab-case",
        }],

        "@angular-eslint/directive-selector": ["error", {
            type: "attribute",
            prefix: "planet",
            style: "camelCase",
        }],

        "@typescript-eslint/consistent-type-definitions": "error",
        "@typescript-eslint/dot-notation": "off",

        "@typescript-eslint/explicit-member-accessibility": ["off", {
            accessibility: "explicit",
        }],

        "@typescript-eslint/no-use-before-define": "error",
        "brace-style": ["error", "1tbs"],

        indent: ["error", 2, {
            SwitchCase: 1,
            flatTernaryExpressions: true,
        }],

        "id-blacklist": "error",
        "@typescript-eslint/interface-name-prefix": "off",
        "sort-keys": "off",
        "@angular-eslint/component-class-suffix": "error",
        "@angular-eslint/contextual-lifecycle": "error",
        "@angular-eslint/directive-class-suffix": "error",
        "@angular-eslint/no-conflicting-lifecycle": "error",
        "@angular-eslint/no-input-rename": "error",
        "@angular-eslint/no-inputs-metadata-property": "error",
        "@angular-eslint/no-output-native": "error",
        "@angular-eslint/no-output-on-prefix": "error",
        "@angular-eslint/no-output-rename": "error",
        "@angular-eslint/no-outputs-metadata-property": "error",
        "@angular-eslint/use-lifecycle-interface": "error",
        "@angular-eslint/use-pipe-transform-interface": "error",
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "error",
        "@typescript-eslint/no-explicit-any": "off",

        "@typescript-eslint/no-inferrable-types": ["error", {
            ignoreParameters: true,
        }],

        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-namespace": "error",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-parameter-properties": "off",

        "@typescript-eslint/no-restricted-types": ["error", {
            types: {
                Object: {
                    message: "Avoid using the `Object` type. Did you mean `object`?",
                },

                Function: {
                    message: "Avoid using the `Function` type. Prefer a specific function type, like `() => void`.",
                },

                Boolean: {
                    message: "Avoid using the `Boolean` type. Did you mean `boolean`?",
                },

                Number: {
                    message: "Avoid using the `Number` type. Did you mean `number`?",
                },

                String: {
                    message: "Avoid using the `String` type. Did you mean `string`?",
                },

                Symbol: {
                    message: "Avoid using the `Symbol` type. Did you mean `symbol`?",
                },
            },
        }],

        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",

        "@typescript-eslint/triple-slash-reference": ["error", {
            path: "always",
            types: "prefer-import",
            lib: "always",
        }],

        "@typescript-eslint/unified-signatures": "error",
        complexity: "off",
        "constructor-super": "error",
        "guard-for-in": "error",
        "id-match": "error",
        "import/no-deprecated": "warn",
        "jsdoc/no-types": "error",
        "max-classes-per-file": "off",
        "no-bitwise": "error",
        "no-caller": "error",
        "no-cond-assign": "error",

        "no-console": ["error", {
            allow: [
                "log",
                "warn",
                "dir",
                "timeLog",
                "assert",
                "clear",
                "count",
                "countReset",
                "group",
                "groupEnd",
                "table",
                "dirxml",
                "error",
                "groupCollapsed",
                "Console",
                "profile",
                "profileEnd",
                "timeStamp",
                "context",
            ],
        }],

        "no-debugger": "error",
        "no-empty": "off",
        "no-eval": "error",
        "no-fallthrough": "error",
        "no-invalid-this": "off",
        "no-new-wrappers": "error",

        "no-restricted-imports": ["error", {
            name: "rxjs/Rx",
            message: "Please import directly from 'rxjs' instead",
        }],

        "@typescript-eslint/no-shadow": ["error", {
            hoist: "all",
        }],

        "no-throw-literal": "error",
        "no-undef-init": "error",
        "no-unsafe-finally": "error",
        "no-unused-labels": "error",
        radix: "error",
        "use-isnan": "error",
        "valid-typeof": "off",
        "arrow-parens": "off",
        "comma-dangle": "off",
        curly: "error",
        "eol-last": "error",
        "jsdoc/check-alignment": "error",

        "max-len": ["error", {
            code: 140,
        }],

        "new-parens": "error",
        "no-multiple-empty-lines": "off",
        "no-trailing-spaces": "error",
        quotes: "off",

        "@stylistic/quotes": ["error", "single", {
            allowTemplateLiterals: "never",
        }],

        "@stylistic/semi": ["error", "always"],
        "@stylistic/type-annotation-spacing": "error",
    },
}, {
    files: ["**/*.html"],
    extends: compat.extends("plugin:@angular-eslint/template/recommended"),
    rules: {},
}]);
