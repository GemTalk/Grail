# Dispatch Model Rewrite

This document captures the design for moving Grail away from the current
"block-in-a-variable" dispatch model toward direct Smalltalk method dispatch.
It records the motivation, the benchmark measurements that justify the change,
the resulting class model, selector conventions, first-class-function story,
known limitations, and the phased migration plan.

## Current Status (2026-05-25)

Phases 0–5 + Phase A/B + the attribute-protocol arc are complete. The
rewrite has landed end-to-end; the attribute model now honors Python's
data model (descriptors, user-overridable hooks, class-chain walk).

| Phase | Topic | Status |
|-------|-------|--------|
| 0     | Design and benchmarks | complete |
| 1     | Design doc / intent | complete |
| 2     | `abs` end-to-end spike | complete |
| 3     | DNU fallback | superseded by Phase A/B |
| 4a    | Codegen generalization + fixed-arity builtins | complete |
| 4b    | Varargs selector convention | complete |
| 4c    | Structural cleanup | complete |
| 4d    | Attribute-call fast path + per-module migration | complete — all 23 module subclasses converted |
| 5a    | User Python modules → Smalltalk classes | complete (commit `4759f48`) |
| 5b    | Module-level `def` → real Smalltalk methods | complete (commit `1671b8c`) |
| 5c    | Python class defs → real Smalltalk classes | complete (commit `ad729e4`) |
| 6     | Remaining `value:value:` call sites | subsumed by Phase 4d/5; `BoundMethod>>value:value:` is the surviving call protocol for first-class function values |
| A     | Module globals via `dynamicInstVarAt:put:` | complete (commit `760f779`) |
| B     | Instance attributes via `dynamicInstVarAt:put:` | complete (commit `3ac3cd0`) |
| B+1   | Value-type sweep (complex, slice, PyStruct, Hash, ipaddress, io_module, datetime_module) | complete |
| AP-1  | Function rebinding: probe-then-branch + lazy-wrap | complete (commit `3ebe05d`) |
| AP-2  | Attribute store bypasses class methods | complete (commit `620a194`) |
| AP-3  | `del` / `delattr` symmetry + `delattr` builtin | complete (commit `bcc9b58`) |
| AP-4  | User-overridable `__setattr__` / `__getattr__` / `__delattr__` | complete (commit `5d94848`) |
| AP-5  | `@property` data descriptors honored | complete (commit `3c3addf`) |
| AP-6  | Class-side dynamic attrs via `dynInstVars` slot | complete (commit `58b3e77`) |
| AP-7  | Class-chain walk on attribute load | complete (commit `d36e502`) |

## Motivation

Today, a Python call like `abs(5)` compiles to Smalltalk along the lines of:

```smalltalk
abs value: { 5. } value: nil
```

The identifier `abs` is an unbound free name. Resolution walks the symbol list
(which has `builtins ___instance___` inserted at position 1), finds the
`builtins>>abs` getter, returns the block stored under `#abs`, and then sends
`value:value:` to that block with a positional Array and a keywords Dictionary.
Inside the block, the body does `positional ___at___: 1` to recover the single
argument and finally calls `__abs__`.

This is uniform but expensive. It requires:

1. A symbol-list walk per free-name reference.
2. An extra `value:value:` message send through a block.
3. Heap allocation of a positional Array on every call.
4. Explicit argument extraction inside the block.
5. A nil (or Dictionary) for the keywords slot even when there are none.

The design goal of Grail is to compile Python into *idiomatic Smalltalk*, and
to run close to native Smalltalk performance. The current dispatch model
stands in the way of that goal.

## Benchmark Measurements

Profiling was done on [`ProfClass`](../benchmarks/ProfClass.gs). Each cell is
the average per iteration over 100,000,000 iterations of `timesRepeat:`.
Numbers in the "Minus baseline" column subtract the empty-loop cost (3.44 ns)
so they reflect dispatch and body work only.

| Operation                                           | Raw (ns) | Minus baseline (ns) |
|-----------------------------------------------------|---------:|--------------------:|
| Empty `n timesRepeat: []` loop                      |     3.44 |                0.00 |
| `3 abs` inline (no send)                            |     8.19 |                4.75 |
| Array allocation `{ 3 }` alone                      |     8.32 |                4.88 |
| `self perform: #abs1: with: 3` (reflective)         |    19.75 |               16.31 |
| `self abs1: 3` (fixed-arity method, body inline)    |    11.51 |                8.07 |
| `self abs1: p _: k` (2-keyword method, body inline) |    19.03 |               15.59 |
| `self abs2: 3` (fixed-arity method, body in block)  |    13.97 |               10.53 |
| `self abs2: p _: k` (2-keyword, body in block)      |    22.77 |               19.33 |

### What the numbers say

- **Method dispatch itself is ~3.3 ns.** `abs1:` is 8.07 ns after baseline;
  the body (`aNumber abs`, which is a branch and possibly a subtraction — not
  a true primitive) is 4.75 ns. The send overhead is the difference: ~3.3 ns.
  That is the "idiomatic Smalltalk" floor for a one-argument keyword send on
  this GemStone build.
- **Varargs costs ~7.5 ns on top of fixed arity.** The delta between `abs1:`
  and `abs1:_:` is 7.52 ns, comprising ~4.9 ns of Array allocation plus ~2.6 ns
  of extraction and the extra keyword argument. On a call budget trying to
  stay near 8 ns, a flat 7.5 ns tax per call is unacceptable for the common
  case. **Fixed-arity dispatch is mandatory.**
- **Body-in-method beats body-in-block by ~2.5 ns.** `abs1:` is 2.46 ns
  faster than `abs2:`. The extra `value:` send and block activation account
  for this. The natural Smalltalk idiom (body in the method itself) is also
  the fastest.
- **Reflective dispatch costs ~16 ns** — `perform:with:` is roughly 2x the
  fast path. That is an acceptable budget for the uncommon slow path (DNU
  fallback, first-class function call through a variable).
- **Array allocation alone is ~4.9 ns.** Almost the entire varargs overhead
  is the positional Array. Anything that can avoid allocating it wins.
- **Today's Grail `abs(5)` is worse than `abs1:_:` at 19 ns.** The benchmark
  above uses a direct `self` receiver and skips the symbol-list walk. Real
  Grail calls also pay symbol-list resolution, so the current baseline is
  probably 25-30 ns of pure dispatch cost (on top of whatever the body does).
  The speedup from this rewrite is therefore larger than the raw table
  suggests — from ~25-30 ns down toward ~8 ns for the common case.

### Caveats

- The microbenchmark exercises `SmallInteger abs`, which turns out not to be
  a primitive but a short Smalltalk method (`self < 0 ifTrue: [^ 0 - self]`).
  The 4.75 ns "body" number therefore reflects a real method, not a primitive.
  For trivial methods the floor is likely closer to 3-4 ns.
- The benchmark measures *dispatch*, not full Python-call cost. Grail still
  has to resolve Python semantics (`__abs__` lookup, numeric coercion, error
  translation) inside the body. The rewrite optimizes dispatch; body cost is
  unchanged.
- Numbers will vary by GemStone version and host CPU. They are directionally
  stable but should be re-measured at major milestones.

## Design Overview

> **Reader's note.** This section describes the design as it now ships.
> Phases 0–5 are complete; see the "Current Status" table above. The
> Migration Plan section below records how the rewrite got here,
> phase by phase, for historical context.

The rewrite is built on four interlocking decisions:

1. **Python modules become Smalltalk classes.** Every module is an instance
   of its own class; module globals are instance variables; module-level `def`s
   are methods. A module body compiles into a method on its module class,
   with `self` bound to the module instance.
2. **The `module` class is concrete.** It holds all shared module behavior
   and the contents of Python's `builtins`. A Python module's class inherits
   from `module` directly. A `builtins` subclass exists as an empty subclass
   so `import builtins` has something to return, but contributes no behavior
   of its own.
3. **Calls compile to fixed-arity keyword sends when possible.** `abs(5)`
   compiles to `self abs: 5`. `max(a, b)` compiles to `self max: a _: b`. The
   common case pays only method-dispatch cost (~3 ns send + body).
4. **First-class function values use a `BoundMethod` wrapper, materialized
   at Name-read sites by the compiler.** The assignment path is untouched;
   only the *read* of a name that resolves to a method is compiled
   differently.

### The `module` / `builtins` hierarchy

```
Object
  module                         " concrete, carries shared module behavior "
    builtins                     " empty subclass, exists for `import builtins` "
    <user module 1>              " inherits from module; not from builtins "
    <user module 2>
    ...
```

Every Python module's generated Smalltalk class is a direct subclass of
`module`. Python's LEGB (`Local → Enclosing → Global → Built-in`) name
resolution maps onto this structure as:

- **Local** — Smalltalk method locals and parameters.
- **Enclosing** — not supported in v1 (see Limitations). Nested functions
  remain as blocks and capture via normal Smalltalk block closure semantics.
- **Global** — instance variables and methods of the module class.
- **Built-in** — behavior inherited from `module`.

Inheritance from `module` is a **lookup optimization**, not a type-theoretic
claim about `is-a`. `type(math) is type(builtins)` should still report the
same `<class 'module'>`. The next person to read this code should not "fix"
the inheritance by flattening it; the lookup performance depends on it.

#### Initialization order

Because every module's generated class inherits from `module`, the `module`
class must be fully compiled and installed before any module class that
subclasses it can be built. The Python-side `builtins` module is loaded
first; other modules follow. This ordering must be reflected in `install.sh`.

#### Why not make modules subclass `builtins`?

An earlier sketch had user modules subclass `builtins`. Moving the shared
behavior up to `module` and making `builtins` an empty leaf is cleaner: it
says, correctly, that "built-in behavior is what every module carries," and
it avoids implying that `math` IS-A `builtins`.

### Selector conventions

**Fixed-arity (fast path).** The positional-argument separator keyword is
`_:`, which reads as "unnamed positional slot":

| Python call                | Smalltalk emitted                         |
|----------------------------|-------------------------------------------|
| `abs(x)`                   | `self abs: x`                             |
| `max(a, b)`                | `self max: a _: b`                        |
| `range(start, stop, step)` | `self range: start _: stop _: step`       |
| `f(a, b, c, d)`            | `self f: a _: b _: c _: d`                |

Each additional positional argument appends `_:`. Keyword arguments by name
(e.g. `foo(x, sep='-')`) compile using the real keyword name: `self foo: x
sep: '-'`. This is possible whenever the callee's signature is known at
compile time.

