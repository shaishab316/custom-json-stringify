/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { stringify, Double, markAsDouble } from "../src/index";

describe("stringify", () => {
  it("should stringify basic objects", () => {
    const obj = { name: "John", age: 30 };
    expect(stringify(obj)).toBe('{"name":"John","age":30}');
  });

  it("should stringify arrays", () => {
    const arr = [1, 2, 3];
    expect(stringify(arr)).toBe("[1,2,3]");
  });

  it("should handle null", () => {
    expect(stringify(null)).toBe("null");
  });

  it("should handle booleans", () => {
    expect(stringify(true)).toBe("true");
    expect(stringify(false)).toBe("false");
  });

  it("should handle strings with escaping", () => {
    expect(stringify("hello\nworld")).toBe('"hello\\nworld"');
    expect(stringify('quote"test')).toBe('"quote\\"test"');
  });

  it("should handle undefined", () => {
    expect(stringify(undefined)).toBe(undefined);
  });

  it("should stringify numbers", () => {
    expect(stringify(42)).toBe("42");
    expect(stringify(3.14)).toBe("3.14");
  });
});

describe("Double", () => {
  it("should format integers as doubles", () => {
    const obj = { value: Double(5) };
    expect(stringify(obj)).toBe('{"value":5.0}');
  });

  it("should keep decimal numbers as-is", () => {
    const obj = { value: Double(5.5) };
    expect(stringify(obj)).toBe('{"value":5.5}');
  });

  it("should throw error for non-numbers", () => {
    expect(() => Double("not a number" as any)).toThrow(TypeError);
  });
});

describe("markAsDouble", () => {
  it("should mark specific keys as doubles", () => {
    const data = { price: 100, quantity: 5, name: "Widget" };
    markAsDouble(data, "price", "quantity");
    expect(stringify(data)).toBe(
      '{"price":100.0,"quantity":5.0,"name":"Widget"}',
    );
  });

  it("should skip non-number values", () => {
    const data = { value: "text", count: 10 };
    markAsDouble(data, "value", "count");
    expect(stringify(data)).toBe('{"value":"text","count":10.0}');
  });
});

describe("Pretty Printing", () => {
  it("should format with 2 spaces", () => {
    const obj = { a: 1, b: 2 };
    const result = stringify(obj, null, 2);
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("should format nested objects", () => {
    const obj = {
      outer: {
        inner: 123,
      },
    };
    const result = stringify(obj, null, 2);
    expect(result).toContain('"outer"');
    expect(result).toContain('"inner"');
  });

  it("should handle custom indent string", () => {
    const obj = { x: 1 };
    const result = stringify(obj, null, "\t");
    expect(result).toContain("\t");
  });
});

describe("Edge Cases", () => {
  it("should handle Infinity as null", () => {
    expect(stringify(Infinity)).toBe("null");
    expect(stringify(-Infinity)).toBe("null");
  });

  it("should handle NaN as null", () => {
    expect(stringify(NaN)).toBe("null");
  });

  it("should handle Date objects", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    expect(stringify(date)).toBe('"2024-01-01T00:00:00.000Z"');
  });

  it("should skip functions", () => {
    const obj = { fn: () => {} };
    expect(stringify(obj)).toBe("{}");
  });

  it("should skip symbols", () => {
    const obj = { sym: Symbol("test") };
    expect(stringify(obj)).toBe("{}");
  });

  it("should handle empty objects and arrays", () => {
    expect(stringify({})).toBe("{}");
    expect(stringify([])).toBe("[]");
  });
});
