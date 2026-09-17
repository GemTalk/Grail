# Schema change, handled by not having a schema

Two versions of one module, `schema_demo`, run in two sessions against the
same repository. Version 2 adds an instance attribute to a class whose
instances are already committed — the change a relational or document store
would call a migration — and nothing migrates anything.

```
v1/schema_demo.py    class A: x          class B(A): y     -- creates and commits a B
v2/schema_demo.py    class A: x, z       class B(A): y     -- reads it back
run.sh               runs both, one session each
```

## Running it

```bash
experiments/schema/run.sh
```

or, by hand, in two separate sessions:

```bash
PYTHONPATH=experiments/schema/v1 ./grail -c 'import schema_demo'
PYTHONPATH=experiments/schema/v2 ./grail -c 'import schema_demo'
```

Re-running `run.sh` resets the demo: session 1 overwrites `gemdb.root["b"]`
with a fresh `B(1, 2)`.

Both files are the module — the class definitions and the work are in the
module body, which is the one execution Grail treats as definitional. The
only persistence-aware lines in either file are the `gemdb.root[...]`
assignments and `gemdb.commit()`.

## What it shows

```
=== session 1: schema_demo v1 (A.x, B.y) ===
v1: committed B(x=1, y=2)
v1: id(A) = 24402545, id(B) = 24402570
v1: b.__dict__ = {'x': 1, 'y': 2}
v1: A slot layout = ['x']
v1: B slot layout = ['x', 'y']

=== session 2: schema_demo v2 (A.x + A.z, B.y) ===
v2: type(b) is B         -> True
v2: id(B) now 24402570, was 24402570 -> same? True
v2: A slot layout = ['x', 'z']
v2: B slot layout = ['x', 'y', 'z']  (z appended, x and y unmoved)
v2: b.x = 1, b.y = 2    (unchanged)
v2: b.__dict__ = {'x': 1, 'y': 2}  (still only what v1 stored)
v2: b.z = 0               (new attribute, from A's default)
v2: b.total() = 1         (method added by this version)
v2: after b.z = 99 -> b.__dict__ = {'x': 1, 'z': 99, 'y': 2}, b.total() = 100
v2: fresh B(10, 20, z=30).__dict__ = {'x': 10, 'z': 30, 'y': 20}
v2: new instance shares b's class -> True
```

Every line after the header is an `assert` as well as a `print`, so the demo
fails loudly rather than printing something reassuring.

**The class is the same class.** `type(b) is B` is the test that matters, and
the identity comparison is why it is not a coincidence of naming: version 1
records `id(B)` — GemStone's `identityHash`, the object's OOP unshifted, and
stable for the life of the object — alongside the instance, and version 2
reads back the identical number. Grail found `schema_demo` already deployed
with a stale source hash and recompiled the module's methods **in place**,
reusing the registered class objects, so a second `B` was never minted and the
committed instance was never stranded.

**The old data is untouched, and the new shape works anyway.** `b.__dict__`
still holds only `x` and `y`, because nothing rewrote it. `b.z` reads `0` from
the class-level default. `b.total()` — a method that did not exist when `b` was
created — runs against it. Assigning `b.z = 99` is an ordinary assignment.

## Why it works

Since 2026-09-16, **a Python-defined class is pointer-indexable and each of
its attributes is a position in the instance's indexed part**, not a dynamic
instance variable. That is the default; `GRAIL_INFERRED_SLOTS=0` restores
dynamic storage for every class, and Grail's own bundled stdlib sources stay
dynamic either way. The design is
[Instance_Attribute_Indexed_Slots.md](../../docs/Instance_Attribute_Indexed_Slots.md).

So `A` and `B` here have **no named instance variables at all**. Measured on
the committed instance after session 2:

```smalltalk
b class isIndexable         "true"
b class allInstVarNames     "anArray( )"
b basicSize                 "3"
(1 to: 3) collect: [:i | b basicAt: i]   "anArray( 1, 2, 99)"
A ___pySlotLayout___        "anArray( #'x', #'z')"
B ___pySlotLayout___        "anArray( #'x', #'y', #'z')"
```

Three facts do the work, and the demo asserts each:

1. **The layout only appends.** Adding `z` gives it a new position; `x` and `y`
   keep the offsets version 1 gave them. Nothing is re-laid-out, so the class
   identity is free to survive the edit and no instance has to move. (`B`
   carries its own merged layout, which is why `z` lands after `y` for a `B`
   and right after `x` for an `A`.)
2. **An old instance is simply shorter than its class.** `b` was allocated
   under the two-position layout. Before the assignment its indexed part is
   size 2 while the layout has 3 entries; the accessor pair's bounds guard
   reads the missing position as *absent*, and the lookup falls through to the
   class-level default. That — not dynamic storage — is what `b.z == 0` is.
3. **Assignment grows the instance in place**, 2 positions to 3. No ALTER
   TABLE, no migration script, no versioned record format.

Version 2's `z = 0` on the class is a deliberate part of the demo and not
boilerplate Grail requires. Without it, `b.z` on the legacy instance raises
`AttributeError` — exactly as CPython would for an instance that never had the
attribute set. Handling that is a Python question (a default, a `getattr`, a
property), not a database question, which is the point.

### Tombstones, if you run v1 again

`run.sh` re-runs version 1, which *drops* `z`. A dropped position is not
reclaimed; it is retired to a `~z` tombstone, so existing instances stay valid
and a re-added `z` gets its old offset back. On the second and later runs
version 1 therefore prints

```
v1: A slot layout = ['x', '~z']
v1: B slot layout = ['x', 'y', '~z']
```

and says so. The `['x']` / `['x', 'y']` in the sample output above is the
first run against an extent that has never compiled this module's version 2 —
measured by running version 1's source under an unused module name. Note that
the class outlives `PythonModules`: deleting the module's entry there does
*not* forget the layout, because the canonical class registry still holds the
class.

Reclaiming a tombstone is the one instance migration Grail has, and it is
explicit and opt-in: `Cls ___grailCompactSlots___` moves every instance in the
caller's transaction.

### What still costs something

Narrower than it sounds, and documented in
[Persistent_Modules_and_Classes.md §8.3](../../docs/Persistent_Modules_and_Classes.md):
changing a class's **bases** re-mints it, and a `__slots__` name added to a
class rooted at a kernel class (`Exception`, `dict`, …) degrades to dynamic
storage, because there the indexed part is already the object's content. An
added or dropped attribute on an ordinary class — this demo — does not.

Related: [GemDB_Module.md](../../docs/GemDB_Module.md) for the `gemdb` API, and
[Persistent_Modules_and_Classes.md](../../docs/Persistent_Modules_and_Classes.md)
§D2 for the in-place rebuild.
