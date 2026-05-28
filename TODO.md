# TODO

Known gaps and follow-ups, grouped by area.  Historical entries that have
shipped are not preserved here — `git log` is the source of truth for what
landed and when.

For the Flask trajectory (the largest in-flight goal), see
[docs/Support_Flask.md](docs/Support_Flask.md).  This file tracks language /
runtime gaps that surface independently of the Flask push.

## Bugs Blocking Common Python Idioms

These break programs that look ordinary in CPython.

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

- [ ] **No multiple inheritance** — `class C(A, B):` picks the first
  base only.  Blocks `werkzeug.utils.cached_property(property,
  t.Generic[_T])` and the `BadRequestKeyError(BadRequest, KeyError)`
  pattern in `werkzeug.exceptions` (worked around by inheriting from
  `KeyError` alone in the shim).  Fix would need C3 MRO + per-method
  resolution walking multiple parent chains.

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

## Werkzeug Shims Still in Place

The Werkzeug 3.1.5 source-drop is ~95% upstream verbatim.  These few
files / sites remain as Grail-specific shims or in-place patches.
Each has a tracked root cause elsewhere in this file or in
``docs/Support_Flask.md``.

- [ ] **`werkzeug/utils.py`** — hand-rolled shim, NOT upstream source.
  Upstream's ``cached_property(property, t.Generic[_T])`` blocks on
  multi-inheritance (see Class System Limitations above).  Shim
  exposes the same public surface (cached_property, redirect,
  header_property, environ_property, import_string, find_modules,
  get_content_type) with reduced semantics.  Replace once multi-
  inheritance lands.

- [ ] **`werkzeug/exceptions.py`** — hand-rolled shim, NOT upstream.
  Upstream runs ``_find_exceptions()`` at module-init time which
  walks ``globals().values()`` + calls ``issubclass(obj, HTTPException)``
  on each — the introspection loop fails before exceptions register
  themselves.  ``BadRequestKeyError`` also inherits from ``KeyError''
  alone (upstream is ``(BadRequest, KeyError)`` — see multi-
  inheritance entry).  Replace by fixing both the
  globals()/values() / issubclass introspection AND multi-inheritance.

- [ ] **`werkzeug/urls.py:47-51`** — one commented-out line:
  ``_unquote_partial.__name__ = f"_unquote_{name}"``.  Blocked on
  ExecBlock not supporting dynamic instVar storage (so ``fn.__name__
  = ...`` raises ImproperOperation).  Low impact — only loses a
  debug tag.

- [ ] **`werkzeug/wsgi.py:430`** — `LimitedStream` does not inherit
  from `io.RawIOBase`.  Blocked on Grail's `io` module shimming
  out `RawIOBase`; downstream code that does
  ``isinstance(stream, io.RawIOBase)`` would miss.

- [ ] **`werkzeug/routing/rules.py:323`** — `_IF_KWARGS_URL_ENCODE_AST`
  / `_URL_ENCODE_AST_NAMES` set to ``None`` because Python `ast.parse`
  isn't implemented in Grail.  Routes match correctly but
  ``url_for()`` / ``Rule.build()`` raise on first use.  Blocks Flask
  reverse-routing.

## Flask Source-Drop — Remaining Blockers

Flask 3.1 source is dropped under ``src/python/stdlib/flask/`` and
``import flask`` succeeds end-to-end.  Outstanding work to get
``Flask(__name__).test_client().get('/')`` working:

- [ ] **`flask/cli.py`** — hand-rolled minimal shim, NOT upstream.
  Upstream applies ``@click.command'' / ``@click.option'' decorator
  chains to module-level defs; Grail's codegen for module-scope
  ``def'' compiles the body as a class method on the module class
  without applying the decorator chain.  Module-init reads like
  ``run_command.params.insert(...)'' then fail on a raw BoundMethod.
  Replace the shim once module-level decorator chains land.
  Upstream parked at ``cli_upstream.py.bak''.

  * Attempted a generalised codegen extension (drop the pass-X
    whitelist in ``FunctionDefAst >> printSmalltalkOn:'' /
    ``printPassXDecoratorsOn:'' so every module-level decorator
    fires through the same ``decorator(modAttrLoad)'' →
    ``dynamicInstVarAt:put:'' emit).  The simple cases work
    (validated by a focused fixture exercising identity, register-
    and-return, decorator-factory-with-call, and stacked
    decorators).  The cascade through Jinja2 didn't: jinja2's
    ``@async_variant(sync_do_unique) def do_unique:'' actually runs
    its nested decorator, which inside calls
    ``functools.wraps(...)'' with kwargs (needs a ``_wraps:kw:''
    varargs entry on ``functools'') and then writes
    ``wrapper.jinja_async_variant = True'' on the closure (needs
    side-table attribute storage on ExecBlock — GemStone's
    primitive closures have no varying instVars).  Plus
    ``@app.route('/path')'' wants ``view_func.__name__'' (needs
    ``__name__'' on BoundMethod).  Each fix exposes the next layer.
    Tracked separately — pin those four prerequisites (functools
    varargs entry, ExecBlock attr side-table, BoundMethod __name__
    / __qualname__ / __module__, and downstream LocalProxy
    constructor-shape regressions) before reviving the codegen
    change.

