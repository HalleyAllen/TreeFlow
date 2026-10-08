module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  extends: ['eslint:recommended'],
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/jsx-uses-vars': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    'no-constant-condition': ['error', { checkLoops: false }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'test/', '.eslintrc.cjs'],
};
