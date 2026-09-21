# Schema evolution: decisions and cuts

**Status:** design, 2026-09-20; **cuts 1 and 2 implemented 2026-09-21**
(cut 1: survivors, holes, the class-side drop, one home per name, strict
slots on the current declaration; cut 2: `gemdb.schema`), cuts 3-5 open.
Follows
[Schema_Evolution_Review.md](Schema_Evolution_Review.md), whose proposals
James reviewed the same day; the decisions below supersede that note's
P1-P6 where they differ. The Python-facing narrative of today's behaviour
is [Schema_Evolution.md](Schema_Evolution.md), and every scenario referenced
is in [experiments/schema_changes/](../experiments/schema_changes/).

## 1. Decisions

1. **A name the class stops assigning survives.** It stays in the layout,
   readable, writable and deletable per instance, listed by `vars()`, exactly
   as a per-object attribute is. Nothing is retired at rebuild time. The
   `~name` tombstone as a *semantic* state goes; "unassigned by the current
   body" becomes a derived report, and `~` is kept only to mark a **hole**, a
   position freed by an explicit drop.
2. **Deletion is explicit, mass, and lives in `gemdb`.** `gemdb.schema.drop(Cls,
   "name")` nils the value on every instance of the class and its subclasses
   and removes the name from the layouts. It owns its transaction and commits
   in batches. Compaction stays as a separate, optional `gemdb.schema.compact`.
   No class-side public name, no decorator on `del`.
3. **`__renamed__`**, a class-body declaration next to `__slots__`, relabels a
   position in place at rebuild. A module-level `__renamed__` does the same
   for a class. We accept the risk that CPython one day takes the name.
4. **A base change, an undeclared class disappearance, and a class deletion
   are refused at import**, naming the class and the `gemdb.schema` command
   that performs the migration under a clean transaction.
5. **An instance attribute shadowing a method** flips a monotonic per-selector
   flag on the class, which recompiles every implementor in the subtree with
   a prologue that consults the instance. Direct self-sends stay direct.
6. **`__slots__` is a strictness declaration, not an optimisation** (§2).

## 2. What `__slots__` means in Grail

In CPython `__slots__` does two jobs: it is a memory and speed optimisation
(no per-instance `__dict__`), and it is a contract (an undeclared name cannot
be stored, `__dict__` and `vars()` are absent, `__weakref__` is absent unless
listed). Grail gets the optimisation for every class already: an inferred
attribute is a position, the same storage a declared slot is. So the
optimisation half is *ignored*, deliberately: declaring `__slots__` changes
nothing about where a value lives or how fast it is read.

The contract half is kept exactly as CPython has it, because it is what code
and test suites observe:

- a store of a name not in the *current* `__slots__` raises `AttributeError`
  (`SlotsTestCase` pins this, and the corpus depends on it);