**Varargs fallback (slow path).** When a `def` uses `*args`/`**kwargs`, or
when the call site cannot prove the callee's signature, the varargs form is
used. It is a two-keyword selector prefixed with a single underscore:

| Python call        | Smalltalk emitted                         |
|--------------------|-------------------------------------------|
| `foo(*a, **kw)`    | `self _foo: positionalArray kw: kwargDict` |
| `bar(1, 2, k=3)`   | `self _bar: { 1. 2. } kw: (IdentityKeyValueDictionary new at: #k put: 3; yourself)` |

Rationale for the underscore prefix:

1. All varargs fallbacks sort together in the method browser, visually
   grouped as "the slow path."
2. `_` is a clear namespace marker distinct from the fast path.
3. Fixed-arity and varargs selectors for the same function can never
   collide: `max(a, b)` emits `max:_:` while `foo(*a, **kw)` emits
   `_foo:kw:`. The `_:` positional separator and the `_` prefix are
   orthogonal and visually distinct.

Python names that already begin with `_` (e.g. `def _abs(x)`) get Smalltalk
selectors `_abs:` (fast) and `__abs:kw:` (varargs fallback). The rule is
mechanical: prepend one underscore regardless of the original name.

### First-class function values: `BoundMethod`

Python allows `f = abs; f(5)`. To support this without forcing every call
through the slow path, the compiler distinguishes calls from reads:

- **Direct call site** (`abs(5)`): `CallAst` sees its function is
  `NameAst('abs')` resolving to a known method, and emits `self abs: 5`.
  Fast path, no BoundMethod involved.
- **Name read in load context** (`f = abs`): `NameAst` sees `abs` resolves
  to a known method, and emits
  `BoundMethod receiver: self selector: #abs:`. A small wrapper object is
  allocated once at this read site.

`BoundMethod` is a lightweight class with two instance variables,
`receiver` and `selector`, and implements `value:`, `value:value:`,
`value:value:value:`, and a generic `value:value:` for the varargs form.
Each `value:...` method forwards via `perform:with[Arguments]:`, which
measured at ~16 ns in the profiling data. That is the budget for calling
through a variable.

**The crucial property: the decision is compile-time.** Scope analysis,
which the parser already performs via `variableStack`, tells
`NameAst>>printSmalltalkOn:` whether a given name is a local, parameter,
free name, or known method. Plain variables and constants compile exactly
as they do today:

```python
x = 42
y = x            # y := x                     (x is a local, plain assignment)
```

`BoundMethod` materialization fires only when scope analysis classifies
the name as a method on the module class. There is no runtime check on
every assignment.

#### Worked example

```python
def foo():
    a = abs         # a := BoundMethod receiver: self selector: #abs:
    b = a           # b := a                   (a is a local)
    c = 42          # c := 42
    d = c           # d := c                   (c is a local)
    return b(-5)    # ^ b value: -5            (b is a local of unknown type)
```

The `return b(-5)` compiles as `b value: -5` because `b` is a local and
the compiler doesn't know what it holds. `BoundMethod>>value:` forwards
via `perform:with:`, hitting `abs:` at ~16 ns total. Paid only when
calling through a variable; direct `abs(-5)` still hits `self abs: -5`
at ~8 ns.

### Dynamic attribute storage

Python supports `setattr(module, 'newname', value)`, `globals()['x'] = 5`,
`from m import *`, and arbitrary `obj.x = v` on instances and classes —
all of which can create attributes the compiler never saw.  These
cannot become statically-declared Smalltalk instance variables (which
would require recompiling the class), so Grail uses GemStone's
**dynamic instance variable** primitives.

| Layer            | Storage                                                | Probe                                                          |
|------------------|--------------------------------------------------------|----------------------------------------------------------------|
| Module global    | `dynamicInstVarAt: #name put: v` on the module instance | `dynamicInstVarAt: #name` (Phase A)                            |
| Instance attr    | `dynamicInstVarAt: #name put: v` on the instance        | `dynamicInstVarAt: #name`, then class chain (Phase B)          |
| Class attr       | `cls dynInstVars dynamicInstVarAt: #name put: v` (an `Object new` proxy held in a classInstVar) | Class chain walk on `dynInstVars` |

The same storage is reached from every entry point:

- `obj.x = v` codegen → `obj @env1:__setattr__: 'x' _: v` →
  `object>>__setattr__:_:` → polymorphic helper `___pyAttrStore___:put:`
- `setattr(obj, 'x', v)` builtin → same `__setattr__` dispatch (returns `None`)
- `del obj.x` codegen and `delattr(obj, 'x')` → `__delattr__:` →
  `___pyAttrDelete___:`

The dispatch through `__setattr__` / `__delattr__` lets user classes
override the protocol (validation, lazy conversion, computed
attributes — see the Fahrenheit/Celsius Thermometer in
`AttributeProtocolTestCase`).  The default `object>>__setattr__:_:` checks
for a paired unary getter + 1-arg setter on the class chain — a data
descriptor signature (`@property` with a setter, or a body-declared
classInstVar with auto-generated accessors) — and dispatches to it
before falling through to the dict store.

Reads route through `___pyAttrLoad___` which probes (in order):

1. The instance's own `dynamicInstVarAt:` (the fastest path — direct slot read)
2. Module dunders (`__name__`, etc.) on module receivers
3. Class-side accessor pairs (`name` getter + `name:` setter) — value attrs
4. Metaclass walk for `@classmethod` / `@staticmethod` BoundMethod wrap
5. `___pythonValueAttrs___` shim hook for built-in wrapper classes
6. Generic class-chain BoundMethod wrap for callable selectors
7. The **`dynInstVars` chain walk** — for both class and instance receivers,
   walk `self`-or-`self class` → superClass → ..., probing each level's
   `dynInstVars dynamicInstVarAt:`.  This honors Python's class-chain
   attribute inheritance.
8. User-defined `__getattr__` as the final fallback (default raises
   AttributeError).

This replaces the original Phase-1 plan's `_dynamic` dictionary +
`doesNotUnderstand:` design.  The dynamic-instVar primitive
outperforms a Smalltalk Dictionary lookup (~3-4× per measurement) and
preserves the nil-as-absent convention without sentinels.  See
[Built-in Functions.md](Built-in%20Functions.md) for the full attribute
protocol reference and `AttributeStoreTestCase` /
`AttributeAccessTestCase` / `AttributeProtocolTestCase` /
`AttributePropertyTestCase` / `ClassAttributeTestCase` /
`AttributeInheritanceTestCase` for the pinned semantics.

## Known Limitations (documented, not bugs)

These are deliberate v1 simplifications. Each has a clear failure mode so
users see a loud error rather than silent wrong behavior.

### Monkey-patching of module-level defs *is* supported (Phase AP-1)

The original limitation — that `def foo(): ...; foo = 21` would silently
keep calling the original — was lifted by the function-rebinding fix
(commit `3ebe05d`).  Module-level bare-name call sites now compile to a
**probe-then-branch** dispatch:

```smalltalk
([:___f___ |
    ___f___ == nil
        ifTrue:  [self foo: arg]                       " fast path "
        ifFalse: [___f___ @env1:___pyCallValue___: { arg } kw: nil]]
    value: (self @env0:dynamicInstVarAt: #foo))
```

An absent slot keeps the fast self-send to the def's compiled method
(zero overhead vs. pre-rewrite).  A present slot calls the rebound value
via the new `___pyCallValue___:kw:` protocol — `BoundMethod` overrides
it to forward via `value:value:`; the default on `object` raises
`TypeError("'<typename>' object is not callable")` to match CPython.

Top-level `def`s are no longer pre-stored as `BoundMethod`s at module
init; the slot stays nil until an explicit rebind writes to it.  Reading
the name through Python attribute access (`mod.foo` or
`module>>doesNotUnderstand:`) lazy-wraps the class method as a
`BoundMethod` on demand — preserving first-class function semantics
without blocking rebinding detection.

What's still **not** supported:

- Rebinding `builtins.abs = my_abs` at module load — `abs` is a class
  method on `builtins`, not a stored value, and the call site
  optimistically emits `(builtins instance) abs: x`.  Rebinding the
  module instance attribute via `builtins.abs = my_abs` lands in
  `(builtins instance)`'s `dynInstVars` but the fast call path skips
  the probe-then-branch for builtins-class calls.
- Rebinding class methods at runtime (`C.foo = new_foo` then
  `c.foo()`) — class-side dispatch goes direct, not through the
  rebinding-aware probe.

For user module top-level defs, rebinding fully works; see
`FunctionRebindingTestCase` for the pinned semantics.

### `global` and `nonlocal` are not supported

These parse successfully but have no runtime effect in v1. A name declared
`global` inside a function does not currently rebind the module-level name;
`nonlocal` does not rebind an enclosing-scope name. Correct support for
either requires tracking binding-target scope separately from read-resolve
scope, which is out of scope for the dispatch rewrite.

**Failure mode:** should be a clear warning or runtime error at the point
of the `global`/`nonlocal` declaration, not silent misbehavior. Revisit
this when enclosing-scope support is added.

### Nested `def`s remain as blocks

Inner functions are not compiled as methods on the module class — they are
closures. `def outer(): def inner(): ...; inner()` compiles `inner` as an
ExecBlock stored in a local, and `inner()` compiles to `inner value:` (the
block form, not the method form). This is mechanically correct and matches
current behavior; it just means nested calls don't benefit from the
fast-path speedup.

Lambdas are likewise blocks, not methods.

### Dynamic attributes use `dynamicInstVarAt:put:` (no DNU)

The original Phase-1 design called for a `_dynamic` dictionary plus a
`doesNotUnderstand:` handler.  Phase A/B replaced that with GemStone's
**dynamic instance variable** primitives (`dynamicInstVarAt:put:` /
`dynamicInstVarPairs` / `removeDynamicInstVar:`), which outperform a
Dictionary lookup and integrate cleanly with the nil-as-absent
convention.

Reading a dynamic attribute is a direct slot probe, not a reflective
send — so the cost is comparable to a regular instance-variable read,
not the ~16 ns DNU price the original design accepted.  See "Dynamic
attribute storage" in the Design Overview.

## Migration Plan

### Phase 0 — Design doc (this file)

Capture decisions, benchmark data, and limitations so the rationale isn't
lost during implementation.

### Phase 1 — Documentation and design intent (completed)

