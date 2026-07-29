import next from 'eslint-config-next';

export default [
  ...next(),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'drizzle/**'] },
];
