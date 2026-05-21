import * as v from 'valibot'
import { ApiError } from '../http/api.js'

function issuesToDetails(issues) {
  return issues.reduce((accumulator, issue, index) => {
    const key = issue.path?.map((entry) => entry.key).join('.') || `field_${index + 1}`
    accumulator[key] = issue.message
    return accumulator
  }, {})
}

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = v.safeParse(schema, req.body)

    if (!result.success) {
      return next(
        new ApiError(
          422,
          'unprocessable_entity',
          'Request body validation failed.',
          issuesToDetails(result.issues),
        ),
      )
    }

    req.body = result.output
    return next()
  }
}
