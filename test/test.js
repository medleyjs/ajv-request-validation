'use strict';

const Ajv = require('ajv');
const RequestValidator = require('..');

const assert = require('assert');

describe('ajv-request-validator class', () => {

  it('should create an object with an `ajv` property created from the given options', () => {
    var reqValidator = new RequestValidator(); // No options
    assert(reqValidator.ajv instanceof Ajv);

    reqValidator = new RequestValidator({custom: 'option'});
    assert(reqValidator.ajv instanceof Ajv);
    assert.strictEqual(reqValidator.ajv._opts.custom, 'option');
  });

  it('should create an object with an `ajv` property that is the given Ajv instance', () => {
    const ajv = new Ajv();
    const reqValidator = new RequestValidator(ajv);

    assert.strictEqual(reqValidator.ajv, ajv);
  });

});

describe('reqValidator.compile()', () => {

  it('should throw if the schema is not an object', () => {
    const reqValidator = new RequestValidator();

    assert.throws(
      () => reqValidator.compile(),
      /^TypeError: schema must be an object$/
    );
    assert.throws(
      () => reqValidator.compile(null),
      /^TypeError: schema must be an object$/
    );
    assert.throws(
      () => reqValidator.compile('string'),
      /^TypeError: schema must be an object$/
    );
    assert.throws(
      () => reqValidator.compile(null, {middleware: false}),
      /^TypeError: schema must be an object$/
    );
    assert.throws(
      () => reqValidator.compile('string', {middleware: false}),
      /^TypeError: schema must be an object$/
    );
  });

  it('should throw if the schema object has no properties', () => {
    const reqValidator = new RequestValidator();

    assert.throws(
      () => reqValidator.compile({}),
      /^Error: The schema must have at least 1 property$/
    );
  });

});

describe('compiled validator middleware', () => {

  const res = null;

  it('should validate a single property', () => {
    const reqValidator = new RequestValidator();
    const middleware = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
    });

    middleware({
      body: {name: 'Ajv', age: 6},
    }, res, function next(err) {
      assert.strictEqual(err, null);
    });

    middleware({
      body: {name: 1, age: 6},
    }, res, function next(err) {
      assert(err instanceof Error);
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.message, '`body.name` should be string');
    });

    middleware({
      body: {name: 'Ajv', age: true},
    }, res, function next(err) {
      assert(err instanceof Error);
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.message, '`body.age` should be number');
    });
  });

  it('should validate a multiple properties', () => {
    const reqValidator = new RequestValidator();
    const middleware = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
      query: {
        type: 'string',
      },
    });

    middleware({
      body: {name: 'Ajv', age: 6},
      query: 'string',
    }, res, function next(err) {
      assert.strictEqual(err, null);
    });

    middleware({
      body: {name: 1, age: 6},
      query: 'string',
    }, res, function next(err) {
      assert(err instanceof Error);
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.message, '`body.name` should be string');
    });

    middleware({
      body: {name: 'Ajv', age: 6},
      query: {},
    }, res, function next(err) {
      assert(err instanceof Error);
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.message, '`query` should be string');
    });
  });

  it('should report multiple errors when the Ajv `allErrors` option is true', () => {
    const reqValidator = new RequestValidator({allErrors: true});
    const middleware = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
    });

    middleware({
      body: {name: false, age: null},
    }, res, function next(err) {
      assert(err instanceof Error);
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.message, '`body.name` should be string, `body.age` should be number');
    });
  });

  it('should work the same if the `middleware` option is `true`', () => {
    const reqValidator = new RequestValidator();
    const middleware = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
    }, {middleware: true});

    middleware({
      body: {name: 'Ajv', age: 6},
    }, res, function next(err) {
      assert.strictEqual(err, null);
    });
  });

});

describe('compiled validator function', () => {

  it('should validate a single property', () => {
    const reqValidator = new RequestValidator();
    const validate = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
    }, {middleware: false});

    let err = validate({
      body: {name: 'Ajv', age: 6},
    });
    assert.strictEqual(err, null);

    err = validate({
      body: {name: 1, age: 6},
    });
    assert(err instanceof Error);
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.message, '`body.name` should be string');

    err = validate({
      body: {name: 'Ajv', age: true},
    });
    assert(err instanceof Error);
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.message, '`body.age` should be number');
  });

  it('should validate a multiple properties', () => {
    const reqValidator = new RequestValidator();
    const validate = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
      query: {
        type: 'string',
      },
    }, {middleware: false});

    let err = validate({
      body: {name: 'Ajv', age: 6},
      query: 'string',
    });
    assert.strictEqual(err, null);

    err = validate({
      body: {name: 1, age: 6},
      query: 'string',
    });
    assert(err instanceof Error);
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.message, '`body.name` should be string');

    err = validate({
      body: {name: 'Ajv', age: 6},
      query: {},
    });
    assert(err instanceof Error);
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.message, '`query` should be string');
  });

  it('should report multiple errors when the Ajv `allErrors` option is true', () => {
    const reqValidator = new RequestValidator({allErrors: true});
    const validate = reqValidator.compile({
      body: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          age: {type: 'number'},
        },
      },
    }, {middleware: false});

    const err = validate({
      body: {name: false, age: null},
    });
    assert(err instanceof Error);
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.message, '`body.name` should be string, `body.age` should be number');
  });

});
