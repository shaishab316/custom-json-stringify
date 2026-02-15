/* eslint-disable no-unused-vars , @typescript-eslint/ban-types */

/**
 * Custom JSON.stringify implementation with special support for:
 * - Double-precision float formatting (numbers with .0 suffix)
 * - Pretty printing with custom indent
 *
 * This is useful when you need exact decimal representation in JSON output,
 * like when dealing with financial data or coordinates.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Symbol used to tag numbers that should serialize as doubles (e.g., 5.0) */
const DOUBLE_MARKER = Symbol('double');

/**
 * A number that will serialize with decimal suffix.
 * Use Double() to create, or markAsDouble() to convert existing numbers.
 */
interface DoubleNumber {
  [DOUBLE_MARKER]: true;
  /** Allows Number methods to work (valueOf, etc.) */
  valueOf(): number;
  toString(): string;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/** Replacer function type (same as JSON.stringify) - kept for API compatibility */
type Replacer = ((key: string, value: unknown) => unknown) | null;

/** Space parameter for pretty printing */
type Space = string | number | null;

// ---------------------------------------------------------------------------
// Double Number Functions
// ---------------------------------------------------------------------------

/**
 * Wraps a number to serialize as a double-precision float.
 * When stringified, it will always show the decimal point.
 *
 * @example
 * Double(5)   // → "5.0" when serialized
 * Double(5.5) // → "5.5" when serialized
 */
export function Double(n: number): DoubleNumber {
  if (typeof n !== 'number') {
    throw new TypeError('Double() expects a number');
  }

  // Create a Number object so it can hold Symbol properties (primitives cannot)
  const obj = Object(n) as DoubleNumber;
  obj[DOUBLE_MARKER] = true;
  return obj;
}

/**
 * Type guard to check if a value is a Double-wrapped number.
 * Used internally during serialization.
 */
function isDoubleNumber(value: unknown): value is DoubleNumber {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as DoubleNumber)[DOUBLE_MARKER] === true
  );
}

/**
 * Marks specific keys on an object to serialize as doubles.
 * Mutates the original object - be careful!
 *
 * @example
 * const data = { price: 100, quantity: 5, name: "Widget" };
 * markAsDouble(data, 'price', 'quantity');
 * stringify(data); // {"price":100.0,"quantity":5.0,"name":"Widget"}
 */
export function markAsDouble<T extends Record<string, unknown>>(
  obj: T,
  ...keys: (keyof T)[]
): T {
  for (const key of keys) {
    const value = obj[key];
    // Only convert actual numbers, skip undefined/null/strings
    if (typeof value === 'number') {
      obj[key] = Double(value) as T[keyof T];
    }
  }
  return obj;
}

// ---------------------------------------------------------------------------
// String Escaping
// ---------------------------------------------------------------------------

/** Escape map for special characters that need JSON escaping */
const ESCAPE_MAP: Record<string, string> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

/**
 * Escapes special characters in a string for valid JSON.
 * Handles control characters (0x00-0x1F) and the standard escape sequences.
 */
