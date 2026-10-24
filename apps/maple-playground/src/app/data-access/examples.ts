/** A host context and a script that show one thing about Maple; the script's comment explains it. */
export interface Example {
  title: string;
  /** One line for the Examples menu. */
  summary: string;
  hostContext: string;
  code: string;
}

/** For the examples whose script needs nothing from the host. */
const EMPTY_HOST_CONTEXT = `// Host context: deliberately empty, so the script gets nothing from the host.
`;

const PRICING_RULE: Example = {
  title: 'Pricing rule',
  summary: 'A business rule written as a script, with a host function',
  hostContext: `// Host context: trusted code that runs natively in the worker, as your application would.
// Maple hands INSTANCE_DATA to every run of the instance (read-only), RUN_DATA to one run.
export const INSTANCE_DATA = {
  TAX_RATE: 0.19,
  formatPrice: (amount) => amount.toFixed(2) + ' €'
};

export const RUN_DATA = {
  order: {
    coupon: 'SPRING10',
    items: [
      { name: 'Maple syrup', price: 12.5, quantity: 2 },
      { name: 'Pancake mix', price: 4.2, quantity: 1 }
    ]
  }
};
`,
  code: `// Script: untrusted code. It sees TAX_RATE, formatPrice and order, and nothing else.
const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const discount = order.coupon === 'SPRING10' ? subtotal * 0.1 : 0;
const total = (subtotal - discount) * (1 + TAX_RATE);

return {
  subtotal: formatPrice(subtotal),
  discount: formatPrice(discount),
  total: formatPrice(total)
};
`
};

const TRANSFORM_DATA: Example = {
  title: 'Transform data',
  summary: 'Modern JavaScript over the data of a run',
  hostContext: `// Host context: the orders a report script works on.
export const RUN_DATA = {
  orders: [
    { id: 1, customer: 'Ada', total: 42.5, status: 'paid' },
    { id: 2, customer: 'Grace', total: 18, status: 'open' },
    { id: 3, customer: 'Ada', total: 7.25, status: 'paid' },
    { id: 4, customer: 'Linus', total: 99.9, status: 'paid' }
  ]
};
`,
  code: `// Transform data: arrow functions, destructuring, spread and ?? work as in JavaScript.
const paid = orders.filter(({ status }) => status === 'paid');

const revenueByCustomer = paid.reduce(
  (totals, { customer, total }) => ({ ...totals, [customer]: (totals[customer] ?? 0) + total }),
  {}
);

return {
  paidOrders: paid.map(({ id }) => id),
  revenueByCustomer
};
`
};

const NO_HOST_GLOBALS: Example = {
  title: 'No host globals',
  summary: 'The page, the worker and Node are out of reach',
  hostContext: EMPTY_HOST_CONTEXT,
  code: `// No host globals: each of these is a global in a browser, a worker or Node, and Maple hands
// none of them to the script. Standard built-ins such as Math and JSON are Maple's own.
return {
  globalThis: typeof globalThis,
  window: typeof window,
  self: typeof self,
  document: typeof document,
  fetch: typeof fetch,
  localStorage: typeof localStorage,
  process: typeof process,
  require: typeof require,
  Math: typeof Math,
  JSON: typeof JSON
};
`
};

const PROTOTYPE_ESCAPE: Example = {
  title: 'Prototype escape',
  summary: 'The classic way out of a sandbox, blocked',
  hostContext: EMPTY_HOST_CONTEXT,
  code: `// Prototype escape: the constructor of every function is Function, and
// Function('return process')() would run code in the host, outside the sandbox.
// Maple refuses to read \`constructor\` and \`__proto__\`, so the run fails right there.
const HostFunction = ({}).constructor.constructor;
return HostFunction('return process')();
`
};

const NO_EVAL: Example = {
  title: 'No eval',
  summary: 'Strings never become code',
  hostContext: EMPTY_HOST_CONTEXT,
  code: `// No eval: eval and Function would turn a string into code that runs outside the sandbox.
// Maple has neither: calling eval ends the run with an error, and the string is never parsed.
const answer = 6 * 7;
return eval('answer');
`
};

const RUNAWAY_LOOP: Example = {
  title: 'Runaway loop',
  summary: 'An endless loop stops at the operation limit',
  hostContext: EMPTY_HOST_CONTEXT,
  code: `// Runaway loop: Maple counts the operations of a run and stops it at maxOps (see Settings,
// default 1,000,000), so an endless loop ends with an error instead of hanging the host.
let count = 0;
while (true) {
  count++;
}
`
};

const INSTANCE_AND_RUN_DATA: Example = {
  title: 'Instance and run data',
  summary: 'Run data is a copy, instance data is read-only',
  hostContext: `// Host context: INSTANCE_DATA is shared by every run and read-only,
// RUN_DATA is copied into each run.
export const INSTANCE_DATA = {
  settings: { currency: '€', maxItems: 3 }
};

export const RUN_DATA = {
  cart: ['Maple syrup', 'Pancake mix']
};
`,
  code: `// Instance and run data: the script may change its copy of RUN_DATA ...
cart.push('Waffles');

// ... but INSTANCE_DATA is read-only, so this line throws. Delete it to see the cart.
settings.maxItems = 10;

return cart;
`
};

const ERRORS: Example = {
  title: 'Errors like JavaScript',
  summary: 'Real error objects with the messages Node prints',
  hostContext: EMPTY_HOST_CONTEXT,
  code: `// Errors like JavaScript: a script's errors are TypeError, ReferenceError and RangeError objects
// with the messages Node prints, and try/catch works as usual.
const attempts = [() => null.name, () => missingFunction(), () => new Array(-1)];

return attempts.map((attempt) => {
  try {
    attempt();
  } catch (error) {
    return \`\${error.name}: \${error.message}\`;
  }
});
`
};

/** In the order of the Examples menu: what Maple is for, then how it keeps scripts in. */
export const EXAMPLES: ReadonlyArray<Example> = [
  PRICING_RULE,
  TRANSFORM_DATA,
  NO_HOST_GLOBALS,
  PROTOTYPE_ESCAPE,
  NO_EVAL,
  RUNAWAY_LOOP,
  INSTANCE_AND_RUN_DATA,
  ERRORS
];

/** What a first visit and Reset show. */
export const DEFAULT_EXAMPLE = PRICING_RULE;
