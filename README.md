# ajv-request-validator

Tool for validating the `request` object of popular Node.js web frameworks
with [Ajv](https://github.com/epoberezkin/ajv).

+ [Installation](#installation)
+ [Usage](#usage)
+ [API](#api)

## Installation

```sh
# npm
npm install ajv-request-validator --save

# yarn
yarn add ajv-request-validator
```

## Usage

Example with Express:

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
  beforeHandler: reqValidator.compile({
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

With Medley/Fastify, it may be helpful to add the `reqValidator` to the
`app` so that it may be accessed throughout your codebase:

```js
app.decorate('reqValidator', reqValidator);

// Then somewhere else
app.route({
  method: 'POST',
  path: '/user',
  beforeHandler: app.reqValidator.compile({ ... }),
  handler: function(req, res) { }
});
```

## API

+ [`new RequestValidator([options])`](#new-requestvalidatoroptions)
  + [`reqValidator.ajv`](#reqvalidatorajv)
  + [`reqValidator.compile(schema)`](#reqvalidatorcompileschema)
  
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
reqValidator.ajv === ajv; // true
```

### `reqValidator.ajv`

The is a reference to the `ajv` instance that the `reqValidator` will use to
compile validation functions.

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

### `reqValidator.compile(schema)`

Compiles a middleware function that validates the `req` object and then calls `next()` with the
result (either `null` or a validation error). The keys of the `schema` object correspond with
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
  // This handler is only called if `req.body` matches the schema
});
```

The `middleware` function is an Express-style middleware function with the signature:

```js
function(req, res, next) { }
```

### Usage with other frameworks

Since the [`.compile()`](#reqvalidatorcompileschema) method returns an Express-style
middleware function, it is not initially compatible with other frameworks that have
a different middleware signature.

However, the [`RequestValidator`](#new-requestvalidatoroptions) class can be subclassed
to override the [`.compile()`](#reqvalidatorcompileschema) method to return a function
compatible with other frameworks.

Here's an example of extending `RequestValidator` to work with Koa:

```js
const RequestValidator = require('ajv-request-validator');

class KoaRequestValidator extends RequestValidator {
  compile(schema) {
    const middleware = super.compile(schema);
    
    return function koaMiddleware(ctx, next) {
      return new Promise((resolve, reject) => {
        middleware(ctx.request, null, (err) => {
          if (err === null) {
            resolve(next());
          } else {
            reject(err);
          }
        });
      });
    };
  }
}
```
