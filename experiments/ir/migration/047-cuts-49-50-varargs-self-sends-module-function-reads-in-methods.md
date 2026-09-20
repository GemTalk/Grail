## Progress — cuts 49-50 (varargs self-sends; module-function reads in methods)

Item 1c's two one-emit pieces.

**Cut 49.** `self.m(a, k=v)`, or a positional self-send to a sibling that
compiles as varargs (defaults, `*args`, keyword-only), took no shape
(`CallAst:selfSendKeywordsOrArity`, 261 stdlib methods).  The text's
`printClassSelfSendVarargsOn:` is `(self _m: { args } kw: kwDict)`; the IR
call shape `#classSelfSendVarargs` emits the same send with the positional
Array and the keyword dict the module twin already builds
(`___emitIRKeywordsOn___:`).

**Cut 50.** A same-module top-level FUNCTION read inside a method
(`NameAst:moduleFunctionInMethod`, 233) is the text's dynamic-slot-first
BoundMethod shape: `((Mod ___instance___) dynamicInstVarAt: #f) ifNil: [
| ___fn___ | ___fn___ := BoundMethod receiver: (Mod ___instance___) selector:
#f. (Mod ___instance___) dynamicInstVarAt: #f put: ___fn___. ___fn___ ]` --
the slot first because a module-level decorator stores its wrapper there,
the compiled def wrapped as a BoundMethod on the module instance and
memoised on a miss.  The text's block temp is a method temp here (an inlined
`ifNil:` block's temp is one anyway), registered once per method.  A CALL of
such a function inside a method already took the `#general` shape once its
callee value could be emitted.

Fixture: class Sender (a keyword self-send, a positional self-send to a
varargs sibling, a module-function call, an aliased read, a read of the
decorated `deco_add` whose slot holds the wrapper).  Compiled 206 -> 215.
