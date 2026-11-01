import nextConfig from 'eslint-config-next'

const eslintConfig = [
  { ignores: ['pitch-visualizer/**', 'athlete-hub/**', '.next/**', 'node_modules/**'] },
  ...nextConfig,
]

export default eslintConfig
