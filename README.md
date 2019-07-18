# ajv-request-validator

[![npm Version](https://img.shields.io/npm/v/ajv-request-validator.svg)](https://www.npmjs.com/package/ajv-request-validator)
[![Build Status](https://travis-ci.org/medleyjs/ajv-request-validator.svg?branch=master)](https://travis-ci.org/medleyjs/ajv-request-validator)
[![Coverage Status](https://coveralls.io/repos/github/medleyjs/ajv-request-validator/badge.svg?branch=master)](https://coveralls.io/github/medleyjs/ajv-request-validator?branch=master)
[![dependencies Status](https://img.shields.io/david/medleyjs/ajv-request-validator.svg)](https://david-dm.org/medleyjs/ajv-request-validator)

Validates the `request` object of popular Node.js web frameworks with [Ajv](https://github.com/epoberezkin/ajv).

## Installation

```sh
npm install ajv-request-validator --save
# or
yarn add ajv-request-validator
```

## Usage

Example with [Express](http://expressjs.com/):

```js
const RequestValidator = require('ajv-request-validator');
const express = require('express');

const app = express();
const reqValidator = new RequestValidator();

app.post(
  '/user',
  reqValidator.compile({
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    }
  }),
  function handler(req, res, next) {
    // Will only be called if `req.body` matches the schema
  }
);
```

Example with [Medley](https://www.npmjs.com/package/@medley/medley)
(works exactly the same with [Fastify](https://www.npmjs.com/package/fastify)):

```js
const RequestValidator = require('ajv-request-validator');
const medley = require('@medley/medley');

const app = medley();
const reqValidator = new RequestValidator();

app.route({
  method: 'POST',
  path: '/user',
  preHandler: reqValidator.compile({
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    }
  }),
  handler: function(req, res) {
    // Will only be called if `req.body` matches the schema
  }
});
```

## API

+ [`new RequestValidator([options])`](#RequestValidator)
  + [`reqValidator.ajv`](#reqvalidatorajv)
  + [`reqValidator.compile(schema[, options])`](#compile)

<a id="RequestValidator"></a>
### `new RequestValidator([options])`

The `ajv-request-validator` module exports a class. The class constructor can optionally
be passed either an [Ajv options object](https://github.com/epoberezkin/ajv#options) or
an existing `ajv` instance.

```js
const RequestValidator = require('ajv-request-validator');

// No options (use Ajv defaults)
const reqValidator = new RequestValidator();

// With Ajv options
const reqValidator = new RequestValidator({
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
});

// With an existing AjV instance
const Ajv = require('ajv');
const ajv = new Ajv();

const reqValidator = new RequestValidator(ajv);

console.log(reqValidator.ajv === ajv); // true
```

### `reqValidator.ajv`

The `ajv` instance that the `reqValidator` will use to compile validation functions.

```js
reqValidator.ajv.addSchema({
  $id: 'user',
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' }
  }
});

reqValidator.ajv.addFormat('userID', /[0-9]{9,16}/);
```

<a id="compile"></a>
### `reqValidator.compile(schema[, options])`

+ `schema` - And `Object` mapping `request` properties to an [Ajv](https://ajv.js.org/) schema.
+ `options` - Optional options `Object`.
  + `options.middleware` - If `false`, a function that directly validates the `request` object will be returned. Defaults to `true`.

Compiles a middleware function that validates the `req` object and then calls `next()` with the
result (either a validation error or `null` on success). The keys of the `schema` object correspond with
the names of the properties on the `req` object to validate (usually `body` or `query`).

```js
const middleware = reqValidator.compile({
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    }
  }
});

// Use in Express
app.post('/user', middleware, (req, res, next) => {
  // This middleware is only called if `req.body` matches the schema
});
```

The `middleware` function is an Express-style middleware function with the signature:

```js
function middleware(req, res, next) { }
```

When the `middleware` option is `false`, `.compile()` returns a function that directly validates
the `request` object.

```js
function validate(req) { } // Returns `null` or an Error
```

```js
const validate = reqValidator.compile({
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    }
  }
}, {middleware: false});

app.post('/user', (req, res, next) => {
  const result = validate(req);
  // `result` will be `null` or an Error
});
```

This is useful when using this module with frameworks that do not have Express-like middleware
(see below for more info).

### Usage with other frameworks

Since the [`.compile()`](#compile) method returns an Express-style middleware
function, it is not initially compatible with frameworks that have a different
middleware signature.

If a different form of middleware is needed, the [`RequestValidator`](#RequestValidator)
class can be subclassed to override the [`.compile()`](#compile) method to return
a function compatible with a specific framework.

Here's an example of extending `RequestValidator` to work with [Koa](https://koajs.com/):

```js
const RequestValidator = require('ajv-request-validator');

class KoaRequestValidator extends RequestValidator {
  compile(schema) {
    const validate = super.compile(schema, {middleware: false});

    return async function koaMiddleware(ctx, next) {
      const err = validate(ctx.request);
      if (err !== null) {
        throw err;
      }
      await next();
    };
  }
}

const reqValidator = new KoaRequestValidator();
```
