const AppError = require('../utils/AppError');

/**
 * Runs a Joi schema against the given request source (body/query/params)
 * and replaces it with the validated+coerced value. Throws VALIDATION_001
 * with per-field details on failure.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      throw new AppError('VALIDATION_001', details);
    }

    req[source] = value;
    next();
  };
}

module.exports = validate;
