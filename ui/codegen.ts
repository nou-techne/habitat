import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.GRAPHQL_SCHEMA_URL || 'http://localhost:4000/graphql',
  documents: ['src/**/*.{ts,tsx}', 'src/**/*.graphql'],
  generates: {
    'src/lib/generated/': {
      preset: 'client',
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
        skipTypename: false,
        enumsAsTypes: true,
        dedupeFragments: true,
        nonOptionalTypename: true,
      },
    },
  },
}

export default config
