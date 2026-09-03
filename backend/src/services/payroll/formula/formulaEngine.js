/**
 * Safe payroll formula engine (Milestone 3).
 * Tokenize → parse AST → evaluate. Never uses eval/Function/new Function.
 */

export const ALLOWED_FUNCTIONS = Object.freeze([
  "min",
  "max",
  "round",
  "if",
  "percent",
]);

const MAX_FORMULA_LENGTH = 500;
const MAX_AST_DEPTH = 32;

const RESERVED_IDENTIFIERS = new Set([
  "eval",
  "function",
  "constructor",
  "prototype",
  "__proto__",
  "window",
  "global",
  "globalthis",
  "process",
  "require",
  "import",
  "export",
  "this",
  "arguments",
  "module",
  "exports",
]);

/**
 * @param {string} expression
 */
function assertFormulaInput(expression) {
  if (typeof expression !== "string" || !expression.trim()) {
    throw new Error("Formula is empty");
  }
  if (expression.length > MAX_FORMULA_LENGTH) {
    throw new Error(`Formula is too long (max ${MAX_FORMULA_LENGTH} characters)`);
  }
}

/**
 * @param {string} input
 * @returns {Array<{ type: string, value?: string|number }>}
 */
export function tokenize(input) {
  assertFormulaInput(input);
  const tokens = [];
  let i = 0;
  const src = input;

  const peek = () => src[i];
  const advance = () => src[i++];

  while (i < src.length) {
    const ch = peek();

    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(peek())) {
        num += advance();
      }
      if ((num.match(/\./g) || []).length > 1 || num === ".") {
        throw new Error(`Invalid number: ${num}`);
      }
      tokens.push({ type: "NUMBER", value: Number(num) });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let id = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(peek())) {
        id += advance();
      }
      tokens.push({ type: "IDENT", value: id });
      continue;
    }

    if (ch === "(") {
      advance();
      tokens.push({ type: "LPAREN" });
      continue;
    }
    if (ch === ")") {
      advance();
      tokens.push({ type: "RPAREN" });
      continue;
    }
    if (ch === ",") {
      advance();
      tokens.push({ type: "COMMA" });
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      advance();
      tokens.push({ type: "OP", value: ch });
      continue;
    }

    if (ch === ">" || ch === "<" || ch === "=" || ch === "!") {
      let op = advance();
      if (peek() === "=") {
        op += advance();
      }
      if (![">", "<", ">=", "<=", "==", "!="].includes(op)) {
        throw new Error(`Unexpected token: ${op}`);
      }
      tokens.push({ type: "CMP", value: op });
      continue;
    }

    throw new Error(`Unexpected token: ${ch}`);
  }

  tokens.push({ type: "EOF" });
  return tokens;
}

/**
 * Recursive-descent parser.
 * @param {Array<{ type: string, value?: string|number }>} tokens
 */
export function parse(tokens) {
  let pos = 0;

  const current = () => tokens[pos];
  const eat = (type) => {
    const token = current();
    if (token.type !== type) {
      throw new Error(`Unexpected token: expected ${type}, got ${token.type}`);
    }
    pos += 1;
    return token;
  };

  const parseExpression = (depth = 0) => {
    if (depth > MAX_AST_DEPTH) {
      throw new Error(`Formula exceeds max AST depth (${MAX_AST_DEPTH})`);
    }
    return parseComparison(depth);
  };

  const parseComparison = (depth) => {
    let left = parseAdditive(depth);
    while (current().type === "CMP") {
      const operator = eat("CMP").value;
      const right = parseAdditive(depth);
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }
    return left;
  };

  const parseAdditive = (depth) => {
    let left = parseMultiplicative(depth);
    while (
      current().type === "OP" &&
      (current().value === "+" || current().value === "-")
    ) {
      const operator = eat("OP").value;
      const right = parseMultiplicative(depth);
      left = { type: "BinaryExpression", operator, left, right };
    }
    return left;
  };

  const parseMultiplicative = (depth) => {
    let left = parseUnary(depth);
    while (
      current().type === "OP" &&
      (current().value === "*" || current().value === "/")
    ) {
      const operator = eat("OP").value;
      const right = parseUnary(depth);
      left = { type: "BinaryExpression", operator, left, right };
    }
    return left;
  };

  const parseUnary = (depth) => {
    if (
      current().type === "OP" &&
      (current().value === "+" || current().value === "-")
    ) {
      const operator = eat("OP").value;
      return {
        type: "UnaryExpression",
        operator,
        argument: parseUnary(depth + 1),
      };
    }
    return parsePrimary(depth);
  };

  const parsePrimary = (depth) => {
    const token = current();

    if (token.type === "NUMBER") {
      eat("NUMBER");
      return { type: "Literal", value: token.value };
    }

    if (token.type === "IDENT") {
      const name = eat("IDENT").value;
      const lower = name.toLowerCase();

      if (RESERVED_IDENTIFIERS.has(lower)) {
        throw new Error(`Identifier not allowed: ${name}`);
      }

      if (current().type === "LPAREN") {
        if (!ALLOWED_FUNCTIONS.includes(lower)) {
          throw new Error(`Unknown function or not allowed: ${name}`);
        }
        eat("LPAREN");
        const args = [];
        if (current().type !== "RPAREN") {
          args.push(parseExpression(depth + 1));
          while (current().type === "COMMA") {
            eat("COMMA");
            args.push(parseExpression(depth + 1));
          }
        }
        eat("RPAREN");
        return { type: "CallExpression", callee: lower, arguments: args };
      }

      const varName = name.toUpperCase();
      if (!/^[A-Z][A-Z0-9_]*$/.test(varName)) {
        throw new Error(`Invalid variable name: ${name}`);
      }
      return { type: "Identifier", name: varName };
    }

    if (token.type === "LPAREN") {
      eat("LPAREN");
      const expr = parseExpression(depth + 1);
      eat("RPAREN");
      return expr;
    }

    throw new Error(`Unexpected token: ${token.type}`);
  };

  const ast = parseExpression(0);
  if (current().type !== "EOF") {
    throw new Error(`Unexpected token after expression: ${current().type}`);
  }
  // Detect unclosed paren via eat failures already; also ensure we consumed all
  return ast;
}

