import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked,
  { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }, globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-empty': ['error', { allowEmptyCatch: false }], 'no-console': 'error',
      '@typescript-eslint/no-floating-promises': 'error', '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }] } },
  { files: ['src/log.ts'], rules: { 'no-console': 'off' } },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
)