- `__dict__` / `vars()` behave as in CPython for a slotted class;
- a slotted class infers nothing (#1027), since the author enumerated the
  attributes.

Reads are not made stricter than CPython: a class attribute of a name not in
`__slots__` is still readable, as it is there. Two consequences of decision 1
for a slotted class:

- a name removed from `__slots__` **survives** on old instances, readable and
  deletable, but the strict check refuses a **new store** of it, so the
  contract the current source states is what governs new writes;
- a slotted class has no per-object storage at all, ever, so the dual-home
  defect (review F1) cannot arise on one. That is the invariant worth
  keeping, and the reason not to weaken the strict store.

## 3. The model after the cuts

A class's layout is an append-only list of positions. Each position is
either a **name** or a **hole** (`~name`, the name it last held, kept for the
audit trail). Derived, never stored:

- **assigned**: the names the current body's own methods assign through
  `self`, plus `__slots__` (what `___inferredSlotNames___` and the declared
  list answer today);
- **surviving**: layout names that are not assigned. The report lists them.

Rules:

- a rebuild **appends** the assigned names the layout lacks and changes
  nothing else; a body that assigns nothing new leaves the layout alone;
- a rename **relabels** a position;
- a drop turns a name into a hole after nilling it everywhere; a hole is
  reused by exactly one thing, a later assignment of the **same** name
  (safe, because the drop nilled every instance and a stale session writing
  that name writes that name), never by a different name; compaction
  reclaims it;
- every layout name has an accessor pair and an index entry, whether or not
  it is assigned; a subclass continues its parent's positions as now.

What this removes from today's code: the tombstone branch of
`___grailMergedSlotLayout___:`, `___grailRemoveOwnIndexedPair___` on a
rebuild, the retire half of `___grailPropagateSlotLayoutToSubclasses___`, and
the tombstone skip in `___grailCompileSlotIndexTable___`. Review F3 (a body
that infers nothing never merges) stops mattering, because merging nothing is
now the correct result; P4 is withdrawn.

## 4. Cuts

Each cut is one PR. Order matters: 1 and 2 first, they change what the rest
builds on.

### Cut 1. Survivors, and one home per name

*Tier 2 (Object.gs and ClassDefAst).* **Done 2026-09-21**, with the
class-side drop primitives (`___grailDropSlot___:`,
`___grailDropSlotSessionOnly___:`) brought forward from cut 2 so the
compaction tests have a way to make a hole; `gemdb.schema` still wraps them
in cut 2. One refinement against the list below: the indexed pair's SETTER
does not reconcile a per-object leftover (it is the hot path; ~11 ns per
store to probe), so a store made inside a method can leave an old copy
behind unread. The dict views list the name once, reads take the position,
and `del` removes both, so nothing observable differs; the copy is garbage
until the next `del` or generic store.

- `___grailMergedSlotLayout___:`: a rebuild keeps every existing entry as it
  is and appends; the parent-tombstone copy logic goes. Holes are copied
  from the parent as holes.
- `___grailPropagateSlotLayoutToSubclasses___`: appends and relabels only.
- `___grailCompileSlotIndexTable___`: every name gets an entry; a hole gets
  none.
- The rebuild no longer removes any pair. `___grailInstallInferredSlots___:`
  compiles a pair for every layout name it does not already own at the right
  position, assigned or not.
- **One home per name.** `___pyAttrStore___:put:` and the indexed pair's
  setter: when the name has a position, remove a dynamic instVar of that name
  after writing the position. `___pyAttrDelete___`: nil the position *and*
  remove the dynamic instVar. Reads unchanged (position, then dynamic), so a
  read never dirties the transaction; the first store or delete migrates a
  pre-promotion leftover. `PyInstanceDict >> ___stringKeysDo___` visits each
  name once: slot names, then dynamic names not already a slot.
- **Strict slots.** The strict store check consults the *current* declared
  set (`___pyDeclaredSlotNames___`), not the layout, so a removed slot name
  survives readable but not storable.
- Tests. `IndexedSlotRebuildTestCase`: `testDroppedSlotIsATombstoneThatKeepsItsPosition`
  becomes `testUnassignedSlotSurvives` (layout `#(x y z)`, the old instance
  reads 10, `vars()` lists it, a foreign store writes the position, no
  dynamic instVar appears); `testParentRetiresASlotUnderSubclasses` becomes
  a no-change test. New: promotion then delete raises `AttributeError`;
  `vars()` agrees with the read after a store. `SlotsTestCase`: removed
  slot name readable, new store refused. The scenarios in
  `experiments/schema_changes/` change their asserts: `remove_and_readd` v2
  reads 10, `rename` v2 reads the old phone, `refactor_helper` v2 reads
  height, `dual_home` becomes an assert scenario with no DEFECT lines.
  `Schema_Evolution.md` §3.2, §3.5 and §4 are rewritten.

### Cut 2. `gemdb.schema`

*Tier 1 plus a committing script, like `runSlotCompactionTest.gs`.*
**Done 2026-09-21.** Three things the plan did not predict:

* **`rename` landed here rather than in cut 3**, because the primitive is
  the same one `__renamed__` will call and the programmatic form is what
  makes it testable. It has two branches: a RELABEL when the new name has no
  position (nothing is touched, whatever the repository holds) and a MOVE
  when a deploy already appended it (values migrate, the old name becomes a
  hole, and it refuses outright if any instance holds a value under both
  names). Both refuse while a body still assigns the old name. Cut 3 is now
  only the declarative surface.
* **A refusal has to be a Python exception.** The primitives signalled
  Smalltalk `ImproperOperation`, which code running in Python cannot catch:
  `gemdb.schema.drop(Cls, name)` on a still-assigned name tore through an
  `except Exception` and killed the caller. Refusals about the *request* now
  signal `ValueError` (`object class >> ___grailSchemaRefuse___`), the same
  translation `Repository.gs` does for the administration primitives; the
  transaction refusals stay `ImproperOperation`, since the Python layer
  converts them to `PendingChangesError` before they can fire.
* **The submodules were never getattr-warmed**, and that is a defect this
  cut had to fix rather than a nicety. `gemdb/__init__.py` warms its own
  public names during the deploy commit because the getattr path CACHES the
  wrapper on the module object, so a first call in a later session is a
  WRITE on a committed module. `admin` and `sessions` never did the same, so
  the first `gemdb.admin.backup(...)` of a session dirtied it and then
  `backup`'s own `needs_commit()` check refused — against a session the
  caller had just committed. `gemdb.schema`, whose every operation makes
  that check, failed on its first call until all three modules were warmed.

A new submodule of `gemdb` beside `admin` and `sessions`
([GemDB_Module.md](GemDB_Module.md)), Python surface over class-side
`___grail…___` implementations:

```python
gemdb.schema.layout(Cls)         # [{'name': 'phone', 'position': 1, 'assigned': False}, ...]
gemdb.schema.report()            # every class with survivors or holes, with instance counts
gemdb.schema.drop(Cls, "name")   # nil everywhere, then a hole; batched commits
gemdb.schema.compact(Cls)        # reclaim holes: today's ___grailCompactSlots___
gemdb.schema.rename(Cls, old, new)   # the programmatic __renamed__
```

`drop` and `compact` refuse if `gemdb.needs_commit()`, do the repository
scan (`listInstances:` over the class subtree from
`___grailSlotSubtree___`), and commit themselves. `drop` writes in batches
of N instances per commit, the layout change last, so it is idempotent and
resumable after a crash; a re-run finds fewer non-nil values and finishes.
`compact` cannot batch (the layout switch is atomic across every instance)
and says so; it stays the operation for a class small enough for one
transaction. `report` is the developer's replacement for an import-time
error: it is how they decide when to drop.

Refusals: `drop` of a name that is assigned by the current body is refused
(drop the assignment first, or it comes straight back). `drop` on a class
that is not the layout's owner of the name (the name is inherited) is
refused with the owning class named.

### Cut 3. `__renamed__`

*Tier 2 (ClassDefAst, the merge).*

- `ClassDefAst` recognises a class-body `__renamed__ = {"old": "new", ...}`
  literal (string keys and values only; anything else is a compile error)
  and passes it to the installer beside the declared slots.
- `___grailMergedSlotLayout___:` applies the relabels **before** merging: for
  each pair, if `old` is in the layout (a name or a hole) and `new` is not,
  the entry is relabelled in place and the pair, index entry and
  `___pyOwnInferredSlots___` follow; if `new` already has a position, the
  import raises `ImportError` naming both; if neither exists, no-op. The
  relabel propagates to every subclass layout through
  `___grailPropagateSlotLayoutToSubclasses___`, and a subclass holding `old`
  itself is relabelled too.
- The declaration stays in the source; on a repository that never saw `old`
  it is a no-op, so one file deploys everywhere.
- **Module-level `__renamed__`** (`{"Person": "Customer"}`, or
  `{"other_mod.Person": "Customer"}` for a move) re-keys the canonical class
  registry entry to the new name and module and renames the Smalltalk class,
  keeping its identity. To probe first: what renaming a class whose name is
  part of generated selectors (the `___pyDefinedClass___` marker, the class
  attribute holder) actually requires on 4.0.
- Tests: rename with data (old value readable under the new name at once),
  rename of a hole (no-op), conflict (ImportError), rename under a subclass
  that assigns the old name, fresh repository (no-op). `experiments/schema_changes/rename/`
  v3 becomes the `__renamed__` version and loses its load-bearing assignment.

### Cut 4. Refuse-at-import for class-level changes, with the migrations

*Tier 2 (importlib).*

Detection needs no scan. At rebuild the module's deployment record knows
its previous class set, and `___canonicalSubclassOf:…` already refuses
identity reuse when the parent differs. Three refusals, each an
`ImportError` that names the class and the command:

- **a class present in the previous deployment and absent from the new
  body**, not covered by a module-level `__renamed__`: "class Person was
  removed; run gemdb.schema.drop_class('mod.Person') or declare
  __renamed__";
- **a class whose bases changed**: "class Customer changed its bases; run
  gemdb.schema.rebase('mod.Customer')";
- a `__renamed__` target that already exists.

The commands, both owning a clean transaction:

- `gemdb.schema.rebase(name)`: builds the class with its new bases as a new
  class object, computes its layout from the new parent plus the old class's
  own names, and for every instance of the old class **and its subtree**
  permutes the values into the new layout and calls the kernel's
  `changeClassTo:`, which Grail already uses for `__class__` assignment
  (`___pyChangeClassOf:to:`, Object.gs) and which accepts any two
  `PythonInstance`-rooted classes, since all are indexable with no named
  instVars. Subclasses are rebuilt against the new parent the same way. The
  residue is references *to the old class object* held in user data
  (`gemdb.root["cls"] = Person`); `rebase` reports their count from
  `listReferences:` and leaves them, since only the developer knows what
  they mean.
- `gemdb.schema.drop_class(name)`: scans, reports the instance count, and
  removes the registry entry only when it is zero. Grail cannot make an
  instance unreachable; a class with live instances stays until the
  developer unlinks them. This is the answer to "references to objects the
  user does not have in their schema": the class cannot leave the schema
  while data still points at it.

Tests: a committing script per refusal and per command, with a subclass in
the subtree and a class reference in the root.

### Cut 5. Instance attributes that shadow a method

*Tier 2 (Object.gs and codegen), and the riskiest cut; last.*

Today a foreign `obj.m` honours an instance override (the dynamic probe
runs before the selector family) while `self.m()` inside the class is a
direct send and does not; `patch.object` on a method called internally
records nothing (memory: *self.m() ignores an instance override*).

- **Trigger.** In `___pyAttrStore___:put:` (and the `__setattr__` tail): the
  name resolves to a method of a Python-defined class in the receiver's
  chain, and that class does not yet carry the marker
  `___pyOverridable_<m>___`. Then: compile the marker (class-side, persistent,
  category `Grail-Overridable`), and for every implementor of the selector
  family (`___selectorFamilyFor___:string:`) in the Python-defined subtree,
  install the prologue. The marker never goes away, so the class is written
  once per selector; a concurrent second session loses a commit at most once
  and retries.
- **Prologue.** Rather than editing generated bodies, recompile the original
  method's source under an alias selector and compile a stub under the
  original selector:
  `m: a   ^ (self dynamicInstVarAt: #m) ifNil: [self ___orig_m: a] ifNotNil: [:f | f ___pyCallValue___: {a} kw: nil]`.
  One dynamic probe (~11 ns) per call on flagged selectors only; unflagged
  selectors are untouched.
- **Known risks**, each a gate: IR-compiled methods break when recompiled
  from source (memory: *recompiling method source breaks IR methods*), so
  the alias must be produced the way the MI merge copies a method, not by
  recompiling; traceback frame names must skip the stub; `super().m()` must
  still reach the class's method and not the instance override (CPython
  semantics: `super()` bypasses the instance dict); the MI merge copies must
  get the prologue too when their source class is flagged.
- Tests: the three-line probe from the memory, `patch.object(obj, 'm',
  wraps=…)` on an internally-called method, an unflagged selector's call
  count of dynamic probes (zero), and `super()`.

Rejected: a per-instance anonymous subclass (persistent class churn, a
conflict per patch, `type(obj) is C` false) and routing every method call
through a lookup (the penalty is everywhere, the flag confines it to the
names actually patched).

## 5. What the guide will say afterwards

The cheat sheet in [Schema_Evolution.md](Schema_Evolution.md) collapses to:
add (assign it), remove (stop assigning; nothing changes for old instances;
`gemdb.schema.drop` when you mean it), rename (`__renamed__`), shape change
(a normaliser in Python), move in the hierarchy (move the assignment), base
change or class rename (`__renamed__` for the rename, `rebase` for the
bases, both explicit), and reclaim (`compact`, optional). Every row says
"instances untouched on import", and the only two operations that write
instances are the two the developer runs by name.
