# Schema evolution over indexed slots: a review

**Decisions taken on this review are in [Schema_Evolution_Design.md](Schema_Evolution_Design.md)**
(same day); where the two differ, the design note wins. In particular P1 was
simplified to "an unassigned name survives" with no tombstone state at all,
P4 is withdrawn as a consequence, and the mass delete lives in `gemdb.schema`.

**Date:** 2026-09-20, on `main` at #1056, gs40. **Scope:** the design in
[Instance_Attribute_Indexed_Slots.md](Instance_Attribute_Indexed_Slots.md)
as implemented by #1011/#1019/#1027/#1029, read against James's questions
about re-adding, implicit versus explicit deletion, foreign stores of a
retired name, repository growth, renames, and what other schema changes
exist. Every finding below was measured; the scripts are
[experiments/schema_changes/](../experiments/schema_changes/) and the
transcript is in its README. The Python-facing narrative is
[Schema_Evolution.md](Schema_Evolution.md).

The short version: the append-only layout is right and the code does what
the design says. The one design decision I would reverse is the tombstone
semantics ("a retired name reads as absent"), because it is the root of the
two measured defects, it makes a rename inexpressible from Python, and it is
what makes deletion implicit. Retire implicitly, delete explicitly, is the
rule that answers most of the questions.

---

## 1. What holds up

Measured and pinned by `IndexedSlotRebuildTestCase`, and confirmed from
Python across sessions:

- **Append-only.** A rebuild keeps every position; new names append; the
  class identity survives (`id()` equal across sessions). No instance is
  written on import.
- **Revival.** A tombstone re-assigned later revives in place and the old
  instances' old values come back (`remove_and_readd`).
- **Subclass positions are independent.** A parent appending after a child
  has used the next slot gives the child its own pair at its own position
  (`___grailPropagateSlotLayoutToSubclasses___`, and the same-load merge
  path); a parent retiring a name a child assigns leaves the child live
  (`move_in_hierarchy`).
- **Compaction** rewrites the subtree's layouts, moves instances, shrinks
  them, recompiles pairs, refuses in a dirty transaction, and is the only
  place a retired value is freed (`compact`).
- **Transactional.** An uncommitted rebuild leaves no trace
  (`uncommitted_rebuild`). Correct, and worth saying out loud in the guide
  because the rebuild happens inside whatever session imports first.

## 2. Findings

### F1. One name, two homes on one instance (defect)

Two routes, both in `dual_home`:

*Promotion.* `p.x = 1` from outside the class is a dynamic instVar. An edit
that adds `self.x = 0` gives `x` position 1. `p.x` still reads 1 because the
pair's guard finds the position absent and `___pyAttrLoad___` falls through
to the dynamic probe (Object.gs, the slot-then-dynamic order). Then:

```
after p.x = 2:   p.x = 2   vars(p) = {'x': 1}
after del p.x:   p.x = 1   (CPython: AttributeError)
```

`___pyAttrStore___:put:` writes the position and leaves the dynamic value;
`___pyAttrDelete___` nils the position and returns without removing the
dynamic one (the `___pyHasSlots___` branch); `PyInstanceDict
>> ___stringKeysDo___` enumerates slot pairs *and* dynamic pairs, so the same
key is visited twice and the dict shows whichever came last.

*Retire, store, revive.* `x` retired; a foreign `q.x = 99` goes dynamic
(by design, §2 of the design note) while position 1 silently keeps the 10;
an edit revives `x`:

```
q.x = 10   vars(q) = {'x': 99, 'y': 20}
after del q.x:  q.x = 99
```

The revived position shadows the *newer* value, and `del` uncovers it.

### F2. A retired value has no Python route (design gap)

After the naive rename `phone` → `phones`, the old value is in the object
and reachable from nowhere: not the attribute, not `__dict__`, not `dir()`.
The only recovery is to know that a tombstone revives, and to keep one
`self.phone = …` alive in some method as a hidden dependency (`rename` v3).
That means the lazy-accessor migration James describes cannot be written
today without that trick, and a developer who does not know the trick
believes the data is gone.

### F3. Retiring depends on whether any *other* name survived (inconsistency)

