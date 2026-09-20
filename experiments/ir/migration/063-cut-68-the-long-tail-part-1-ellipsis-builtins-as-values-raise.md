## Progress — cut 68 (the long tail, part 1: Ellipsis, builtins as values, `raise Cls(kw=...)`, loop `else`)

Four small emits from item 12, each the text's shape:

  * **Ellipsis** (`ConstantAst:Ellipsis`, 13 methods + 17 defs): the marker
    Symbol `#'...'` emits the GLOBAL `Ellipsis`, never the marker (the text's
    rule, so `type(...)` is not Symbol).
  * **a builtin function as a value** (`NameAst:builtinFunctionAsValue`, 18
    + 11): emitBuiltinFirstClassRead:'s chain, `((Python at: #builtins)
    instance) ___globalAt___: #len otherwise: [BoundMethod receiver: ...
    selector: #len]` -- the module slot first (a runtime `builtins.len =
    fake` and the cached wrap both live there, so `len is len` holds), the
    wrap in a real block on the miss.  The `#builtinValue` load kind sits
    exactly where the chain used to answer nil; `type` keeps its own earlier
    branch.
  * **`raise Cls(a, kw=v)` and `raise Cls(*args)`** (`RaiseAst:keywords` 12,
    `:starArgs`): the raise's `___pyRaiseNew___:args:kw:` takes the same
    argument Array and keyword dict the call shapes build.
  * **`for ... else` / `while ... else`** (`ForAst:else` 11 + 7,
    `WhileAst:else`): the else statements go INSIDE the PythonBreak-protected
    outer block, after the drain handler (for) / the `whileTrue:` (while), so
    a break propagates past them -- the text's placement.  The flow analysis
    walks the else from what was bound BEFORE the loop and lets none of its
    bindings survive the statement (a break skips it).

Fixture: Tagged (an Exception subclass with a keyword `__init__`),
tail_ellipsis, tail_builtin_values (`f = len`, `map(len, ...)`, `f is len`),
tail_raise_kw, tail_loop_else (break and natural exit for both loops),
TailUser.scan (for-else with a return in the body).  Compiled 358 -> 365, 0
fallbacks, RESULTS true with the flag on and off (one expected value and one
tripwire count were first written wrong by hand and corrected against
CPython, which is what the fixture check is for).  Gates: flag-off `6431
run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run, 6421
passed, 8 failed, 2 errors` -- the known nine plus `[ERROR]
TwilioClientTestCase>>testMessagesCreate` (AlmostOutOfMemory in its shard
log, 15 notifications; 6/6 alone flag-on).
