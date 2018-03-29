'use strict';

const Ajv = require('ajv');

class RequestValidator {
  constructor(ajv) {
    if (!ajv || typeof ajv.compile !== 'function') {
      ajv = new Ajv(ajv);
    }
    this.ajv = ajv;
  }

  compile(schema) {
    if (typeof schema !== 'object' || schema === null) {
      throw new TypeError('schema must be an object');
    }

    const validators = {};
    var hasProps = false;

    for (const propName in schema) {
      hasProps = true;
      validators[propName] = this.ajv.compile(schema[propName]);
    }

    if (hasProps === false) {
      throw new Error('The schema must have at least 1 property');
    }

    const validateReq = compileValidationFunction(validators);
    return createMiddleware(validateReq, validators, createValidationError);
  }
}

function compileValidationFunction(validators) {
  const args = 'req, validators, createError';
  const code = '"use strict"\n' + Object.keys(validators).map(propName => `
    if (validators.${propName}(req.${propName}) === false)
      return createError('${propName}', validators.${propName}.errors)
  `).join('') + `
    return null`;

  return new Function(args, code);
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

function createMiddleware(validateReq, validators, createError) {
  return function middleware(req, res, next) {
    next(validateReq(req, validators, createError));
  };
}

module.exports = RequestValidator;
