# Python's LEGB hierarchy in Grail

Python resolves names through the LEGB hierarchy — Local, Enclosing, Global,
Built-in. Grail maps each tier to natural Smalltalk where possible, for
performance and for readable generated code. This document records the
*implemented* decisions (the original open questions are kept at the end for
history). The precise-binding rework landed in b8d85e9 ("Implement Python
LEGB scoping across all name-resolution points"); the dispatch model is
docs/Rewrite_Dispatch_Model.md.

## The semantic gaps we had to bridge

* Python functions exist outside classes; Smalltalk methods don't.
* Python has variables and functions in ONE namespace: `f = abs` stores a
  callable in a variable; `f(-5)` calls whatever a name holds. Smalltalk
  separates instVars from methods.
* Python has nested functions (closures) and comprehension scopes.
* A local/global may *shadow* a builtin (`len = 3` is legal).

## L — Local: Smalltalk temps and parameters (natural mapping)

Function locals and parameters compile to Smalltalk method/block temps.
Decisions that make this precise:

* **The Python-local set is `parameters + writes`** — computed by the parser
  per scope, with `global`/`nonlocal` declarations stripped. The old
  over-approximation (every name needing a Smalltalk temp, including
  comprehension targets and f-string hints) caused false shadowing; b8d85e9
  made the binding data exact.
* **Comprehension targets are comprehension-scoped** (Python 3): `[x for x
  in xs]` does not create a function-local `x`. They still get Smalltalk
  temps, but are excluded from LEGB shadow decisions
  (`___isEnclosingComprehensionTarget___:` handles nested tuple/starred
  patterns).
* **Unbound reads raise `UnboundLocalError`** — load-context reads of a
  declared-but-not-yet-assigned local emit a runtime check (Smalltalk nil ≡
  unbound; Python None is the None singleton, so nil is unambiguous).
* **Reserved-name transport rename**: a Python parameter named `self`,
  `super`, `nil`, `true`, `false`, or `thisContext` is renamed to `_<name>`
  in the generated method signature, and body references emit the transport
  form. (TRAP from the descriptor round: only the RESERVED names get the
  prefix — a blanket `_` rename of rebound receiver params broke Flask.)

## E — Enclosing: Smalltalk closures, plus a cell for classes

* **Nested `def`s compile to Smalltalk closures (ExecBlocks)** that capture
  enclosing temps natively — Smalltalk block semantics carry Python's
  enclosing-scope reads for free. The closure's `__name__` is stamped from
  the def's lexical name.
* **`nonlocal` / write-back** rides the same block-capture mechanics.
* **Method-local classes** (`class C:` inside a def) can't be Smalltalk
  closures — class methods compile separately. Enclosing locals referenced
  from such a class body are captured **by value** at class-definition time
  via `___classCell___` (the closure-cells round, 5b75fbb…df71f25). CPython
  closes over the *cell* (later mutation visible); Grail freezes the value —
  a documented divergence, fine for the dominant "capture a constant/helper"
  idiom.
* **`global x` inside a nested def** stores to the module binding even when
  an enclosing function has a same-named local (b8d85e9 fix; the emitters
  pick their receiver via `___moduleStoreReceiverExpr___`).

## G — Global: one Smalltalk class per module; globals are DYNAMIC instVars

The original idea ("have a class for each module and have the globals be
instance variables") survived with one important amendment — the instVars
are **dynamic**, not statically declared:

* `importlib loadModuleFromPath:` creates `module subclass: <PyName>
  instVarNames: #() … inDictionary: PythonModules` and a singleton instance.
  Re-import/reload re-parents the SAME class, preserving instance identity.
* **Module globals live in `dynamicInstVarAt:` storage on the singleton**
  ("Phase A"). Static instVar slots were rejected because Python modules are
  dict-shaped: `setattr`/`getattr`/`hasattr`/`del` must all reach one
  backing store, and `del x` must truly REMOVE the binding (a nilled static
  slot can't distinguish "deleted" from "assigned None" — see the
  nil-≡-absent convention). A pleasant consequence: GemStone keeps dynamic
  instVars in declaration order, so module/instance `__dict__` iteration is
  insertion-ordered for free (see docs/Ordered_Dict.md).
* **Codegen routing**: the parser hands `CallAst moduleVariableNames:` the
  module-scope name set; `NameAst`/`AssignAst`/`DeleteAst` emit
  `dynamicInstVarAt:`(`put:`) probes for those names, Smalltalk temps for
  locals. Inside any module-level def, Smalltalk `self` IS the module
  instance.
* **Top-level `def`s become real env-1 methods on the module class** (with
  pre-registered stubs so inter-function calls resolve during codegen).
  Direct calls `add(1, 2)` rewrite to self-sends `self add:_:`; first-class
  references (`f = add`) read a BoundMethod handle stored in the same
  dynamic-instVar namespace — this is how the "one namespace for variables
  and functions" gap is bridged.
* **`globals()` / module-scope `locals()` / 0-arg `vars()`** are
  compile-time rewrites to `self` (bare-name 0-arg call shape only).
* **Function-vs-module-shadow guards** (b8d85e9): a method local, parameter,
  or comprehension target that collides with a module-level function name
  resolves to the local (`indent = self.initial_indent` in textwrap; Django
  Signal.connect's `receiver` param), and a module's own `def compile`
  shadows the builtin module-wide (re.py).

## B — Built-in: real methods on the `builtins` class + call-site rewriting

The superclass idea from the original notes (make `builtins` a superclass of
every module) was **rejected** — it couldn't let a local or global shadow a
builtin, and it isn't Python's model. What's implemented instead
(docs/Rewrite_Dispatch_Model.md):

* Builtins are **real env-1 methods on the `builtins` class** (`abs:`,
  `len:`, `_print:kw:`, …), a `module` subclass singleton.
* **Direct call sites** (`abs(5)`) are rewritten by `CallAst` to sends on
  `(Python at: #builtins) instance` — the fast path.
* **First-class references** (`f = abs`) emit a BoundMethod wrapper at the
  name read, so `f(-5)` works through the same reflective call protocol.
* **Shadowing works tier by tier**: the fast path applies only when the name
  is not shadowed by a local in any enclosing scope, a module global, a
  module def, or a class-body attribute (the tiered
  `___localBindingShadows___:` / `___pythonBindingShadows___:` guards).
  `[len for len in xs]` then `len(s)` works; `len = 3` hides the builtin.

## Why `module` subclasses SymbolDictionary — and whether it still should

`module` is a `SymbolDictionary` subclass. That choice predates Phase A, and
its role has narrowed. It is still load-bearing in three places:

1. **Built-in module singletons store DATA attributes as dictionary
   entries** — `math.gs` does `self at: #pi put: Float pi`; `copyreg.gs`
   stores `dispatch_table` the same way. Every hand-written module under
   `src/smalltalk/Python/*.gs` uses this store (user modules do NOT — their
   globals are dynamic instVars).
2. **The eval/exec compile path uses GemStone symbol-list resolution**:
   `builtins _exec/_eval` and `PythonTestCase>>eval:` build a fresh
   `SymbolDictionary` module scope, insert it at position 1 of a copy of the
   session symbol list, and compile against it — bare names resolve through
   the symbol list at compile time, which requires Symbol-keyed
   dictionary-shaped scopes.
3. **Dict-protocol reachability**: `SymbolDictionary` is-a
   `KeyValueDictionary`, so the Python dict protocol compiled onto
   `dict`/KVD (and `isinstance(x, dict)`) reaches module instances — this is
   what makes `globals()`-returns-`self` even plausible.

**Could `module` subclass something else (e.g. Object)?** Yes, if three
migrations happened: built-in singletons move their data attributes to
dynamic instVars (mechanical, but touches every hand-written module file);
eval/exec keeps building plain SymbolDictionary scopes (it doesn't actually
need `module` for this today); and `globals()` returns a live view object
instead of the raw instance. The payoff would be eliminating the dual-store
confusion below; the cost is a sweeping edit. **Decision for now: keep the
SymbolDictionary superclass, fix the dual-store seam at the `globals()`
boundary** (a live view, like `PyInstanceDict`, unioning the dynamic-instVar
globals with any dict-slot entries).

### Known seam: `globals()` on a user module (open defect)

Because user-module globals live in dynamic instVars while the inherited
dictionary slot is (for user modules) empty, the raw `self` that `globals()`
returns is incoherent as a Python dict: `g['name']` probes the DICT SLOT and
raises KeyError for a real global; `g['new'] = v` writes the dict slot where
codegen never looks; `g.keys()` resolves to the kernel Smalltalk `keys`
(returns a collection → "'OrderedCollection' object is not callable");
membership/iteration see the empty slot. `exec`/`eval` sidestep this by
seeding real SymbolDictionary scopes and reflecting bindings back. The fix
(planned) is a `PyInstanceDict`-style live view over the module's
dynamic-instVar namespace.

---

## Appendix: the original design notes (2025, pre-implementation)

Kept for history — the questions that drove the design:

* Python has both functions (not part of a class) and methods (part of a
  class).
* Python has variables and methods in the same namespace, and adding `()` to
  a variable reference "calls" the function stored in the variable.
* Python has nested functions.
* "Local" names map easily to Smalltalk parameters and locals.
* "Enclosing" names are more complex because Smalltalk doesn't have nested
  functions — resolved via block closures + `___classCell___`.
* "Global" names: a class for each module with globals as instance
  variables — implemented, amended to *dynamic* instVars.
* "Built-in" names: the builtins-as-superclass idea was considered and
  rejected (couldn't support shadowing); pool-dictionary/class-variable
  ideas likewise — replaced by call-site rewriting + BoundMethod reads with
  tiered shadow guards.
