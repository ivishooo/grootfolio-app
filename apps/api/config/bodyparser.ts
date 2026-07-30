import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  form: {
    convertEmptyStringsToNull: true,
    types: ['application/x-www-form-urlencoded'],
  },

  json: {
    convertEmptyStringsToNull: true,
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  multipart: {
    autoProcess: true,
    convertEmptyStringsToNull: true,
    processManually: [],
    // Videos de contenidos pueden llegar a 200 MB (F3). El límite por tipo lo
    // valida content_storage; este es el techo del request multipart.
    limit: '250mb',
    types: ['multipart/form-data'],
  },

  raw: {
    types: ['text/*'],
  },
})

export default bodyParserConfig