function escapeString(str: string): string {
  // Match double quotes, backslashes, and control characters (0x00-0x1F)
  // eslint-disable-next-line no-control-regex
  return str.replace(/["\\\u0000-\u001F]/g, char => {
    // Use known escape first, fallback to unicode escape
    return (
      ESCAPE_MAP[char] ??
      `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
  });
}

// ---------------------------------------------------------------------------
// Value Serialization
// ---------------------------------------------------------------------------

/**
 * Serializes a single value to its JSON string representation.
 * Returns undefined for values that can't be serialized (functions, symbols).
 */
function serializeValue(value: unknown): string | undefined {
  // Handle values that should be excluded
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    return undefined;
  }

  // null is special - it's the keyword "null", not a string
  if (value === null) {
    return 'null';
  }

  // Booleans serialize as themselves
  if (typeof value === 'boolean') {
    return String(value);
  }

  // Strings get quotes and escaping
  if (typeof value === 'string') {
    return `"${escapeString(value)}"`;
  }

  // Handle Double-wrapped numbers (force decimal display)
  // Must come before toJSON check since Number objects won't have toJSON
  if (isDoubleNumber(value)) {
    const num = value.valueOf();
    // Infinity/NaN become null in JSON
    if (!isFinite(num)) {
      return 'null';
    }
    // Always show decimal for integers, otherwise show as-is
    return Number.isInteger(num) ? `${num}.0` : String(num);
  }

  // Regular numbers
  if (typeof value === 'number') {
    // Infinity/NaN become null in JSON
    if (!isFinite(value)) {
      return 'null';
    }
    return String(value);
  }

  // Dates serialize to ISO string
  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }

  // Check for custom toJSON method (like standard JSON.stringify)
  const obj = value as Record<string, unknown>;
  if (typeof obj.toJSON === 'function') {
    return serializeValue(obj.toJSON());
  }

  // Arrays: serialize each element and join with commas
  if (Array.isArray(value)) {
    const items = value.map(item => serializeValue(item) ?? 'null');
    return `[${items.join(',')}]`;
  }

  // Plain objects: serialize key-value pairs
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    const pairs = keys
      .map(key => {
        const serializedValue = serializeValue(obj[key]);
        // Skip undefined values
        if (serializedValue === undefined) {
          return null;
        }
        return `"${escapeString(key)}":${serializedValue}`;
      })
      .filter((pair): pair is string => pair !== null);

    return `{${pairs.join(',')}}`;
  }

  // Fallback (shouldn't normally reach here)
  return undefined;
}

// ---------------------------------------------------------------------------
// Pretty Printing
// ---------------------------------------------------------------------------

/**
 * Converts minified JSON into a human-readable format with indentation.
 * This is a simplified pretty-printer that adds newlines and spacing.
 *
 * @param json - Minified JSON string
 * @param indent - String to use for each indentation level (e.g., "  ")
 */
function prettyPrint(json: string, indent: string): string {
  const result: string[] = [];
  let depth = 0;
  let inString = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    // Inside a string - just copy characters
    // Handle escaped characters (like \" or \\)
    if (inString) {
      result.push(char);
      if (char === '\\') {
        // Skip the next character too (it's escaped)
        result.push(json[++i]);
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    // Start of a string
    if (char === '"') {
      inString = true;
      result.push(char);
      continue;
    }

    // Opening bracket/brace - add newline and indent
    if (char === '{' || char === '[') {
      result.push(char);
      // Check if there's content after (not empty object/array)
      const nextChar = json[i + 1];
      if (nextChar !== '}' && nextChar !== ']') {
        result.push('\n');
        depth++;
        result.push(indent.repeat(depth));
      }
      continue;
    }

    // Closing bracket/brace - decrease indent first
    if (char === '}' || char === ']') {
      // Only add newline if there's something before it
      const prevChar = json[i - 1];
      if (prevChar !== '{' && prevChar !== '[') {
        result.push('\n');
        depth--;
        result.push(indent.repeat(depth));
      }
      result.push(char);
      continue;
    }

    // Comma - add newline and indent after
    if (char === ',') {
      result.push(',\n');
      result.push(indent.repeat(depth));
      continue;
    }

    // Colon - add space after
    if (char === ':') {
      result.push(': ');
      continue;
    }

    // Regular character (whitespace, letters, numbers)
    result.push(char);
  }

  return result.join('');
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Stringifies a value to JSON, with optional support for:
 * - Double-precision numbers (showing .0 for integers)
 * - Pretty printing with custom indentation
 *
 * @param value - The value to stringify
 * @param replacer - Optional replacer function (like JSON.stringify)
 * @param space - Optional indentation (number of spaces or custom string)
 * @returns JSON string, or undefined if value can't be serialized
 *
 * @example
 * // Basic usage
 * stringify({ x: 5 }); // '{"x":5}'
 *
 * // Double numbers
 * stringify({ x: Double(5) }); // '{"x":5.0}'
 *
 * // Pretty print
 * stringify({ a: 1, b: 2 }, null, 2);
 * // {
 * //   "a": 1,
 * //   "b": 2
 * // }
 */
export function stringify(
  value: unknown,
  _replacer?: Replacer, // Note: replacer not currently implemented
  space?: Space,
): string | undefined {
  // Note: Replacer parameter kept for API compatibility but not implemented
  // (the original code also didn't use it)

  const serialized = serializeValue(value);
  if (serialized === undefined) {
    return undefined;
  }

  // No pretty printing requested
  if (!space) {
    return serialized;
  }

  // Convert space parameter to indent string
  const indent =
    typeof space === 'number'
      ? ' '.repeat(Math.min(space, 10)) // Cap at 10 spaces
      : String(space).slice(0, 10); // Cap custom string at 10 chars

  // Empty indent = no pretty printing
  if (!indent) {
    return serialized;
  }

  return prettyPrint(serialized, indent);
}

// ---------------------------------------------------------------------------
// Global Patch
// ---------------------------------------------------------------------------

/**
 * Globally replaces JSON.stringify with our custom implementation.
 * Use with caution - this affects all code that calls JSON.stringify in the environment.
 * It's generally better to import and use the stringify function directly, but this is available if needed.
 */
export function registerGlobalStringify(): void {
  const native = JSON.stringify;

  (JSON.stringify as unknown) = function (
    value: unknown,
    replacer?: Parameters<typeof native>[1],
    space?: Parameters<typeof native>[2],
  ): string {
    return (
      stringify(value, replacer as Replacer, space as Space) ??
      native(value, replacer, space)
    );
  };
}