The original Phase 1 plan called for restructuring `module` as a plain
`Object` subclass with explicit instance-variable storage, defining
`BoundMethod`, and extending `ModuleAst>>executeWithScope:` to compile
module bodies into methods on their module class.

**That plan turned out to be entangled with Phase 4** (generalized
codegen) and could not be done in isolation. The reason: the existing
compile pipeline at
[ModuleAst.gs:94](../src/smalltalk/PythonAst/ModuleAst.gs#L94) and
[PythonTestCase.gs:72](../src/smalltalk/PythonTests/PythonTestCase.gs#L72)
inserts `builtins ___instance___` directly into a Smalltalk symbol list:

```smalltalk
symbolList insertObject: builtins ___instance___ at: 1.
```

This insertion is how bare-name references like `abs` in compiled Python
source resolve to the installed block. **It only works if the inserted
object is dictionary-shaped** (a `SymbolDictionary` or compatible). The
first attempt to make `module` a plain `Object` with an `attrs` instance
variable broke 170 tests with `ArgumentTypeError: a builtins expected a
SymbolDictionary`.

Disconnecting the symbol-list dependency requires the codegen to stop
emitting bare-name `abs` and instead emit `self abs: x` — which is
exactly the work of Phase 4. Until then, `module` must remain a
`SymbolDictionary` subclass.

**What actually landed in Phase 1:**

- [`src/smalltalk/Python/module.gs`](../src/smalltalk/Python/module.gs) —
  rewrote the file header and class comment to document both the
  end-state design and the Phase-1 reality, including a prominent
  explanation of why the structure cannot change yet. Method
  organization cleaned up; behavior unchanged. Still a
  `SymbolDictionary` subclass.
- [`src/smalltalk/Python/builtins.gs`](../src/smalltalk/Python/builtins.gs)
  — updated the class comment to document its new role as "an empty
  subclass that exists so `import builtins` has a class to return," with
  a note that the existing block-installation methods are a legacy
  compatibility layer awaiting Phase 2+ conversion.
- Confirmed clean install + full test suite green: **1425 main + 54
  embedded CPython tests, 0 failures, 0 errors.**

**What was deferred and where it now lives:**

- `module` as `Object` subclass with explicit instance variables for
  globals → moved into Phase 4, after codegen no longer needs the
  symbol-list trick.
- `BoundMethod` class definition → moved into Phase 2, where it is
  first actually needed (for `f = abs; f(5)`).
- `ModuleAst>>executeWithScope:` rewrite → also moved into Phase 4,
  alongside the codegen change.

The lesson for Phase 2 onward: the symbol-list-based name resolution is
load-bearing for the *current* dispatch model and can only be retired
incrementally. Each phase must keep the legacy path working until its
direct replacement is in place.

### Phase 2 — Convert `abs` end-to-end (completed)

Phase 2 took option 1 from the strategy section below: the spike
special-cases `abs` in the codegen and emits a direct keyword send
without restructuring `ModuleAst`. `BoundMethod` was introduced as part
of this phase, since it is the first place a real value of "function as
data" is needed.

**What landed:**

- New class [`BoundMethod`](../src/smalltalk/Python/BoundMethod.gs) — a
  small wrapper around `(receiver, selector)` that responds to
  `value:value:` (the legacy varargs form) by forwarding via
  `perform:env:withArguments:`. Single-purpose for now; the fixed-arity
  forms (`value:`, `value:value:`, ...) will be added when codegen can
  exploit them in a later phase.
- New env-1 method
  [`builtins>>abs:`](../src/smalltalk/Python/builtins.gs) holding the
  real implementation. The previous `abs:` setter (which was unused for
  installation — the block was installed via `___at___:put:`) was
  replaced.
- The `initialize_abs` method now installs a delegating closure under
  `#abs` that forwards to `self abs:`. This keeps the legacy
  block-in-a-slot path working for any code that still reads `abs` via
  `b @env1:abs` or via getattr-style fallback.
- [`BlockAst>>isVariableIsDeclared:`](../src/smalltalk/PythonAst/BlockAst.gs)
  added so the AbstractNode walk for shadow detection actually has an
  implementation to walk to. The previous AbstractNode-only definition
  was a dead chain that always recursed up to nil.
  [`AbstractNode>>isVariableIsDeclared:`](../src/smalltalk/PythonAst/AbstractNode.gs)
  was fixed to terminate at nil-parent rather than crashing.
- [`CallAst>>printSmalltalkOn:`](../src/smalltalk/PythonAst/CallAst.gs)
  detects `abs(x)` (one positional, no kwargs, name not shadowed) and
  emits `((builtins instance) abs: <arg>)` instead of the legacy
  `abs value: { <arg> } value: nil`. The check is gated on
  `isVariableIsDeclared:` so a local Python variable named `abs` still
  shadows the builtin correctly.
- [`NameAst>>printSmalltalkOn:`](../src/smalltalk/PythonAst/NameAst.gs)
  detects load-context reads of bare `abs` (e.g., `f = abs`,
  `map(abs, …)`) and emits
  `(BoundMethod receiver: (builtins instance) selector: #abs:)`. Store
  context (`abs = something`) is unaffected because that path uses
  `printSmalltalkAssignmentOn:`.
- [`BuiltinsTestCase`](../src/smalltalk/PythonTests/BuiltinsTestCase.gs)
  test `testAbs` rewritten to call the new method directly. New tests:
  `testAbsViaEval` (exercises codegen for `abs(x)`), `testAbsAsValue`
  (exercises BoundMethod for `f = abs; f(-5)`), and `testAbsShadowed`
  (verifies a local named `abs` shadows the builtin).
- BoundMethod added to [`install.gs`](../src/smalltalk/install.gs) and
  loaded after `module.gs`.

**Test status:** clean install + full suite green: **1428 main + 54
embedded CPython tests, 0 failures, 0 errors.** The +3 vs Phase 1
matches the three new `BuiltinsTestCase` tests.

#### Benchmark results

Measured by adding a temporary env-1 method on `builtins` that runs
each loop 100,000,000 times entirely from inside env 1 (no env-switch
overhead per iteration). Numbers in nanoseconds per iteration:

| Operation                                              | ns    |
|--------------------------------------------------------|------:|
| Empty loop baseline                                    |  2.98 |
| `self abs: 3` (Phase-2 fast path, env-1 method send)   | 48.12 |
| `absBlock value: { 3 } value: nil` (legacy varargs)    | 65.11 |
| `3 __abs__` (body alone, body of `builtins>>abs:`)     | 13.52 |

**Dispatch savings: ~17 ns per call (~26% faster).** That is the
~25–30% improvement predicted by the Phase 0 microbenchmarks for the
dispatch component, applied to a real `builtins>>abs:` body.

The 48 ns includes both the dispatch and the body of `builtins>>abs:`,
which is `[aNumber __abs__] ___on___: MessageNotUnderstood do: [...]`.
The body alone (`3 __abs__` from env 1) is 13.5 ns; the rest is method
activation, the `___on___:do:` exception handler setup, and the
delegating dispatch through `__abs__`. The exception handler is real
work — it converts a Smalltalk `MessageNotUnderstood` into a Python
`TypeError` for non-numeric arguments — but it is also the largest
component of the per-call cost. Reducing it is a topic for a later
phase, not Phase 2.

The legacy 65 ns includes the same body work plus the extra `value:value:`
send through the delegating closure and the positional Array allocation
and extraction. The 17 ns difference is the pure dispatch savings from
the rewrite.

The 8 ns "near native Smalltalk" target from the Phase 0 design doc is
not yet hit because the body of `builtins>>abs:` is itself an env-1 → env-1
method that does substantially more than the trivial `aNumber abs` body
the Phase 0 microbenchmark used. Bringing the body cost down requires:

1. Cheaper Smalltalk-error → Python-TypeError translation (the
   `___on___:do:` is doing real work but at a high fixed cost).
2. Direct numeric dispatch in the body (avoid the env-1 `__abs__`
   re-dispatch).

These are body-side optimizations and are out of Phase 2's scope.
Phase 2 has validated that the *dispatch* model works and that the
fast path is measurably faster than the legacy path.

#### What Phase 2 did not do

- The codegen still emits the verbose `((builtins instance) abs: x)`
  form rather than `self abs: x`. The latter would require giving the
  generated module body a meaningful `self`, which is the Phase 4
  `ModuleAst>>executeWithScope:` rewrite. The current form is one extra
  send (`builtins instance`) per call, but it works without restructuring
  the compile pipeline.
- Only `abs` is converted. Every other builtin (`len`, `print`, `type`,
  ...) still uses the legacy block-in-symbol-list path. Generalization
  is Phase 4.
- `BoundMethod` only implements `value:value:`. Fixed-arity forms
  (`value:`, `value:value:`, etc.) will be added when codegen can emit
  them — once first-class function call sites know they are calling a
  BoundMethod, they can skip the positional-array packing.
- Calls like `abs(1, 2)` (wrong arity) now produce a Smalltalk
  `MessageNotUnderstood` rather than a clean Python `TypeError`. The
  original block silently ignored the extra argument and returned
  `abs(1)`, which was even more wrong. A proper error path is a
  follow-up.

#### Phase 2 strategy notes (for reference)

The Phase 2 work is now responsible for both the first conversion and
for introducing `BoundMethod` (since Phase 1 deferred it).

**Critical pre-work — the symbol-list problem.** Today's codegen emits
`abs value: { 5. } value: nil`, where `abs` is a bare identifier
resolved through the symbol list. To emit `self abs: 5` instead, the
generated module method must have a meaningful `self` bound to a
`builtins` instance (or a module that inherits from it). This is the
piece that Phase 1 could not do in isolation. Phase 2 has two options:

1. **Special-case `abs` in CallAst without changing the generated
   wrapper.** Emit `((Python at: #builtins) ___instance___ abs: 5)` —
   bypassing the symbol list entirely for the one converted name.
   Verbose but mechanically isolated; no compile-pipeline change
   required. Use this for the spike.
2. **Change `ModuleAst>>executeWithScope:` to compile module bodies as
   methods on a module class with `self` bound to the module instance.**
   Cleaner long-term but enlarges Phase 2 significantly.

Recommend starting with option 1 to validate the dispatch model and
benchmark numbers. Move to option 2 only when the spike has confirmed
the design works end to end.

**Phase 2 tasks:**

- Define `BoundMethod` with `receiver`, `selector`, and `value:`,
  `value:value:`, `value:value:value:`, plus a varargs `value:value:`
  for the fallback form. Smoke-test it in isolation.
- Define `builtins>>abs: aNumber` as a real env-1 method with the body
  inline:
  `^ [aNumber __abs__] on: MessageNotUnderstood do: [:ex | TypeError ___signal___]`.
- Remove the `initialize_abs` block installation from `builtins.gs`.
- Add a narrow special case in `CallAst>>printSmalltalkOn:`: when the
  function is `NameAst('abs')`, arg count is 1, and kwargs are empty,
  emit the option-1 form above.
- Add a special case in `NameAst>>printSmalltalkOn:`: when the name is
  `abs` in load context, emit
  `(BoundMethod receiver: ((Python at: #builtins) ___instance___) selector: #abs:)`.
- Update `BuiltinsTestCase>>testAbs` to match the new path.
- Add `BuiltinsTestCase>>testAbsAsValue` exercising `f = abs; f(5)` and
  `list(map(abs, [-1, 2, -3]))`.
- Benchmark `abs(3)` against the current implementation.

This proves every piece of the model before scaling. Expected result: a
~2-3x speedup on the `abs` fast path and a working first-class-function
test.

### Phase 3 — DNU fallback (superseded)

The original Phase 3 plan was to install a `doesNotUnderstand:` handler
on `module` that would catch optimistically-emitted fast-path selectors
that didn't actually exist on the receiver, repack their arguments as
`(positionalArray, kwargDict)`, and retry as `_name:kw:`. The premise
was that codegen could emit the fast-path form *without proving* the
receiver implements it, and rely on DNU as a runtime safety net.

**Phase 4 took a different (cleaner) path.** Both the codegen
([`CallAst phase4FastPathSelector`](../src/smalltalk/PythonAst/CallAst.gs)
and `phase4VarargsFastPathSelector`) and the runtime first-class-call
path ([`BoundMethod>>value:value:`](../src/smalltalk/Python/BoundMethod.gs))
introspect `builtins methodDictForEnv: 1` *before* emitting/dispatching:

- Codegen builds the candidate selector (`name:`, `name:_:`, …, or
  `_name:kw:`) and checks `methodDictForEnv: includesKey:` at compile
  time. If the selector exists, the call is emitted as a direct send.
  If not, the codegen falls through (or, for known builtins, emits a
  clean TypeError — see below).
- BoundMethod tries the arity-resolved fixed-arity selector first,
  checks the receiver explicitly via `_receiverHasSelector:`, and only
  falls back to `_name:kw:` if the fixed-arity selector is absent.

In both cases, **the code never emits or sends a selector that the
receiver doesn't already implement**, so the DNU repack path would
never fire. The Phase 3 design is solving a problem the Phase 4
implementation doesn't have.

#### The one issue Phase 3 was also meant to address

Phase 3's secondary goal was *clean error messages on arity mismatch*
(e.g. `abs(1, 2)` should produce a Python `TypeError`, not a
GemStone `undefined symbol` compile error). After Phases 4a–4c, that
specific issue was the only remaining regression: with `builtins`
no longer in the symbol list, a fast-path miss on a known builtin
fell through to the legacy bare-name form, which the GemStone
compiler then rejected as an undefined symbol.

The fix lives in [`CallAst printSmalltalkOn:`](../src/smalltalk/PythonAst/CallAst.gs):
between the varargs fast path and the legacy fallback, a new
**known-builtin arity error** check fires. If the function name has
*any* env-1 selector on `builtins` (checked via
`NameAst class >> isFastPathBuiltinName:`) but neither fast path
matched, the codegen emits a `TypeError ___signal___:` expression
directly instead of falling through. The user sees a clean Python
TypeError describing the call shape:

| Source           | Error                                                                                          |
|------------------|------------------------------------------------------------------------------------------------|
| `abs(1, 2)`      | `TypeError: abs() takes wrong number of arguments (2 positional, 0 keyword) - no matching builtins method` |
| `abs(x=5)`       | `TypeError: abs() takes wrong number of arguments (0 positional, 1 keyword) - no matching builtins method` |
| `divmod(10)`     | `TypeError: divmod() takes wrong number of arguments (1 positional, 0 keyword) - no matching builtins method` |
| `divmod(10, 3, 1)` | `TypeError: divmod() takes wrong number of arguments (3 positional, 0 keyword) - no matching builtins method` |
| `unknown_thing(5)` | (still a GemStone `CompileError: undefined symbol unknown_thing` — correct, since the name is not a builtin and may resolve via the symbol list) |

The error message intentionally does *not* include the expected
arity. Computing it would require enumerating all selectors on
`builtins` matching the base name and deriving the supported counts.
That's possible but added complexity for marginal benefit; the user
already knows what they typed, and the actual count plus "no matching
builtins method" is enough to identify the bug.

Tests in [`BuiltinsTestCase`](../src/smalltalk/PythonTests/BuiltinsTestCase.gs):

- `testAbsWrongArityRaisesTypeError` — `abs(1, 2)`, `abs(1, 2, 3)`,
  `abs()` all raise TypeError.
- `testFixedArityWithKwargsRaisesTypeError` — `abs(x=5)`,
  `len(s="hi")` raise TypeError.
- `testTwoArgWrongArityRaisesTypeError` — `divmod(10)` and
  `divmod(10, 3, 1)` raise TypeError.

Test status after the fix: **1436 main + 54 embedded CPython tests,
0 failures, 0 errors.** The +3 over Phase 4c matches the three new
arity-error tests.

#### Future work (not in scope)

- **Dynamic attribute access tests.** The original Phase 3 also
  mentioned tests for dynamic attribute access (`setattr`,
  `globals()[…]`). Those will land naturally when Phase 5 introduces
  the per-module class with explicit instance variables and a
  `_dynamic` fallback dict.

### Phase 4 — Generalize codegen and convert all simple builtins (completed)

Phase 4 in the design carries the bulk of the rewrite. The work splits
into three pieces:

- **Phase 4a — codegen generalization and fixed-arity builtin
  conversion** (completed). Adds a generalized fast path that any
  fixed-arity builtin can opt into by simply existing as a method on
  `builtins`. 24 builtins converted.
- **Phase 4b — varargs selector convention and remaining builtin
  conversion** (completed). Adds the `_name:kw:` varargs selector
  shape, converts the remaining 7 builtins (`print`, `zip`, 3-arg
  `pow`, 2-arg `round`, `input`, `quit`, `__import__`) into real
  methods. Removes Smalltalk-internal helper names (`powWithMod`,
  `inputWithPrompt`, `roundWithDigits`) that were artifacts of the
  legacy 1-arg-vs-2-arg split.
- **Phase 4c — structural cleanup** (completed). Three of the
  four objectives shipped: the symbol-list insertion of
  `builtins ___instance___` is gone from every codegen and runtime
  path; the legacy `BuiltinsTestCase` block-fetch test pattern is
  fully converted to direct method calls; the dead `initialize_X`
  blocks and unary `name` getters were deleted from `builtins.gs`,
  shrinking the file from 1404 to 601 lines (57% reduction). The
  fourth objective — restructuring `module` as a plain `Object`
  subclass — was attempted but reverted: it is entangled with module
  loading (`importlib loadModuleFromPath:` uses the moduleInstance as
  its compile-time variable scope, which only works on dictionary-
  shaped objects). That restructure now belongs to Phase 5, where
  generating a real Smalltalk class per Python module with declared
  instance variables makes the dictionary-shaped runtime instance
  unnecessary in the first place.

#### Phase 4a — Codegen generalization and builtin conversion (completed)

**What landed:**

- [`CallAst>>printSmalltalkOn:`](../src/smalltalk/PythonAst/CallAst.gs)
  generalized via three new methods: `phase4FastPathSelector` (decides
  eligibility — name not shadowed, no kwargs, candidate selector exists
  on builtins in env 1), `phase4SelectorForName:arity:` (builds the
  arity-specialized selector — `name`, `name:`, `name:_:`, `name:_:_:`,
  …), and `printPhase4FastPathOn:selector:` (emits
  `((builtins instance) name: arg1 _: arg2 _: arg3)`). Eligibility is
  decided by querying `builtins methodDictForEnv: 1` at codegen time —
  no static list of fast-path-eligible names is maintained anywhere.
- [`NameAst>>printSmalltalkOn:`](../src/smalltalk/PythonAst/NameAst.gs)
  generalized to materialize a `BoundMethod` for any name that resolves
  to a fast-path-eligible builtin in load context. Requires a parent
  walk via `isFunctionPositionOfCall` to suppress the BoundMethod when
  the name is the function position of a CallAst (otherwise non-fast-path
  calls like `print(1, 2, 3)` would force-wrap their function in a
  BoundMethod and pay reflective dispatch instead of using the legacy
  varargs path that CallAst already supports).
- [`BoundMethod>>value:value:`](../src/smalltalk/Python/BoundMethod.gs)
  rewritten to resolve arity at call time. The constructor now stores
  the bare Python name (e.g. `#abs`), and dispatch builds the matching
  arity-specialized selector (`#abs:`, `#abs:_:`, …) before forwarding.
  This means a single BoundMethod can dispatch to any arity, and
  `f = abs; f(-5)` works regardless of how many arguments the original
  function expects.
- [`builtins.gs`](../src/smalltalk/Python/builtins.gs) — converted **24
  builtins** from block-in-a-slot installation to real env-1 methods:
  - **1-arg:** `abs`, `len`, `type`, `repr`, `str`, `hash`, `hex`, `oct`,
    `bin`, `chr`, `ord`, `id`, `dir`, `callable`, `round`, `sum`,
    `sorted`, `reversed`, `all`, `any`, `max`, `min`, `enumerate`
  - **2-arg:** `pow`, `divmod`, `isinstance`

  Each conversion replaces the unused legacy `name: aBlock` setter with
  a real method `name: aTypedArg` (or `name: arg1 _: arg2` for 2-arg).
  The corresponding `initialize_XXX` methods still install delegating
  closures under the legacy `#name` keys so any code path that reads
  these names through the SymbolDictionary still works (notably, the
  legacy varargs CallAst form for non-fast-path calls). The closures
  forward to the new methods via `self name: …`.
- Builtins that *cannot* easily become fixed-arity remain as legacy
  blocks: `print` (varargs), `pow` 3-arg form (`powWithMod`), `round`
  with `ndigits` (kwarg), `zip` (varargs of iterables), `__import__`
  (5-positional plus keywords), `quit` (no args), `input`/`inputWithPrompt`
  (these have a 0-arg vs 1-arg overload split). These will be revisited
  when the varargs selector convention (`_name:kw:`) lands in a future
  phase.

**Test status.** Full suite green: **1428 main + 54 embedded CPython
tests, 0 failures, 0 errors.** Same pass count as the end of Phase 2 —
all the new conversions are exercised by existing builtin tests.

**Bugs caught and fixed during the spike:**

1. *Reserved name collision:* `phase4SelectorForName: name arity:` used
   `name` as a parameter, which conflicted with a GemStone reserved name
   (likely `class>>name`). Renamed to `aName`.
2. *Arity-resolution in BoundMethod:* The first generalized NameAst
   emitted `(BoundMethod ... selector: #abs)` (the bare name). When
   called with 1 arg, the legacy `BoundMethod>>value:value:` did
   `perform: #abs withArguments: positional`, which sent the unary
   getter `#abs` and got back the cached delegating block. Fixed by
   moving arity resolution into BoundMethod itself: it now stores the
   bare name and builds the arity-matched selector at call time.
3. *Function-position over-eager wrapping:* The first generalized
   NameAst wrapped *every* fast-path-eligible name in a BoundMethod,
   including the function position of CallAst. So `print(1, 2, 3)`
   compiled to `(BoundMethod receiver: ... selector: #print) value: {1.
   2. 3.} value: nil` instead of the legacy `print value: ...` form,
   which is much slower. Fixed by adding `isFunctionPositionOfCall`
   to NameAst that walks `parent` and checks identity.

#### Phase 4a benchmark results

Measured by adding a temporary env-1 method on `builtins` that runs each
loop 100,000,000 times entirely from inside env 1. Numbers in
nanoseconds per iteration, baseline subtracted (3.25 ns empty loop):

| Operation              | Net ns | Notes                              |
|------------------------|-------:|------------------------------------|
| `self id: 42`          |    6.5 | trivial body (`identityHash`)      |
| `self type: 42`        |    9.6 | `__class__` send                   |
| `self pow: 2 _: 3`     |   14.6 | `__pow__:` send, 2-keyword         |
| `self abs: 3`          |   44.7 | `___on___:do:` exception wrapper   |
| `self divmod: 10 _: 3` |   62.9 | tuple allocation                   |

The trivial-body builtins (`id`, `type`) are now in the **6–10 ns
range** — within striking distance of the "near native Smalltalk" 8 ns
target the design doc set. The exception-handler wrapper used by
`abs`/`hash`/`len`/`str` is the dominant cost when present (~30 ns
overhead vs the bare body), and the tuple-returning `divmod` pays the
allocation cost. None of these are dispatch costs — they are body
costs. The dispatch component is now within ~3 ns of the theoretical
floor.

Compared to the equivalent Phase-2 baseline (`self abs: 3` at 48 ns vs
the legacy `absBlock value: { 3 } value: nil` at 65 ns), the trivial
builtins show the most dramatic improvement: **`id` is now ~6 ns vs the
legacy ~65 ns — roughly 10x faster.**

#### What Phase 4a did not do (now in Phase 4b/4c)

- **Convert the remaining varargs builtins.** `print`, `zip`,
  `__import__`, `pow` 3-arg, `round` with `ndigits`, `input` 0/1-arg,
  `quit`. Each needs a varargs selector form (`_name:kw:`) and codegen
  support for it. **Done in Phase 4b.**
- **Retire the symbol-list insertion of `builtins ___instance___`.** The
  generated codegen still emits `((builtins instance) name: x)` rather
  than `self name: x`, because module bodies still compile as
  free-floating methods without a meaningful `self`. **Deferred to
  Phase 4c.**
- **Restructure `module` as a plain `Object` subclass.** Replace the
  `SymbolDictionary` storage with explicit instance variables for module
  globals and a `_dynamic` dictionary for the dynamic-attribute fallback.
  **Deferred to Phase 4c.**
- **Remove the `___at___:` / `___at___:put:` getter/setter pairs** from
  `builtins.gs`. After Phase 4b every dispatch path uses real methods,
  but the legacy block-form storage is kept around as a back door for
  Smalltalk-side test code that does `b @env1:foo` to fetch a closure.
  **Cleanup deferred to Phase 4c.**

#### Phase 4b — Varargs selector convention and remaining builtins (completed)

Phase 4b adds the second half of the dispatch model: a varargs selector
shape `_name:kw:` for builtins that take a variable number of positional
arguments, accept keyword arguments, or have multiple supported arities.

**Codegen:**

- [`CallAst>>printSmalltalkOn:`](../src/smalltalk/PythonAst/CallAst.gs)
  now tries three forms in priority order:
  1. **Fixed-arity fast path** (`name:`, `name:_:`, `name:_:_:`, …) —
     unchanged from Phase 4a.
  2. **Varargs fast path** (`_name:kw:`) — new in Phase 4b. Used when
     no fixed-arity match exists and `builtins` has a `_name:kw:`
     method. Emits
     `((builtins instance) _name: { arg1. arg2. } kw: kwargDict)`
     with positional args packed into an Array literal and kwargs
     packed into an `IdentityKeyValueDictionary` literal.
  3. **Legacy fallback** (`name value: { args } value: kwargs`) —
     unchanged. Used when neither fast path matches.
- The 0-arg fast path was **removed**. Phase 4a treated `name()` as
  eligible if `builtins` had a unary `name` method, but the legacy
  unary getters (`builtins>>print`, `builtins>>quit`, etc.) return the
  cached block under `#name`, not the result of calling it. So
  `quit()` was returning the block, not exiting. The new convention is
  that 0-arg calls always go through varargs (`_name:kw:`) or the
  legacy form. Reading a name as a value (`f = print`) still resolves
  to a `BoundMethod`, but it's the BoundMethod that does the call, not
  the unary getter.
- [`NameAst>>isFastPathBuiltinName:`](../src/smalltalk/PythonAst/NameAst.gs)
  no longer treats the bare unary `name` selector as a fast-path
  indicator (for the same reason). It now checks `name:`, `name:_:`,
  `name:_:_:`, and `_name:kw:` — the four real method shapes.
- [`BoundMethod>>value:value:`](../src/smalltalk/Python/BoundMethod.gs)
  rewritten to dispatch in two stages: first try the arity-resolved
  fixed-arity selector; if the receiver doesn't implement it, fall
  back to `_name:kw:`. This means a single BoundMethod handles both
  `f = abs; f(-5)` (fixed-arity) and `f = print; f(1, 2, 3)`
  (varargs) without any compile-time hint.

**Builtin conversions:**

Seven new methods on `builtins`:

| Selector              | Replaces                       | Notes                              |
|-----------------------|--------------------------------|------------------------------------|
| `_print:kw:`          | `initialize_print` block       | varargs of objects to write        |
| `_zip:kw:`            | `initialize_zip` block         | reimplements with Python semantics |
| `_pow:kw:`            | `initialize_powWithMod` block  | handles 2-arg and 3-arg cases      |
| `_round:kw:`          | `initialize_roundWithDigits`   | 2-arg or `ndigits=` kwarg          |
| `_input:kw:`          | `initialize_inputWithPrompt`   | 0-arg or 1-arg-with-prompt         |
| `_quit:kw:`           | `initialize_quit` block        | exits cleanly                      |
| `___import__:kw:`     | `initialize___import__` block  | underscore-prefixed Python name    |

The Smalltalk-internal helper *names* `powWithMod`, `inputWithPrompt`,
and `roundWithDigits` were removed entirely — they were artifacts of
the legacy split where one Python name became two Smalltalk slots, and
they have no Python equivalent. The functionality is preserved in the
unified `_pow:kw:` / `_input:kw:` / `_round:kw:` methods.

**`__import__` selector encoding.** The Python name `__import__` has
two leading and two trailing underscores. The Phase 4 varargs rule
prepends one underscore and appends `:kw:`, giving the Smalltalk
selector `___import__:kw:` — three leading underscores, two trailing
before `:kw:`. Documented in the method comment so a future reader
doesn't try to "fix" it.

**New Python-source tests:**

- `testEvalPow3Arg` — `pow(2, 3, 5)`, `pow(10, 2, 7)`, `pow(2, 3)`.
  Exercises both the `_pow:kw:` varargs path (3-arg) and the
  `pow:_:` fixed-arity path (2-arg) from one test.
- `testEvalRound2Arg` — `round(3.14159, 2)`, `round(3.14159, 0)`,
  `round(3.7)`. Mixes the varargs path (2-arg) and the
  `round:` fixed-arity path (1-arg).
- `testEvalPrint` — `print(1, 2, 3)`, `print()`, `print("hello")`.
  Exercises the varargs path with multiple positional arities.
- `testPrintAsValue` — `f = print; f(1, 2, 3)`. Exercises BoundMethod's
  fixed-arity → varargs fallback for indirect calls.
- `testPow3ArgAsValue` — `f = pow; f(2, 3, 5)`. Same fallback path,
  hitting `_pow:kw:` for the 3-arg case.

**One bug fixed during the spike:**

`_round:kw:` initially used `10 @env0:** ndigits` (carried over from
the legacy block). `**` doesn't exist on SmallInteger in either env 0
or env 1 — the legacy block had the same bug, but `testRound` only
ever exercised the 1-arg path, so it never fired. Replaced with
`10 @env0:raisedTo: ndigits`. The new `testEvalRound2Arg` test
(written before the fix) caught it on the first run.

**Test status:** **1433 main + 54 embedded CPython tests, 0 failures,
0 errors.** The +5 over Phase 4a matches the five new
`testEval*`/`*AsValue` tests.

#### Phase 4b benchmark results

Same env-1 microbenchmark setup as Phase 4a, baseline subtracted
(3.28 ns empty loop), 100 million iterations:

| Operation                                | Net ns | Notes                                |
|------------------------------------------|-------:|--------------------------------------|
| `self pow: 2 _: 3` (fixed-arity)         |   14.2 | Phase 4a path, 2-arg case            |
| `self _pow: #(2 3 5) kw: nil` (varargs)  |   71.6 | Phase 4b varargs path, 3-arg case    |
| `self _round: #(3.14159 2) kw: nil`      |   85.3 | Phase 4b varargs, 2-arg + raisedTo   |

**Varargs costs ~5x more than fixed-arity on the same body shape.**
That matches the Phase-0 design predictions: array packing is the
dominant per-call overhead, and the varargs form pays it on every call
plus the inside-the-method extraction. The fixed-arity form avoids
both. This is the reason Phase 4 emits the fixed-arity form whenever
possible and only falls back to varargs for genuinely variable-arity
builtins.

The varargs path is still **roughly 1.5x faster than the legacy block
form** (~110 ns dispatch + body overall) measured in Phase 2, because
even varargs avoids the symbol-list walk and the extra `value:value:`
send through a block. The savings are smaller in absolute terms than
fixed-arity vs legacy, but still meaningful.

#### Phase 4b benchmark caveats

- Only the *dispatch* component is measured. Body cost is held
  constant by using the same `__pow__`/`raisedTo` operations.
- The Phase-0 microbenchmarks predicted ~7.5 ns for the varargs tax
  on a trivial body. The 71-85 ns numbers above include real
  bodies (3-arg `pow` with two `__pow__`/`__mod__` calls; 2-arg
  `round` with a `raisedTo:` plus three more sends), so they are not
  directly comparable to the Phase-0 prediction.
- Performance numbers should be re-measured after Phase 4c structural
  changes land.

#### Phase 4c — Structural cleanup (mostly completed)

Phase 4c retires the legacy infrastructure that supported the old
block-in-a-SymbolDictionary dispatch model. After Phases 4a and 4b
moved every Python builtin into a real env-1 method, the old infra
was dead code held alive only by a small number of compile pipeline
hacks and test patterns. Phase 4c removes them.

**Step A — Remove the symbol-list insertion of `builtins ___instance___`.**
Three call sites:

- [`ModuleAst class >> symbolListForModuleScope:`](../src/smalltalk/PythonAst/ModuleAst.gs)
  no longer inserts the builtins singleton at position 2 of the
  symbol list. The remaining inserts are the per-module scope (for
  user-declared globals) and the system Python dict (for class
  lookups like Exception, None, etc.).
- [`PythonTestCase >> eval:`](../src/smalltalk/PythonTests/PythonTestCase.gs)
  similarly stops inserting builtins.
- [`importlib loadModuleFromPath:`](../src/smalltalk/Python/importlib.gs)
  had two related issues. First, the older code did *two* execution
  passes: an `executeWithScope:` with no module instance (which had
  `builtins` in the symbol list), then a second `evaluateWithScope:`
  with the module instance. The first pass was vestigial — its
  results were discarded — so it was deleted entirely. Second,
  `importlib runPath:` built its symbol list with
  `SymbolList with: (builtins instance) with: Python`; the builtins
  entry is gone, leaving just `Python`.
- The Python `import` statement codegen had the same dependency.
  [`ImportAst`](../src/smalltalk/PythonAst/ImportAst.gs) and
  [`ImportFromAst`](../src/smalltalk/PythonAst/ImportFromAst.gs)
  previously emitted `__import__ value: { 'name' } value: nil`,
  which depended on the symbol list resolving the bare
  `__import__` name. They now emit
  `(builtins instance) ___import__: { 'name' } kw: nil` directly.

**Step B — Restructure `module` as plain `Object` (deferred).**
First attempted in Phase 1, deferred to Phase 4c, then deferred again
to Phase 5. The block: `importlib loadModuleFromPath:` uses the
runtime moduleInstance as its compile-time variable scope, which
requires the instance to be SymbolDictionary-shaped. Decoupling
those concerns is the work of Phase 5 (`def`-as-method, module-as-
class with declared instance variables). At that point the runtime
instance becomes a class instance with explicit slots, and the
compile-time variable scope can become a separate temporary
SymbolDictionary or be eliminated entirely. `module` remains a
SymbolDictionary subclass for now, but now only as a storage layer
for *user-defined module globals* — no builtins or codegen depends
on it anymore.

**Step C — Convert legacy block-fetch tests.** 30 tests in
[`BuiltinsTestCase`](../src/smalltalk/PythonTests/BuiltinsTestCase.gs)
and 2 tests in
[`ImportlibTestCase`](../src/smalltalk/PythonTests/ImportlibTestCase.gs)
fetched a builtin via `b @env1:foo` and called it via
`value:value:` (the legacy varargs convention). Each was rewritten
to call the real method directly, e.g.:

| Old form                                          | New form                       |
|---------------------------------------------------|--------------------------------|
| `b @env1:abs. block value: { 5 } value: nil`      | `b @env1:abs: 5`               |
| `b @env1:divmod. block value: { 10. 3 } value: nil` | `b @env1:divmod: 10 _: 3`    |
| `b @env1:_pow:kw: ...` (already varargs)          | (unchanged)                    |
| `b @env1:isinstance. block value: { x. T } value: nil` | `b @env1:isinstance: x _: T` |

A few tests had to be reworked more substantially: `testCallable`
and `testQuit` previously asserted that the unary getter (`b @env1:abs`,
`b @env1:quit`) returned a callable block. With the unary getters
gone, those tests now construct a `BoundMethod` explicitly and
verify that *it* is callable. To make `callable(boundMethod)` return
True, [`BoundMethod`](../src/smalltalk/Python/BoundMethod.gs) gained
a `__call__:` instance method that forwards to `value:value:` —
matching the protocol that ExecBlock already implements and that
`builtins>>callable:` checks for.

**Step D — Remove dead `initialize_X` blocks and unary getters from
`builtins.gs`.** With Steps A and C complete, nothing reads the
SymbolDictionary slots on the builtins singleton anymore. The whole
mechanism (the `initialize` orchestration, all 31 `initialize_X`
methods that installed delegating closures, all 31 unary `name`
getters that returned `self ___at___: #name`) was deleted. The file
now contains only:

- The class definition and updated comment
- A no-op `initialize` (kept because `module>>instance` calls it)
- The 24 fixed-arity fast-path methods (Phase 4a)
- The 7 varargs `_name:kw:` methods (Phase 4b)

**File size impact.** `builtins.gs` shrank from **1404 lines to 601
lines** — a 57% reduction. Every line in the new file is a real
dispatch method; there is no longer any "compatibility layer" or
"legacy installation" code mixed in.

**Test status.** **1433 main + 54 embedded CPython tests, 0 failures,
0 errors.** Same pass count as the end of Phase 4b — no new tests
added in Phase 4c, only conversions of existing ones.

**One bug fixed during the spike:** `BoundMethod` did not implement
`__call__:`, so `callable(boundMethod)` returned False. Added a
one-line `__call__:` method that forwards to `value:value:` with
empty kwargs, matching the protocol on ExecBlock.

#### What is *not* in Phase 4c (deferred to Phase 5)

- **`module` as `Object` subclass.** Still a SymbolDictionary
  subclass. See Step B above for the rationale. Phase 5's
  module-class generation will make this trivial.
- **Other modules' block storage.** `math`, `sys`, `os`,
  `importlib`, etc. all still use the legacy `___at___:put:` block
  storage in their `initialize_X` methods. Phase 4c only converted
  `builtins`. The other modules can be migrated module-by-module
  using the same playbook (the codegen already supports the
  fast-path / varargs / legacy-fallback chain), but each conversion
  involves the same kind of test cleanup that Step C did for
  BuiltinsTestCase. **Phase 4d (below) is the start of that
  migration.**

#### Phase 4d — Attribute-call fast path and per-module migration (completed)

Phase 4d extends the dispatch model from `builtins` (which is called
via free-name references like `abs(x)`) to the rest of the built-in
modules, which are called via attribute references like
`math.sin(x)`, `html.escape(s)`, etc.

**The codegen change.** A new fifth form was added to
[`CallAst printSmalltalkOn:`](../src/smalltalk/PythonAst/CallAst.gs),
between the existing bare-name forms and the legacy fallback. When
the function is an `AttributeAst` whose value is a static `NameAst`
that resolves to a `module` subclass marked Phase-4-converted, the
codegen emits a direct keyword send to the receiver:

| Source                            | Emitted (when receiver is converted)         |
|-----------------------------------|----------------------------------------------|
| `gemstone.commit()`               | `((gemstone) commit)`                        |
| `html.escape("<div>")`            | `((html) escape: (''<div>''))`              |
| `html.escape("<b>", False)`       | `((html) escape: (''<b>'') _: (false))`     |
| `gemstone.version` (no `()`)      | `(gemstone) version` *(unchanged from before)* |

**The discriminator: `usesPhase4Dispatch`.** The codegen needs a
reliable way to tell whether a given module class is "converted"
(use the fast path) or "unconverted" (fall through to the legacy
varargs form, which goes through the cached block in the
SymbolDictionary slot).

The first attempt at a discriminator was structural: "fast-path
methods exist (`escape:`) but the legacy unary getter (`escape`) is
absent." This works for ≥1-arg methods but **breaks for 0-arg
methods** like `gemstone.commit()`, where the converted method *is*
a unary `commit` selector that would be confused with the legacy
getter.

The replacement is a simple class-side marker:

- [`module class >> usesPhase4Dispatch`](../src/smalltalk/Python/module.gs)
  returns `false` by default (covers all unconverted modules:
  `math`, `os`, `sys`, the Shim modules, etc.).
- Each converted module overrides it on the class side to return
  `true`. Currently set on `builtins`, `gemstone`, and `html`.
- Lives in env 0 because it is called from `CallAst` codegen, which
  runs in env 0 alongside the parser.

**The compile-time check.** `phase4dAttributeCallSelector` builds the
candidate keyword-form selector based on the call's arity, then:

1. Looks up the receiver name in the `Python` dictionary at compile
   time (`self class phase4dResolveModuleClass: receiverName`).
2. Checks `receiverClass usesPhase4Dispatch` — if false, returns nil
   (legacy fallback).
3. Checks `(receiverClass methodDictForEnv: 1) includesKey:
   candidate` — if false, returns nil (legacy fallback, the method
   doesn't exist on this converted module).

A local variable that shadows the receiver name (e.g.
`import gemstone` binds `gemstone` as a local pointing at the
gemstone instance) does NOT disable the fast path. At runtime the
local holds the same instance the class would return. This was
worth verifying — the first version of `phase4dAttributeCallSelector`
checked `isVariableIsDeclared:` and disabled the fast path when the
import statement shadowed the receiver name, which is wrong. The
shadow check was removed.

**Modules converted in Phase 4d (so far):**

- [`gemstone.gs`](../src/smalltalk/Python/gemstone.gs) — 2 callable
  methods (`abort`, `commit`), both 0-arg. Plus the existing dunder
  methods (`__getitem__:`, `__setitem__:_:`, `__delitem__:`) and
  `version`, which were already in Phase-4 style. Removed the dead
  `initialize_abort`, `initialize_commit` blocks and the legacy
  unary getters/setters. Added the `usesPhase4Dispatch` marker.
- [`html.gs`](../src/smalltalk/Python/html.gs) — 2 callable methods
  (`escape`, `unescape`). The `escape` method has both a 1-arg form
  (`escape:`) and a 2-arg form (`escape: _:`); the 1-arg form
  delegates to the 2-arg form with `quote = true`. Plus the
  `entities` accessor which is a stored attribute (not a callable),
  populated by `initialize` because it references the
  `html_entities` submodule instance. Added the `usesPhase4Dispatch`
  marker.

**Tests:**

- All 17 existing `HtmlTestCase` tests pass through the new fast
  path. They are Python-source tests using `import html` followed by
  `html.escape(...)` / `html.unescape(...)`, so the codegen change
  was the most important thing to validate. Test status confirms
  the path works end-to-end.
- Added 2 new tests to `GemStoneTestCase`:
  `testEvalGemstoneVersion` (exercises `gemstone.version` attribute
  read from Python source) and `testEvalGemstoneSetGetItem`
  (exercises the subscript dunder methods from Python source).

**Test status:** **1438 main + 54 embedded CPython tests, 0
failures, 0 errors.** The +2 over the Phase 4c baseline of 1436
matches the two new gemstone Python-source tests.

**Bugs and gaps caught during the spike:**

1. *Reserved the wrong discriminator.* First version of the codegen
   used a structural discriminator (keyword-form present + unary
   form absent). Caught when reasoning about 0-arg `gemstone.commit`,
   before any code was committed. Replaced with the
   `usesPhase4Dispatch` class-side marker.
2. *Over-eager shadow check.* First version disabled the fast path
   when `import x` made `x` a local. Caught by `gemstone.commit()`
   compiling to the legacy form. Removed the shadow check.
3. *Test gap: `copyreg.gs` has zero tests.* No test coverage at all
   for the `copyreg` module. Logged as a high-priority backlog item
   to address before converting `copyreg` (or before relying on it
   for anything).
4. *Codegen gap: `del obj[key]` (DeleteAst with subscript target)
   has no `printSmalltalkOn:` implementation.* Discovered while
   writing a Phase 4d test for `gemstone[key] = v; del gemstone[key]`.
   The parser produces a node whose `printSmalltalkOn:` falls
   through to the abstract `AbstractNode` raise. Not in scope for
   Phase 4d; logged as a backlog item.

**Second batch — copyreg + fractions:**

After the gemstone + html spike validated the playbook, two more
modules were converted in a follow-up batch:

- [`copyreg.gs`](../src/smalltalk/Python/copyreg.gs) — 1 callable
  method (`pickle`) with both 2-arg and 3-arg forms. The 3-arg form
  (`pickle: ob _: fn _: constructor`) is what the `re` module calls;
  the constructor argument is currently ignored, matching the
  legacy behavior. Plus `dispatch_table` as a stored attribute.
  Added `usesPhase4Dispatch`.

  **This batch also addressed the test gap noted earlier:** copyreg
  had zero tests before Phase 4d. Added
  [`CopyregTestCase`](../src/smalltalk/PythonTests/CopyregTestCase.gs)
  with 6 tests covering module registration, dispatch_table
  initialization, both `pickle` arities (Smalltalk-side), and
  Python-source attribute calls (Phase 4d codegen path).

  **Confirmed: GemStone allows duplicate `_:` keywords in a
  multi-keyword selector.** The selector `pickle:_:_:` (three
  keywords, two of which are `_:`) compiles cleanly. This was an
  open question from earlier phases — the answer is now empirical:
  yes, repeated `_:` works. (The IDE diagnostics flagged it as a
  syntax error, which was a false positive; install + tests pass.)

- [`fractions.gs`](../src/smalltalk/Python/fractions.gs) — no
  callable methods, only a stored attribute (`Fraction`, which
  references the GemStone `Fraction` class). Marking
  `usesPhase4Dispatch = true` has no functional effect on this
  module today (no callable methods to dispatch), but it documents
  the conversion status and avoids confusing future readers.

**Test status after the second batch:** **1444 main + 54 embedded
CPython tests, 0 failures, 0 errors.** The +6 over the gemstone+html
baseline of 1438 matches the six new CopyregTestCase tests.

**Modules converted in Phase 4d so far (6 of ~30):**
`builtins` (Phase 4a-4c), `gemstone`, `html`, `copyreg`, `fractions`,
`_bisect`, `_crc32c`.

**Third batch — `_bisect` + `_crc32c`:**

After the first two batches, the third batch picked up two of the
CPython shim modules:

- [`ShimBisectModule.gs`](../src/smalltalk/Python/ShimBisectModule.gs)
  — 4 callable methods (`bisect_right`, `bisect_left`, `insort_right`,
  `insort_left`), all 2-arg, no kwargs. Each method delegates to
  the existing env-0 `callBisect:list:value:` /
  `callInsort:list:value:` class methods that bridge to CPythonShim.
  Added `usesPhase4Dispatch`.

- [`ShimCrc32cModule.gs`](../src/smalltalk/Python/ShimCrc32cModule.gs)
  — 2 callable methods (`crc32c` 1-arg, `extend` 2-arg). Same
  delegation pattern via env-0 bridge methods to CPythonShim.
  Added `usesPhase4Dispatch`.

**No new tests needed.** The existing
[`CPythonShimTestCase`](../src/smalltalk/PythonTests/CPythonShimTestCase.gs)
already has 6 Python-source tests for these modules
(`testEvalBisectRight`, `testEvalBisectLeft`, `testEvalInsortRight`,
`testEvalCrc32cBasic`, `testEvalCrc32cEmpty`, `testEvalCrc32cExtend`)
that use `import _bisect; _bisect.bisect_right([...], v)` and
`import _crc32c; _crc32c.crc32c(b"...")`. All 6 pass through the
new fast-path methods, proving the runtime dispatch works end-to-end
through the actual CPython shim library.

**Test status after the third batch:** **1444 main + 54 embedded
CPython tests, 0 failures, 0 errors.** No new tests added in this
batch, all 6 pre-existing shim tests pass through the converted
modules.

**Three more modules considered but deferred to backlog:**

The third batch was originally going to include `functools`, `enum`,
and `_statistics`, but each one surfaced a Phase-4d limitation that
needs separate work first:

- **`enum`** has a kwarg call from `re/__init__.py`:
  `@enum._simple_enum(enum.IntFlag, boundary=enum.KEEP)`. The Phase
  4d attribute-call fast path falls through when keyword arguments
  are present (`keywords isEmpty ifFalse: [^nil]` in
  `phase4dAttributeCallSelector`), so the legacy block storage for
  `_simple_enum` would still need to exist after conversion. Either
  the codegen needs to handle kwargs (analogous to the bare-name
  `_name:kw:` varargs form), or the conversion has to leave the
  legacy block in place for kwarg-receiving methods. Logged as a
  backlog item.

- **`functools`** has `lru_cache`, used by `re/__init__.py` as
  `@functools.lru_cache(_MAXCACHE)`. No kwargs and a clean call
  site, so the conversion is mechanically possible. But functools
  has **zero test coverage** today — same gap copyreg had before
  the second batch. Per the instruction to flag missing coverage
  before relying on a module, logged as a backlog item: add tests
  before converting (or alongside the conversion).

- **`_statistics`** is accessed via `from _statistics import
  _normal_dist_inv_cdf` followed by a bare-name call. The
  `ImportFromAst` codegen relies on the unary getter on the receiver
  module to fetch the attribute (`(_statistics_module)
  _normal_dist_inv_cdf`). After Phase 4 conversion deletes the
  unary getter, the from-import path breaks. Fixing this requires
  changing `ImportFromAst printSmalltalkOn:` to materialize a
  `BoundMethod` (or similar callable wrapper) for the imported
  name. Logged as a backlog item; the fix is straightforward but
  out of scope for this turn.

**Bugs and gaps caught (cumulative):**

1. *Wrong discriminator approach* — replaced with `usesPhase4Dispatch`
   class-side marker.
2. *Over-eager shadow check* — removed.
3. *Test gap: `copyreg.gs` had zero tests* — **addressed** by
   adding CopyregTestCase in the second batch.
4. *Codegen gap: `del obj[key]` has no `printSmalltalkOn:`* —
   logged as backlog.
5. *Codegen bug: `import builtins` shadows the `builtins` class.*
   Discovered while writing a CopyregTestCase test that did
   `import builtins; copyreg.pickle(int, str)`. After the import,
   the local variable `builtins` holds the module instance, not
   the class, so `(builtins instance) ___import__: ...` (which
   the codegen for `import` statements emits) and any other
   hardcoded `(builtins instance)` reference in NameAst's
   BoundMethod constructor breaks. Worked around in the test
   (removed the unnecessary `import builtins`); logged as a
   backlog item — the fix is to either rename the BoundMethod
   constructor's receiver expression to an unshadowed reference
   (e.g. via `Python at: #builtins`) or to forbid shadowing
   `builtins` at parse time.

**Phase 4d completion.** All 23 module subclasses were converted:
`builtins`, `gemstone`, `html`, `copyreg`, `fractions`, `math`, `sys`,
`os`, `os_path`, `cmath`, `random`, `statistics`, `string`, `numbers`,
`enum`, `functools`, `importlib`, `html_entities`, `_bisect`, `_crc32c`,
`_sre`, `_shimtest`, `_statistics`. The three outstanding backlog items
from the earlier batches (kwarg attribute calls, `import builtins`
class shadow, from-import via unary getter) were all closed in commit
`23a70b0`. Remaining 2-arg block accessors were converted to arity-
specialized methods in commit `49a4938`. Phase 4d ships in commit
`1af478e`. The `usesPhase4Dispatch` class-side marker was later deleted
(along with the `ifFalse: [^nil]` guards in `CallAst` and
`ImportFromAst`) once it was redundant — every module subclass was
converted, so the opt-out could never fire.

Later codegen work extended the attribute-call path to handle chained
receivers (`obj.field.method()`) via a direct-send fallback in
`CallAst>>printSmalltalkOn:`. The legacy block form is now reserved
for first-class function calls through a local (`f = foo; f(x)`) —
which is the only case where it is still correct.

### Phase 5 — User `def` and Python classes (completed)

Split into three landed sub-phases:

- **Phase 5a — user Python modules compile to real Smalltalk classes**
  (commit `4759f48`). Each user module is now a `module` subclass, same
  shape as the built-in modules.
- **Phase 5b — module-level `def` compiles to real Smalltalk methods**
  (commit `1671b8c`). Arity-specialized selector where possible, else
  the `_name:kw:` varargs form. Nested `def` stays as a block (per
  Limitations).
- **Phase 5c — Python class bodies compile to real Smalltalk classes**
  (commit `ad729e4`). A Smalltalk class with methods and instance
  variables mirroring the Python class.

### Phase 6 — Other modules (subsumed)

The original Phase 6 targeted remaining `value: positional value:
keywords` call sites in `statistics.gs` and `importlib.gs`. Both modules
were converted in Phase 4d. The only remaining `value:value:` site is
`PythonClass>>value:value:`, which is the class instantiation protocol
(not dispatch) and stays as-is.

### Phase A / Phase B — Storage refactor (completed)

After the dispatch rewrite landed, the storage model was still split:
module globals lived in the SymbolDictionary slot inherited from
`module`, and instance attributes lived in pre-declared classInstVars
auto-generated by `ClassDefAst` (one slot per name seen at parse time).
Both stores were "near" but not actually GemStone's idiomatic
dynamic-attribute primitive.

- **Phase A** (commit `760f779`) — Module globals migrated to
  `self dynamicInstVarAt: #name put: v` on the module instance.  The
  SymbolDictionary slot remains for built-in modules' dunder metadata
  (`__name__`, `__doc__`, etc.) only.
- **Phase B** (commit `3ac3cd0`) — Instance attributes migrated to
  the same primitive on instance receivers.  `self.attr = v` inside a
  method now emits `self @env0:dynamicInstVarAt: #attr put: v` directly,
  bypassing any setter method discriminator.
- **Phase B+1 sweep** — Built-in value-type wrappers (`complex`,
  `slice`, `NamedIntConstant`, `PyStruct`, `Hash`, `ipaddress`,
  `io_module`, `datetime_module`) converted from pre-declared
  instVars to dynamic.

Convention: per project memory `[[nil_as_absent]]`, the Smalltalk `nil`
is never a valid Python value.  An unset slot reads as nil; `del`
removes the slot via `removeDynamicInstVar:`; `Python None` is the
distinct singleton.

### Attribute Protocol (AP-1 through AP-7)

A coherent arc that finishes Python's data model on top of Phase A/B's
storage.  Each piece has a dedicated TestCase pinning the semantics —
see the Status table above for commit hashes.

#### AP-1: Function rebinding (`FunctionRebindingTestCase`)

Module-level `def foo(): ...` followed by `foo = 21` must rebind such
that `foo(5)` raises `TypeError("'int' object is not callable")` rather
than calling the original.  See the revised "Monkey-patching" note in
Known Limitations for the probe-then-branch shape that achieves this.

Top-level defs are NO LONGER pre-stored as `BoundMethod`s at module
init.  The slot stays nil until an explicit rebind writes to it;
reading a top-level def name through `module>>doesNotUnderstand:` or
`___moduleAttrLoad___:` lazy-wraps the class method on demand.

#### AP-2: Attribute store bypasses class methods (`AttributeStoreTestCase`)

`obj.foo = 42` writes straight to the instance dict regardless of
whether the class has a `foo:` method (a regular method is NOT a data
descriptor — it must not intercept the store).  Same invariant for
`setattr(obj, 'foo', 42)`.

For class receivers (`C.attr = v`), the helper falls back to the env-1
class-side setter if one exists (preserving body-declared classInstVars
and `@property` pairs); see AP-6 for the brand-new-attr fallback.

#### AP-3: `del` / `delattr` symmetry (`AttributeAccessTestCase`)

`del obj.attr` and `delattr(obj, 'attr')` route through
`object>>__delattr__:` → `___pyAttrDelete___:` which raises
AttributeError on miss (matching CPython) and removes the slot via
`removeDynamicInstVar:` otherwise.  Added the missing `delattr`
builtin.  `setattr` / `delattr` both return `None` per the CPython
contract.

#### AP-4: User-overridable protocol (`AttributeProtocolTestCase`)

The codegen routes through the Python protocol methods, not the
low-level helpers directly:

| Operation         | Codegen emits                                | Default falls through to |
|-------------------|----------------------------------------------|---------------------------|
| `obj.x = v`       | `obj @env1:__setattr__: 'x' _: v`            | `___pyAttrStore___:put:`  |
| `del obj.x`       | `obj @env1:__delattr__: 'x'`                 | `___pyAttrDelete___:`     |
| `obj.x` (load)    | `obj @env1:___pyAttrLoad___: #x`             | on miss → `__getattr__:`  |

User classes override `__setattr__:_:` / `__delattr__:` / `__getattr__:`
on the class to intercept.  The default `object>>` methods do the
direct dict store/delete; the read path's `___pyAttrLoad___` calls
`__getattr__:` as a FALLBACK only when normal lookup misses.

The codegen passes the attribute name as a Python **`str`** (Smalltalk
String), not a Symbol — user override checks like `name == 'fahrenheit'`
are str-vs-str in Python; `Symbol __eq__ String` returns `false` and
would silently bypass every name-keyed branch.  Pinned by
`testFahrenheitOverwriteUpdatesCelsius`.

#### AP-5: `@property` descriptors (`AttributePropertyTestCase`)

`object>>__setattr__:_:` checks for a paired unary getter + 1-arg
setter on the class chain — Grail's data-descriptor signature, matching
the existing `___pyAttrLoad___` recognition.  When matched, dispatch
to the setter via `perform: setterSym env: 1` so the property's setter
runs and stores wherever it likes (typically a `_underscore_prefixed`
backing slot).

`ClassDefAst` was also fixed to stop the read-only stub from clobbering
explicit `@<name>.setter` methods — pre-fix, both compiled to the same
`name:` selector and the stub overwrote the user's setter.

#### AP-6: Class-side dynamic attrs (`ClassAttributeTestCase`)

GemStone classes do not support `dynamicInstVarAt:put:` directly.  Each
generated Python class now gets a class instVar **`dynInstVars`**
holding an `Object new` whose own dynamic instVars provide the dict
storage for class-level Python attributes.  Initialized at class-build
time; auto-generated `dynInstVars` / `dynInstVars:` class-side
accessors give the polymorphic helpers read/write access.

This closes `C.brand_new_attr = 42` for any class — previously it MNU'd
because no pre-declared classInstVar matched.

#### AP-7: Class-chain walk on load (`AttributeInheritanceTestCase`)

The dynInstVars storage is per-class but Python attribute lookup walks
the class chain.  `___pyAttrLoad___` now walks `self`-or-`self class` →
superClass → ..., probing each level's `dynInstVars dict`.  First hit
wins, so subclass overrides shadow without mutating the parent and
instance shadows hide class attrs until `del` reveals them again.

## Follow-ups (completed)

### End-to-end benchmark refresh

The ProfClass microbenchmark (Benchmark Measurements table above) confirms
the dispatch floor is ~8 ns per method send — unchanged from pre-rewrite.
A component breakdown of the full Python `abs(-5)` path shows:

| Component                              | ns/call |
|----------------------------------------|--------:|
| `Python @env0:at: #builtins`           |    31.9 |
| `builtins instance` (class method)     |    19.7 |
| **Total receiver resolution**          |  **51.6** |
| `perform: #abs: env: 1 withArguments:` |    62.5 |
| ProfClass `abs1: 3` (direct send)      |    11.0 |

The dispatch rewrite achieved its goal: the method send itself is ~8 ns
(ProfClass confirms). End-to-end Python calls are dominated by receiver
resolution (`((Python @env0:at: #builtins) instance)` = ~52 ns), not
dispatch. Receiver caching is a future optimization outside the scope
of this rewrite.

### BoundMethod forwarder arity (resolved)

Profiling showed `BoundMethod>>value:value:` was spending ~230 ns per
call building selectors dynamically (`WriteStream` + `asSymbol`) and
~180 ns checking the method dict. Precomputing selectors for arities
0–3 at construction time cut BoundMethod dispatch from 592 ns to 297 ns
(2x). The 0–3 range covers virtually all Python function arities; calls
with 4+ positional args fall through to the `_name:kw:` varargs path.

The remaining ~180 ns is the `_receiverHasSelector:` method-dict check,
which is necessary to distinguish fixed-arity methods (`abs:`) from
varargs-only methods (`_print:kw:`). First-class function calls are
the uncommon path (direct calls bypass BoundMethod entirely), so this
cost is acceptable.

## Open Questions

- **Characters in selectors.** Confirmed: GemStone does not allow `@` in
  selectors. `_:` and `_<name>:kw:` are both legal and are the chosen
  shape. Re-check if GemStone ever changes its lexer rules.
- **Reflective dispatch on CompiledMethod.** Future GemStone releases may
  allow `aCompiledMethod value: ...` directly, removing the need for the
  BoundMethod wrapper. If that ships, collapse `BoundMethod` into a direct
  CompiledMethod handle.
- **Receiver caching.** The `((Python @env0:at: #builtins) instance)`
  chain at every call site costs ~52 ns. A compile-time constant or
  once-per-method cache would eliminate this. Not attempted yet because
  it is orthogonal to the dispatch model; it applies equally to the old
  block-based and new method-based codegen.
- **`__getattribute__`.** Grail supports `__getattr__` as a load-miss
  fallback but not `__getattribute__` (the always-called variant).
  Adding it would route every `obj.x` read through user code on classes
  that override it, at a non-trivial dispatch cost.  Wait for a real
  use case before implementing.
- **General descriptor protocol.** AP-5 honors `@property` (the
  paired-getter+setter signature) but not arbitrary user-defined
  descriptors with `__get__` / `__set__` / `__delete__` methods.
  CPython's data-descriptor precedence rule would generalize the
  existing check; the heavy lifting is detecting "object whose class
  defines `__set__`" at the right point in `___pyAttrLoad___` /
  `__setattr__`.
- **MRO walk.** AP-7's class-chain walk uses GemStone's `superClass`
  pointer, which is single-inheritance.  Python's C3 linearization
  for multiple inheritance is not yet implemented; classes with
  diamond hierarchies will see inconsistent attribute lookup.  The
  Super proxy has the same limitation (see `Super.gs` comment).
- **Monkey-patching `builtins`.** The `builtins.abs = my_abs` pattern
  still bypasses fast-path call sites (which optimistically emit
  direct `abs:` sends).  Extending the probe-then-branch shape to
  builtins-class calls would close the gap at some dispatch cost.
