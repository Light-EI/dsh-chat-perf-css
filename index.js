/**
 * Host half of the chat render-relief bundle.
 *
 * The whole effect lives in the Client half: it injects one stylesheet that lets
 * off-screen message bodies and block formulas skip style, layout and paint.
 *
 * This Host half stays empty on purpose. It must not change agent behaviour,
 * credentials, system prompts, session data or the compression pipeline — the
 * plugin only changes how the page paints.
 */
export function apply() {}
