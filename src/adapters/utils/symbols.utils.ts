/**
 * Symbol used by H3 to indicate the response has been handled.
 * When returned, H3 will not attempt to send a response.
 * @internal
 */
export const $h3Handled = Symbol.for('h3.handled');

/**
 * Symbol used by H3 to indicate the handler returned a 404 response.
 * @internal
 */
export const $h3NotFound = Symbol.for('h3.notFound');

/**
 * Symbol to indicate the versioned handler called next().
 * @internal
 */
export const $h3NextHandler: unique symbol = Symbol('h3.nextHandler');

/**
 * Symbol used to store the H3 event object in the Node.js request object.
 * @internal
 */
export const $h3Event: unique symbol = Symbol('h3.event');
