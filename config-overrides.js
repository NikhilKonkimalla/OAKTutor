const { alias, aliasJest, configPaths } = require('react-app-rewire-alias')

const aliasMap = configPaths('./jsconfig.paths.json') // or jsconfig.paths.json

module.exports = function override(config, env) {
  // Apply alias configuration
  const aliasedConfig = alias(aliasMap)(config, env)
  
  // Fix source-map-loader issue with skulpt.min.js
  // Exclude skulpt from source-map-loader to prevent webpack:// URL errors
  const excludeSkulptFromSourceMapLoader = (rules) => {
    if (!rules) return
    
    rules.forEach((rule) => {
      // Handle oneOf rules (common in Create React App)
      if (rule.oneOf) {
        excludeSkulptFromSourceMapLoader(rule.oneOf)
      }
      
      // Handle regular rules with use array
      if (rule.use && Array.isArray(rule.use)) {
        rule.use.forEach((use) => {
          if (use.loader && use.loader.includes('source-map-loader')) {
            // Add exclude pattern for skulpt
            if (!rule.exclude) {
              rule.exclude = []
            }
            if (!Array.isArray(rule.exclude)) {
              rule.exclude = [rule.exclude]
            }
            // Check if skulpt exclude already exists
            const hasSkulptExclude = rule.exclude.some(
              (exclude) => exclude && exclude.toString && exclude.toString().includes('skulpt')
            )
            if (!hasSkulptExclude) {
              rule.exclude.push(/node_modules\/skulpt/)
            }
          }
        })
      }
      
      // Handle single loader string
      if (typeof rule.loader === 'string' && rule.loader.includes('source-map-loader')) {
        if (!rule.exclude) {
          rule.exclude = []
        }
        if (!Array.isArray(rule.exclude)) {
          rule.exclude = [rule.exclude]
        }
        const hasSkulptExclude = rule.exclude.some(
          (exclude) => exclude && exclude.toString && exclude.toString().includes('skulpt')
        )
        if (!hasSkulptExclude) {
          rule.exclude.push(/node_modules\/skulpt/)
        }
      }
    })
  }
  
  if (aliasedConfig.module && aliasedConfig.module.rules) {
    excludeSkulptFromSourceMapLoader(aliasedConfig.module.rules)
  }
  
  // Also ignore source map warnings for skulpt in webpack 5
  // This is more comprehensive - ignore all source map warnings
  if (!aliasedConfig.ignoreWarnings) {
    aliasedConfig.ignoreWarnings = []
  }
  aliasedConfig.ignoreWarnings.push(
    {
      module: /node_modules\/skulpt/,
    },
    /Failed to parse source map/
  )
  
  return aliasedConfig
}

module.exports.jest = aliasJest(aliasMap)
