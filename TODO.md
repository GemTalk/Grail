# TODO

Known gaps and follow-ups, grouped by area.  Historical entries that have
shipped are not preserved here — `git log` is the source of truth for what
landed and when.

For the Flask trajectory (the largest in-flight goal), see
[docs/Support_Flask.md](docs/Support_Flask.md).  This file tracks language /
runtime gaps that surface independently of the Flask push.

## Bugs Blocking Common Python Idioms

These break programs that look ordinary in CPython.

- [ ] **`*args` / `**kwargs` not bound in `LambdaAst`** — the
  `FunctionDefAst` closure-emit and varargs-selector-emit paths now bind
  both (the recent varargs prologue overhaul), but `LambdaAst` was not
  updated.  `lambda *xs: xs` still emits a bare `xs` read.  Mirror the
  FunctionDefAst code paths.

- [ ] **Explicit `super(Cls, self)` rejected** — the zero-arg form
  `super()` works end-to-end (codegen rewrite + `Super` proxy).  The
  explicit form trips the class-name reference inside the class body.
  Fix: when emitting an explicit `super(...)` call, resolve the first
  argument lazily (e.g., `___cls___` from the enclosing class-compile
  scope) instead of as a bare name.

- [ ] **`del` statement panics codegen** — Grail's parser accepts
  `del x[-2:]` but there is no `printSmalltalkOn:` on the relevant AST
  node, so codegen hits `AbstractNode is abstract …`.  Implement for the
  three common targets: name (`del x`), subscript (`del xs[i]`),
  attribute (`del obj.x`).

- [ ] **Module-level dunders (`__name__`, `__file__`, …) not bound at
  module scope** — `if __name__ == "__main__":` emits `__name__` as a
  bare Smalltalk identifier and fails with
  `CompileError 1001, undefined symbol __name__`.  The attribute exists
  (`module >> __name__` is set during import); `NameAst` codegen needs
  to resolve module-scope dunder reads to
  `((thisModule instance) @env1:__name__)` (or special-case the small
  dunder set).  Same area as the `(builtins instance)` rewrite that
  already lives in `NameAst`.

- [ ] **Module-level unbound names compile-error instead of NameError**
  — `print(undefined_var)` at module scope produces a GemStone
  `undefined symbol` *compile* error rather than a runtime Python
  `NameError`.  There is no function scope to attach the load-site
  check to; the fix needs to intercept the unresolved name during
  `importlib loadModuleFromPath:` compilation (e.g. install a
  symbol-list fallback that raises `NameError` at runtime, similar
  to the `(builtins instance)` rewrite for bare builtin references).

## Class System Limitations

Real Python class semantics that the current Smalltalk-class translation
doesn't preserve.

- [ ] **No single inheritance** — `class Foo(Bar):` ignores `bases`
  for non-built-in `Bar`.  Generated user classes are always direct
  `PythonInstance` subclasses.  Built-in bases (`dict`, `list`, etc.) and
  their subscripted aliases (`dict[K, V]`) now do extend the
  corresponding Smalltalk class (KeyValueDictionary, OrderedCollection),
  so the gap is only for *user-defined* parent classes.  A fix would
  make the generated class a subclass of the named parent and inherit
  instVars/methods.

- [ ] **No `@classmethod` / `@staticmethod`** — only instance methods
  (`InstanceFunctionDefAst`) are compiled as real methods.  The
  decorators are recognized by the parser but ignored by codegen.

- [ ] **No dynamic attribute access** — `setattr()` / `getattr()` /
  `delattr()` don't work on user-class instances.  Attributes are
  instVars, so dynamic access would need reflection (`instVarAt:put:`
  via name lookup) plus a fallback for names that don't have an instVar
  slot.

## Generator Protocol — Remaining Pieces

`PythonGenerator` runs the body in a forked `GsProcess` synchronised
through Semaphores; `__iter__`, `__next__`, `send`, `throw`, `close`
all work.  Outstanding:

- [ ] **`yield from` is still a TypeError stub** — `YieldFromAst >>
  printSmalltalkOn:` emits the same TypeError as the old `YieldAst`.
  Real PEP 380 delegation needs forwarding the inner iterator's
  `send`/`throw`/`close` through the outer generator, plus capturing
  the inner's StopIteration value as the `yield from` expression's
  value.

- [ ] **Cross-process exception forwarding** — when the body raises
  an unhandled exception inside the forked producer, the consumer
  sees `done := true` and raises StopIteration.  The original
  exception is lost (logged by GemStone's process-level handler).
  Two earlier attempts at re-raising in the consumer broke other
  cases — needs careful design.

## Unbound-Name Detection — Remaining Edges

The DNU backstop, load-site definite-assignment check, and instVar
AttributeError check are in place.  Edges left:

- [ ] **AugAssign target reads slip past the load-site check** —
  `x += 1` reads `x` on the RHS through the same `NameAst` that is the
  store target, so `ctx` is `StoreAst` and the wrapper is not emitted.
  The DNU backstop still catches it, but with the less-specific
  *"received `__add__:` on nil"* instead of *"cannot access local
  variable 'x'"*.  Fix options: special-case the RHS in
  `AugAssignAst >> printSmalltalkOn:`, or add a `printSmalltalkLoadOn:`
  on `NameAst` that ignores ctx and is emitted from any context that
  needs a forced load.

- [ ] **Lambda parameters are not declared** — `LambdaAst` does not
  call `declareVariable:` on its parameters, so `isVariableIsDeclared:`
  returns false for them and the load-site check is not emitted.
  Lambda parameters are always bound by the caller, so there is no
  false negative in practice — but a free variable read inside a
  lambda that resolves to an unbound enclosing-scope local would slip
  past the check (the DNU backstop still catches it).  Fix: add
  `declareVariable:` calls during lambda parameter parsing, mirroring
  `FunctionDefAst`.

## Bridge / Boundary nil Leaks

Categories of Smalltalk nil that can still reach Python code despite the
env-1 audit.  Most are documented deviations rather than fixable bugs.

- [ ] **Smalltalk-bridge return values** — Python code that calls a
  pure-Smalltalk method (via the `gemstone` module or attribute access
  on a Smalltalk object) can receive nil if the underlying method
  returns nil.  No general fix.  The DNU backstop catches the resulting
  nil before it propagates further.

- [ ] **Collections containing nil** — a `dict`/`list` populated from
  the Smalltalk side with nil-valued entries leaks nil on subscript
  access.  Not seen in current code paths, but a possibility once
  user-written Smalltalk extensions appear.

- [ ] **Kwargs `ifAbsent: [nil]` sentinels in varargs handlers** —
  `random.gs`, `statistics.gs`, `os.gs`, `builtins.gs`.  The local nil
  is then compared with `a == nil or: [a == None]` to detect "argument
  not given".  Intentional (distinguishes absent from explicit `None`)
  and stays as nil; documented here so a future blanket nil-sweep
  doesn't break the varargs unpacking logic.

## Architectural Cleanup (Non-blocking)

- [ ] **`module` still inherits from `SymbolDictionary`** — deferred
  since the dispatch rewrite.  User modules and user classes use proper
  Smalltalk classes; only the 23 built-in modules still require
  `SymbolDictionary` inheritance (legacy `___at___:` storage of
  constants like `sys.modules`).  Restructuring to an `Object` subclass
  would require migrating those stored attributes to instVars or
  explicit methods.
