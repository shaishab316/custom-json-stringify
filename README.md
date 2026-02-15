# @shaishab316/custom-json-stringify

A custom JSON stringify implementation with special support for double-precision float formatting and pretty printing.

[![Test](https://github.com/shaishab316/custom-json-stringify/actions/workflows/test.yml/badge.svg)](https://github.com/shaishab316/custom-json-stringify/actions/workflows/test.yml)

## Features

- ✨ **Double-precision formatting** - Show `.0` suffix for integer floats
- 🎨 **Pretty printing** - Customizable indentation
- 📦 **TypeScript** - Full type definitions included
- 🧪 **Well tested** - Comprehensive test suite with Vitest
- 📘 **ESM & CJS** - Supports both module systems

## Installation

First, configure npm to use GitHub Packages:

```bash
npm login --scope=@shaishab316 --registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @shaishab316/custom-json-stringify
```

## Usage

### Basic Stringify

```typescript
import { stringify } from "@shaishab316/custom-json-stringify";

const obj = { name: "John", age: 30 };
console.log(stringify(obj));
// Output: {"name":"John","age":30}
```

### Double-Precision Numbers

```typescript
import { stringify, Double } from "@shaishab316/custom-json-stringify";

const data = {
  id: Double(5),
  price: Double(99),
  value: 3.14,
};

console.log(stringify(data));
// Output: {"id":5.0,"price":99.0,"value":3.14}
```

### Mark Fields as Doubles

```typescript
import { stringify, markAsDouble } from "@shaishab316/custom-json-stringify";

const product = { id: 100, price: 50, name: "Widget" };
markAsDouble(product, "id", "price");

console.log(stringify(product));
// Output: {"id":100.0,"price":50.0,"name":"Widget"}
```

### Pretty Printing

```typescript
import { stringify } from "@shaishab316/custom-json-stringify";

const obj = { a: 1, b: { c: 2 } };
console.log(stringify(obj, null, 2));
// Output:
// {
//   "a": 1,
//   "b": {
//     "c": 2
//   }
// }
```

## API

### `stringify(value, replacer?, space?)`

Converts a value to JSON string.

- **value**: The value to stringify
- **replacer**: (Not implemented yet) Replacer function
- **space**: Indentation (number or string)

### `Double(n: number)`

Wraps a number to serialize with decimal point.

### `markAsDouble(obj, ...keys)`

Marks specific object keys to serialize as doubles.

### `registerGlobalStringify()`

Replaces global `JSON.stringify` (use with caution).

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Type check
npm run type-check

# Build
npm run build
```

## License

MIT