/**
 * @param {object} node
 * @param {Record<string, number>} variables
 * @param {number} depth
 * @returns {number}
 */
function evalNode(node, variables, depth = 0) {
  if (depth > MAX_AST_DEPTH) {
    throw new Error(`Formula exceeds max AST depth (${MAX_AST_DEPTH})`);
  }

  switch (node.type) {
    case "Literal":
      return Number(node.value);

    case "Identifier": {
      if (!(node.name in variables)) {
        throw new Error(`Unknown variable: ${node.name}`);
      }
      const value = Number(variables[node.name]);
      if (!Number.isFinite(value)) {
        throw new Error(`Variable ${node.name} must be a finite number`);
      }
      return value;
    }

    case "UnaryExpression": {
      const arg = evalNode(node.argument, variables, depth + 1);
      if (node.operator === "-") return -arg;
      return arg;
    }

    case "BinaryExpression": {
      const left = evalNode(node.left, variables, depth + 1);
      const right = evalNode(node.right, variables, depth + 1);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) throw new Error("Division by zero");
          return left / right;
        case ">":
          return left > right ? 1 : 0;
        case "<":
          return left < right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        case "==":
          return left === right ? 1 : 0;
        case "!=":
          return left !== right ? 1 : 0;
        default:
          throw new Error(`Unknown operator: ${node.operator}`);
      }
    }

    case "CallExpression": {
      const args = node.arguments.map((a) =>
        evalNode(a, variables, depth + 1)
      );
      switch (node.callee) {
        case "min":
          if (args.length < 1) throw new Error("min() requires at least 1 argument");
          return Math.min(...args);
        case "max":
          if (args.length < 1) throw new Error("max() requires at least 1 argument");
          return Math.max(...args);
        case "round":
          if (args.length < 1 || args.length > 2) {
            throw new Error("round() requires 1 or 2 arguments");
          }
          if (args.length === 1) return Math.round(args[0]);
          {
            const factor = 10 ** args[1];
            return Math.round(args[0] * factor) / factor;
          }
        case "percent":
          if (args.length !== 2) {
            throw new Error("percent(base, pct) requires 2 arguments");
          }
          return (args[0] * args[1]) / 100;
        case "if":
          if (args.length !== 3) {
            throw new Error("if(cond, whenTrue, whenFalse) requires 3 arguments");
          }
          return args[0] !== 0 ? args[1] : args[2];
        default:
          throw new Error(`Unknown function or not allowed: ${node.callee}`);
      }
    }

    default:
      throw new Error(`Unknown AST node: ${node.type}`);
  }
}

/**
 * Compile expression to AST.
 * @param {string} expression
 */
export function compileFormula(expression) {
  const tokens = tokenize(expression);
  return parse(tokens);
}

/**
 * Compile and evaluate.
 * @param {string} expression
 * @param {Record<string, number>} [variables]
 * @returns {number}
 */
export function evaluateFormula(expression, variables = {}) {
  const ast = compileFormula(expression);
  const value = evalNode(ast, variables, 0);
  if (!Number.isFinite(value)) {
    throw new Error("Formula did not evaluate to a finite number");
  }
  return value;
}

/**
 * Validate without requiring variable values.
 * @param {string} expression
 * @returns {{ valid: boolean, error: string|null, ast: object|null }}
 */
export function validateFormula(expression) {
  try {
    const ast = compileFormula(expression);
    return { valid: true, error: null, ast };
  } catch (error) {
    return {
      valid: false,
      error: error.message || "Invalid formula",
      ast: null,
    };
  }
}
