# Pickling a builtin type fails — root cause + fix direction

Status: **the pickle symptom is FIXED on branch `feature/cpython-pickle-protocol`
(not yet merged); the `builtins` namespace work below is still open and still
worth doing, but is no longer blocked on / blocking pickle.** See
"Update from the pickle-protocol branch" at the end — read that first if you are
picking this up, because it changes what is left to do and removes the merge-gate
deadline.

## Symptom

`test.test_slice` → `SliceTest.test_pickle` errors. It pickles
`slice(10, 20, 3)` and round-trips it. Two failure stages:

1. `PicklingError: Can't pickle <slice class object>: no __module__`
2. After giving the type a `__module__`:
   `PicklingError: Can't pickle <slice class object>: not found in module 'builtins'`

This is **not slice-specific** — it is general to pickling *any* builtin type
(the type is pickled as a global reference).

## Root cause

Pickling a slice reduces to `(slice_type, (10, 20, 3))`, so pickle must
serialize the **slice type** as a global. The vendored pure-Python pickle's
`_find_global(obj)` at `src/python/stdlib/pickle.py:101` needs two things from
the type object:

- `getattr(obj, "__module__")` must be a `str` (lines 105-107) — else
  "no __module__".
- `getattr(sys.modules[modname], obj.__qualname__) is obj` (lines 116-131) —
  else "not found in module".

Both fail in Grail:

1. **Builtin type objects don't answer `__module__`.** `slice.__module__`,
   `int.__module__`, `list.__module__` all raise
   `env-1 #'__module__' not understood`. CPython: every builtin type has
   `__module__ == 'builtins'`. There is an `object class>>__name__` /
   `__qualname__` (`Object.gs` ~525/552, via `___pythonBuiltinTypeName___`
   ~491) but **no `object class>>__module__`**.
2. **The `builtins` module doesn't expose builtin type classes by name.**
   `builtins.slice`, `builtins.int`, `builtins.list` all raise
   `AttributeError: module has no attribute`. CPython's `builtins` contains
   every builtin type.

## How Grail is laid out (relevant for the fix)

- **Builtin type classes live in the `Python` SymbolDictionary**, not in the
  `builtins` module: `Python at: #slice` is the slice class (`slice.gs:9`,
  `inDictionary: Python`); `Python at: #int` → `Integer`, `#list` →
  `OrderedCollection`, etc., mapped in `install.gs` Step 3 (~lines 850-871).
  `type(a_slice) is (Python at: #slice)` holds.
- **Builtin functions** (`len`, `abs`, …) are methods on the `builtins` class
  (`builtins.gs`) and resolve as `BoundMethod`s — that path already works.
- **Module attribute resolution** goes through `object>>___pyAttrLoad___:`
  (`Object.gs` ~1464); its module branch checks methods → `___respondsTo___`
  → dynamic-instVar (`self at:`) → then raises "module has no attribute"
  (~1626). It never consults the `Python` dict for type names.
- **User classes already have `__module__`**: `ClassDefAst` emits a class-side
  `__module__` accessor on every compiled class (`ClassDefAst.gs:356-366,
  924-928`), so a fix at `object class` level only affects builtin types.

## Fix direction (agreed: eager, no indirection)

1. Add `object class>>__module__` → `'builtins'` (fallback for builtin types;
   user classes override via their emitted accessor).
2. **Eagerly populate the `builtins` module's namespace** with the actual
   CPython builtins — types + exception hierarchy + constants — so
   `builtins.slice` / `builtins.int` / etc. exist *and* appear in
   `dir(builtins)` / `vars(builtins)`. Eager population is preferred over a
   lazy getattr fallback into the `Python` dict.

## Two gotchas to plan for

- **Do not just expose the whole `Python` dict.** It also contains
  Grail-internal classes (`PyCode`, `PyDict`, `PythonReturn`, `PythonBreak`,
  `PythonContinue`, `PythonClass`) that are **not** CPython builtins. Populate
  a **curated CPython builtins set**, or those leak as `builtins.PyCode` etc.
- **Making `builtins.int` resolvable at all causes a net +1 regression in
  `test.test_functools` on the CPython scoreboard** — because once
  `builtins.int` resolves, `get_type_hints()` starts resolving annotations it
  previously left as strings (e.g. `{'x': 'int'}` → `{'x': <int>}`). This is
  *inherent to `builtins.int` existing* (lazy or eager), so it must be
  characterized: genuine break vs. a more-correct result that warrants
  re-baselining the scoreboard. It will trip
  `./scripts/check_cpython_regressions.sh` (the merge gate) until resolved.

## Verify

```
./scripts/run_cpython_suite.sh test.test_slice   # details in out/cpython/test.test_slice.out (GRAIL_DETAIL| lines)
./scripts/check_cpython_regressions.sh            # merge gate vs committed scoreboard
```

Note: a single-module suite run rewrites `docs/CPython_Suite_Scoreboard.md`;
restore it with `git checkout docs/CPython_Suite_Scoreboard.md`.

## Coordination / file-conflict surface

The builtins/pickle work will touch: **`Object.gs`** (`object class>>__module__`,
possibly `___pyAttrLoad___:`), **`builtins.gs`** (module init — `initialize` is
a no-op at ~line 83), and maybe **`install.gs`** (builtins setup / Step-3 type
mappings). Start from `origin/main`.

A concurrent `test_cycle` effort (the other `test_slice` failure) lives in a
different area (`weakref.py`, `gc.py`, GemStone weakref/GC), so conflict risk is
low — but `Object.gs` is large and shared, so whoever edits it should
rebase/coordinate.