- [ ] **`werkzeug/datastructures/structures.py:961`** — ImmutableDict
  base-order flipped + explicit ``__init__'' / ``__setitem__'' /
  ``__delitem__''.  Upstream is ``ImmutableDict(ImmutableDictMixin[K,
  V], dict[K, V])''; Grail's class machinery picks the first base
  only, so dict has to be first.  The mixin's TypeError-on-setitem
  semantics are then re-asserted via explicit overrides on the
  subclass.  Resolve when multi-inheritance lands.

- [x] **`Flask(name)` constructor trips ``Boolean does not understand
  value:value:''**.  Fixed: ``___pyAttrLoad___'' on a module receiver
  was unconditionally performing any unary selector defined on a
  subclass of ``module'' — so ``from .helpers import get_debug_flag''
  bound ``get_debug_flag'' to the return value (False) rather than
  the BoundMethod.  Discriminate by method ``category:'': only
  ``Grail-Methods'' (Python defs from ``loadModuleFromPath:'') wrap
  as BoundMethod; everything else still performs.  Past that, four
  more gaps surfaced before ``Flask('myapp')'' constructs cleanly:

  * Set comprehensions emitted ``Set new'' (GemStone primitive, no
    env-1 ``add:'') instead of ``set new'' (Grail wrapper).  Fixed
    in SetCompAst.

  * ``SrePattern'' had no ``finditer'' method.  Added env-1 wrappers
    that walk ``search:'' from the previous match end (1-char
    advance on zero-width).  Returns a ``list'' of ``SreMatch'',
    which is iterable.

  * ``Rule.compile'' unconditionally called ``_compile_builder(...)''
    which uses ``ast.parse(...).body[0]''; ``ast.parse'' isn't
    implemented.  Stubbed ``Rule._build'' / ``Rule._build_unknown''
    to raise ``NotImplementedError'' on first use, matching the
    earlier note that routes still MATCH but ``url_for'' / ``build''
    fail.

  * ``StateMachineMatcher.State'' is a ``@dataclass'' with all
    fields declared as ``= field(default_factory=...)''.  Grail's
    decorator codegen runs the decorator and ``_collect_fields''
    walks the metaclass ``_fields'' slot, but ClassDefAst only
    populates ``_fields'' from BARE annotations (NamedTuple
    semantics); ``= field(...)'' annotations land in the
    assigned-value branch and don't reach ``_fields''.  The synth
    ``__init__'' therefore initialises nothing, ``state.static''
    resolves to the class-level ``Field'' descriptor, and
    ``state.static.setdefault(...)'' in ``matcher.add'' raises
    ``AttributeError: Field object has no attribute 'setdefault'``.
    Worked around by dropping ``@dataclass'' from ``State'' and
    writing an explicit ``__init__'' that pins the per-instance
    list/dict.  Proper fix is a generalised dataclass-with-
    default-factory path in ``_collect_fields'' + ClassDefAst's
    ``_fields'' emit — both attempts blew up on Grail's
    definite-assignment check (``UnboundLocalError'' when an
    accessor returns Smalltalk nil for an unset slot).

- [ ] **Class-call protocol for built-in-derived subclasses**.
  ClassDefAst's synthesized ``value:value:'' does ``instance :=
  self new'' then dispatches ``__init__''.  For user classes that
  subclass ``dict'' / ``list'' / etc., the ``new'' produces an
  empty Smalltalk-side instance and the inherited Python-level
  ``__new__: source'' (which would populate from source) is
  skipped.  Worked around per-class with explicit ``__init__''
  overrides (see ImmutableDict above and ``dict.__init__:'' in
  dict.gs).  Proper fix: when the receiver's class chain includes
  a built-in mapped type, dispatch through the chain's
  ``__new__:'' before falling through to ``__init__''.

## Architectural Cleanup (Non-blocking)

- [ ] **`module` still inherits from `SymbolDictionary`** — deferred
  since the dispatch rewrite.  User modules and user classes use proper
  Smalltalk classes; only the 23 built-in modules still require
  `SymbolDictionary` inheritance (legacy `___at___:` storage of
  constants like `sys.modules`).  Restructuring to an `Object` subclass
  would require migrating those stored attributes to instVars or
  explicit methods.