`ClassDefAst` emits the `___grailInstallInferredSlots___:` line only when the
body infers at least one name (or declares slots, properties or a hook):
ClassDefAst.gs, the condition ahead of the emit. A rebuild whose body infers
*nothing* therefore never calls `___grailMergedSlotLayout___:`, the layout is
untouched, every old name stays live and the stale pairs stay compiled. Measured:
moving both of `a`, `b` into a helper keeps `['a', 'b']` and new instances
still store by position; moving only `b` gives `['a', '~b']`
(`refactor_helper`). Same kind of edit, opposite outcome.

### F4. The retirement signal is "no own method assigns `self.x`" (fragile)

Not a bug, but the doc must say it and any "error on recompile" rule would be
built on it. A behaviour-preserving refactor that routes an assignment
through a helper, a parameter not named `self`, or `setattr`, retires the
name; old instances hide the value; new instances of the *same class* store
that name dynamically. The class then has two storages for one name across
its population, which is the state #965's degradation was criticised for.

### F5. Not verified here

The MI secondary-base positions, a kernel-rooted slotted class edited to add
a slot (the known §5 gap), and two sessions importing the same edit
concurrently (expect a write-write conflict on the class object at the
second commit; not measured).

## 3. Proposals

### P1. Retired means "not assigned by the class", not "unreadable"

Flip the 2026-09-16 decision. A tombstone keeps its **index-table entry** so
a foreign read, store or delete of the name reaches the position; the class
compiles **no pair** for it and `___pyOwnInferredSlots___` excludes it, so
the class body never writes it and a new instance never gets it; the
`__dict__` view lists it when its value is non-nil; a declared slot that is
retired still counts as a slot for the strict check. Compaction is
unchanged and becomes the *only* place a value is lost.

What it buys, against the questions:

- **Re-add**: revival is now just "the class assigns it again"; values were
  never hidden, so nothing is history-dependent except compaction.
- **Foreign store of a retired name** goes to the position, never to a
  dynamic instVar: the retire/revive half of F1 cannot happen.
- **Rename** is expressible in plain Python: `getattr(self, 'phone', None)`
  in the lazy accessor, with no load-bearing assignment.
- **Implicit versus explicit**: removing the assignment *retires* (a schema
  signal: new instances stop carrying it); compaction *deletes*. Deleting is
  the explicit developer decision James's instinct asks for, and it is
  already the operation that exists.
- **CPython**: this is what CPython does; the departure was the cost.

The one thing it gives up is "an edit that removes an attribute means the
attribute is gone" for existing instances. I think that reading was never
what a developer with committed data wants; a column drop is explicit in
every store.

Cuts: `___grailCompileSlotIndexTable___` emits tombstone entries;
`PyInstanceDict` and `vars()` include a tombstone with a non-nil value;
`___pyInferredSlotIndexFor___:` learns the tombstone set; the strict-store
check consults it; `IndexedSlotRebuildTestCase >>
testDroppedSlotIsATombstoneThatKeepsItsPosition` flips its `should: raise:`
to a read of 10. Guide §3.2 and the design note §2 change wording.

### P2. One home per name per instance (fixes the promotion half of F1)