---

# Update from the pickle-protocol branch (`feature/cpython-pickle-protocol`)

Added by the session doing the CPython-wire-format pickle rewrite. The diagnosis
above is **correct and independently confirmed** — both root causes were hit from
the other direction. What changed is that pickle no longer needs the `builtins`
fix, so the two efforts can proceed separately.

## The symptom is already fixed, by a narrower route

`SliceTest.test_pickle` passes on that branch: `test.test_slice` goes
**ERROR 1F/1E → FAIL 1F/0E**, and the one remaining failure is `test_cycle` —
the separate weakref/gc effort this doc already identifies.

`pickle.py` was rewritten wholesale into a real stack machine (protocols 0-5,
byte-exact against CPython 3.14.4 in both directions). Instead of teaching the
`builtins` module to answer, it carries a **two-way registry private to
pickle**: `id(class) -> name` for emitting and `name -> class` for loading,
consulted by `_find_global` and `_resolve_global`.

**This matters for gotcha #2 above.** Because `builtins.int` is *never* made
resolvable, `get_type_hints()` is untouched — so there is **no +1
`test_functools` regression** and no scoreboard re-baselining needed to fix
pickle. You are no longer under a merge-gate deadline, and can characterise the
`get_type_hints` question (genuine break vs. more-correct result) on its merits.

## The `builtins` work is still worth doing

The registry only fixes pickle. `getattr(builtins, 'slice')` still fails, and in
CPython it should not. Fix direction §60 stands — with three corrections.

### 1. `builtins` exposes FUNCTIONS but not TYPES

The doc says the module exposes no builtin type classes. True, but the asymmetry
is sharper than that and useful:

```
getattr(builtins, 'iter')  ->  resolves (a BoundMethod)
getattr(builtins, 'set')   ->  does NOT resolve
```

Builtin *functions* already work through the `builtins.gs` method path. Only the
*types* are missing. Eager population should add types without disturbing the
function path.

### 2. `vars(builtins)` is nearly EMPTY today

Measured: `len(vars(sys.modules['builtins']))` was **1** — it holds only what has
already been touched, because resolution is lazy. So "appear in `dir(builtins)` /
`vars(builtins)`" is a strictly larger change than "make `getattr` work", and
`dir(builtins)` is *already* wrong for the functions. Worth deciding explicitly
whether §60.2 means both, since the tests you satisfy differ.

### 3. Do not key any registry on `id()` of a builtin FUNCTION

Learned the hard way on the pickle branch. Builtin functions come back as a
**freshly minted BoundMethod on every attribute access** — so
`getattr(builtins, 'iter') is getattr(builtins, 'iter')` is already False — and
those wrappers are garbage-collected, after which **`id()` values are reused**.
An `id()`-keyed entry then matches an unrelated object: it misnamed `iter` as
`str`, so `iter([])` became `str([])` and a spent list iterator unpickled as an
iterator over the two characters of `"[]"`. Silent data corruption that only
appears under memory pressure. Class objects *are* identity-stable and safe to
key on `id`; nothing else is.

Related: `object class>>__module__` (§60.1) is still the right fix and does not
conflict with anything on the pickle branch.

## Files: what the pickle branch already touched

Avoid these, or coordinate:

- **`src/python/stdlib/pickle.py`** — rewritten wholesale (~536 → ~1100 lines).
  The line numbers cited above (`:101`, `105-107`, `116-131`) no longer exist.
  **Do not patch `_find_global` there**; that is a guaranteed conflict.
- **`src/python/stdlib/_codecs.py`** — NEW. Protocols 0-2 carry bytes as
  `_codecs.encode(str, 'latin1')`, so the module had to exist. If you are
  populating `builtins`, note it is already there; don't duplicate it.
- **`src/python/stdlib/marshal.py`** — now rides on the same encoder.
- **`src/smalltalk/Python/os.gs`** — added `unlink()` / `getpid()`.
- **`src/smalltalk/Python/Range.gs`** — added `___pythonValueAttrs___`;
  `range.start/stop/step` were returning **BoundMethods, not values**, so any
  arithmetic on `r.start` silently operated on a method object. Unrelated to
  `builtins`, but the same family of bug.
- **`src/smalltalk/install.gs`** — test-case registration lines only (trivial).

`Object.gs` and `builtins.gs` — your main surface — are clear. The only
`Object.gs` change from that branch (`___isTruthy___`) is already merged in #107.

## Two harness traps that cost this session real time

Both are worth knowing before you measure anything.

**A single-module suite run truncates the scoreboard, and the scoreboard IS the
gate's baseline.** This doc already warns to `git checkout` it (line ~92) — heed
it. Committing a partial scoreboard does not fail loudly; instead
`check_cpython_regressions.sh` reports the missing modules as
`new -- no baseline` and concludes **"0 regressions" vacuously**. A green gate
that compared almost nothing. Verify the committed baseline has all 32 rows:

```
git show HEAD:docs/CPython_Suite_Scoreboard.md | grep -c '^| test'
```

**`source ./.setenv` in every shell.** The scripts auto-source it only when
`$GEMSTONE` is *unset*; a profile that exports `GEMSTONE` but not `PATH` skips
the guard, `topaz` is not found, and every module reports **`CRASH t=0 f=0 e=0`**
in about two seconds. That is not a VM death — check `out/cpython/<mod>.out`,
which will say `topaz: command not found`.

## Recommendation

Let the pickle branch keep the pickle fix (it is done and would conflict), and
take the `builtins` namespace population as its own change — now with no
blocked test forcing the pace.
