'use strict';

const Ajv = require('ajv');

class RequestValidator {
  constructor(ajv) {
    if (!ajv || typeof ajv.compile !== 'function') {
      ajv = new Ajv(ajv);
    }
    this.ajv = ajv;
  }

  compile(schema, options) {
    if (typeof schema !== 'object' || schema === null) {
      throw new TypeError('schema must be an object');
    }

    const propNames = Object.keys(schema);

    if (propNames.length === 0) {
      throw new Error('The schema must have at least 1 property');
    }

    const validators = {};

    for (const propName of propNames) {
      validators[propName] = this.ajv.compile(schema[propName]);
    }

    const args = 'req, validators, createError';
    const code = '"use strict"\n' + propNames.map(propName => `
      if (validators.${propName}(req.${propName}) === false)
        return createError('${propName}', validators.${propName}.errors)
    `).join('') + `
      return null`;
    const validateReq = new Function(args, code);

    if (options && options.middleware === false) {
      return createDirectValidator(validateReq, validators, createValidationError);
    }

    return createMiddleware(validateReq, validators, createValidationError);
  }
}

function createValidationError(propName, errors) {
  var message = '';

  for (var i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (i > 0) {
      message += ', ';
    }
    message += '`' + propName + error.dataPath + '` ' + error.message;
  }

  const error = new Error(message);
  error.status = 400;
  return error;
}

function createDirectValidator(validateReq, validators, createError) {
  return function validate(req) {
    return validateReq(req, validators, createError);
  };
}

function createMiddleware(validateReq, validators, createError) {
  return function validationMiddleware(req, res, next) {
    next(validateReq(req, validators, createError));
  };
}

module.exports = RequestValidator;