Whenever the class gives a name a position: a **store** into the position
removes any dynamic instVar of that name (`___pyAttrStore___:put:` and the
indexed pair's setter through it); a **delete** nils the position *and*
removes the dynamic one; a **read** stays as it is (position, then dynamic),
so a read never dirties the transaction. `PyInstanceDict >>
___stringKeysDo___` visits each name once, slot names first and dynamic names
only when not already a slot. With P1 in place the dynamic value of a
positional name can only be a pre-promotion leftover, and the first store
or delete migrates it.

### P3. A declared rename

```python
class Contact:
    __renamed__ = {"phone": "phones"}      # old -> new
```

Consumed by the rebuild, before the merge: for each pair, if the old name is
in the layout (live or tombstone) and the new one is not, **relabel the
position in place** and propagate the relabel to every subclass layout
through the existing walk; if the new name already has a position, refuse
the import with a clear error (two columns cannot become one silently); if
neither exists, no-op (already applied, or compacted). O(1), no instance
scan, no data movement, and the declaration can stay in the source
harmlessly. A rename is exactly a relabel of a position, which is the one
operation an append-only layout makes free; drop/add is the wrong primitive
for it.

The shape-changing rename (`phone` string → `phones` list) is then relabel
plus a normaliser in Python (guide §3.5), which is the right split: Grail
owns the name, the developer owns the value. A per-instance
`__upgrade__(self)` hook run on first touch would generalise the normaliser;
I would not build it until a second use case turns up, since a property
already does it.

Spelling is open: `__renamed__` reads well next to `__slots__`; a
`__grail_renames__` is more honest about being Grail-specific.

### P4. Always merge the layout on a rebuild (fixes F3)

Emit the installer line whenever accessor pairs are wanted for the source,
not only when a name was inferred, so a body that infers nothing retires
everything, consistently with a body that infers some. `___grailMergedSlotLayout___:`
already handles an empty `inferredNames`.

### P5. Report, do not error, on a rebuild that retires

James's "make it an error if a recompile fails to reference or delete an
attribute": I would not. The rebuild runs in whichever session first imports
the edited source, which can be production, and an error there halts the
application on a refactor (F4 shows refactors trip it). The tombstone
already *is* the record that something was retired. What is missing is a way
to see it: a repository-level report, callable from Python, listing per
class the retired names, the instance count still holding a value, and the
classes below it, so a developer decides when to compact with numbers rather
than a hunch. A strict mode per module (refuse a rebuild that retires
without a matching `__renamed__` or an explicit `__retired__ = (…)`) can be
an opt-in on top, later.

### P6. Public names

`___pySlotLayout___()` and `___grailCompactSlots___()` are the only way to see
or change the schema and the guide has to name them. They deserve a public
home, e.g. `gemdb.schema.layout(Cls)`, `gemdb.schema.compact(Cls)`,
`gemdb.schema.report()`.

## 4. James's questions, answered in one place

| question | answer today | with P1–P4 |
| --- | --- | --- |
| Re-add a deleted attribute: prior values visible or lost? | Visible, revived in place, unless a compaction ran between. | Same, and they were never invisible in between. |
| Delete implicitly (unreferenced) or explicitly? | Implicitly retired on rebuild, and the value hides. Deletion of the value only by explicit compaction. | Retire implicitly (schema), delete explicitly (compaction). The value is readable until then. |
| Foreign reference to a retired name: restore or per-object? | Per-object (dynamic), with the position keeping the old value underneath; revival then shadows the newer value (F1). | Reaches the position. No second home. |
| Restore for all instances? | Revival is per class; every old instance's value is back at once, at zero cost, because nothing moved. | Same. |
| Repository growth? | Identical under implicit or explicit deletion: a retired value is retained per instance until compaction. Today growth is worse, because a foreign store of a retired name adds a second copy plus a name OOP. | Only the retained values; a developer can `del` them per instance, and compaction frees the column. |
| Error on recompile if not referenced or deleted? | No such rule. | Do not add one at import (P5): report, and offer an opt-in strict mode. |
| Rename: drop/add? | Yes, and the values become unreachable from Python; recovery needs a hidden trick. | `__renamed__` relabels the position (P3); the lazy normaliser handles shape. |
| Singular → plural | Expressible only with the `self.phone = None` trick. | Relabel plus a property that lists a scalar on first read. |
| Other schema changes? | See §5. | |

## 5. The full list of edits, and which mechanism covers each

| edit | mechanism | instances moved | covered |
| --- | --- | --- | --- |
| add attribute | append position; class default for old instances | no | yes |
| remove attribute | tombstone | no | yes (P1 changes what a tombstone means) |
| re-add | revive | no | yes |
| rename | today drop+add; P3 relabel | no | **P3** |
| change value shape (scalar → list) | Python-level normaliser | lazily | yes, a Python concern |
| move attribute up/down hierarchy | tombstone in one class, live in the other | no | yes |
| attribute becomes a `@property` | property forwarder wins; old position retired | no | yes |
| declared `__slots__` added / removed | strictness markers change; positions unchanged | no | yes (kernel-rooted class: known gap) |
| default value changes | not a schema change | no | n/a |
| reclaim retired positions | compaction | yes, all, one transaction | yes; batching open |
| change bases | re-mint; instances stranded | manual | **no**, and out of scope for positions |
| rename or move the class | new class; instances stranded | manual | **no** |
| class attribute changes | single-home holder, not positional | no | yes, separate design |

The unsolved rows are the two that change *which class* an instance belongs
to. Everything that changes *what an instance of the same class holds* is
covered by append, tombstone, revive, relabel and compact, which is the
complete algebra over an append-only layout. I do not see a sixth operation.
