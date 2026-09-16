# Instance attributes as indexed slots (design)

**Status:** cuts 1, 2 and 3 of §4 implemented 2026-09-16 -- cuts 1 and 2 merged
as PR #1011 (on top of the class-side PR #1009), cut 3 with the tombstones and
the compaction as PR #1019: `PythonInstance`
is pointer-indexable, inferred slots AND declared `__slots__` are layout
positions, the rebuild merge and the subclass position rule are in
(`IndexedSlotRebuildTestCase`, with a declared-slot revision), a name a
rebuild drops becomes a `~name` tombstone (§2, with the semantics chosen
below), compaction is the explicit `___grailCompactSlots___` (§4 item 5).
Follows [Class_Attribute_Single_Home.md](Class_Attribute_Single_Home.md),
which did the class side. This is James's indexable-class proposal, scoped as
the replacement for the **inferred-slot** storage behind
`GRAIL_INFERRED_SLOTS`, not for the default dynamic-instVar storage.

**Two things the implementation taught that §2 did not predict.** The one
index table serves both storages by answering an indexed position NEGATED
(`___pySlotAt___:` dispatches on the sign), which kept the three probes to a
one-line change each. And a parent's grown layout cannot reach a subclass
rebuilt in the same module load through the subclass registry, because the
module re-run drops the registrations before the body runs; so the subclass's
own installer merges the parent's layout and compiles its own pair for every
inherited name whose position differs from the parent's, and the registry walk
covers only a subclass defined in another module.

**Related:** PR #965 (inferred slots), `object class >>
___grailInstallInferredSlots___:properties:` in [Object.gs](../src/smalltalk/Python/Object.gs),
`ClassDefAst >> ___inferredSlotNames___`, `object >> ___pySlotIndexFor___:`,
[PyInstanceDict.gs](../src/smalltalk/Python/PyInstanceDict.gs),
[Persistent_Modules_and_Classes.md](Persistent_Modules_and_Classes.md) §8.3.

---

## 1. What exists, and what each storage costs

A Python instance attribute has two storages today, chosen per class at build:

| storage | when | read cost (gs40, per access) | shape |
|---|---|---|---|
| **dynamic instVar** | default; every non-inferred name; every kernel-rooted subclass (list, dict, str, bytes, Exception) | ~11 ns probe | none: add/remove freely; **255 per object** ceiling (`___pyStoreDynamic___:put:`) |
| **named instVar** `___slot_x___` | declared `__slots__`; inferred names with `GRAIL_INFERRED_SLOTS` on | bytecode read inside the accessor, ~1 ns; `instVarAt:` ~8 ns from the probes | fixed at class creation: adding one needs a new class version and instance migration |

With the flag on, `self.x` compiles to the send `self ___pyattr_x___` and
`self.x = v` to `self ___pyattr_x___: v`. The **pair** is where #965's speed
came from (read 146 → 108 ns/iter, write 2134 → 109, the write win being the
bypass of the general store's descriptor search); the storage behind it is
worth a few nanoseconds either way. The pair is kept. What changes is what the
pair reads and writes.

The named-instVar storage has the one property the persistence design cannot
live with: a class whose inferred set grows on an edit has a different
instVar shape, so identity reuse (D2) is refused and instances strand. #965
papered over that by degrading the new name to dynamic storage on a reused
class ("a reused class cannot grow an instVar"), which means a deployed class
silently has two storages for names of the same kind.

## 2. The proposal

**Every Python-defined class is pointer-indexable, and an inferred or declared
slot is a POSITION in the indexed part, not a named instVar.**

- `PythonInstance` becomes `Object indexableSubclass:`. Indexability is
  inherited (measured: a plain `subclass:` of an indexable class is
  indexable), so nothing else in class creation changes; the kernel-rooted
  classes (list, dict, tuple, str, bytes, Exception) are already indexable and
  their indexed part is their *content*, so they keep dynamic storage as now.
- Each class carries a compiled **layout**, `___pySlotLayout___`, answering the
  ordered names of its positions, own and inherited: `#(x y ~z w)`. A `~`
  prefix is a tombstone: the position is retired and the name reads as absent,
  but the offset is kept so existing instances stay valid and a re-added name
  gets its old position back. `___pySlotIndexFor___:` (which already exists,
  compiled per class as an `aSym == #x ifTrue: [^ n]` chain) is derived from
  the layout and answers the position, 0 for none.
- The accessor pair reads and writes by position with a bounds guard, since an
  instance created under an older layout is *shorter* than the class (measured:
  `at:` past `size` raises 2003; `at: size+1 put:` grows by one; a gap does
  not):

  ```smalltalk
  ___pyattr_x___
      ^ (3 <= self @env0:_basicSize ifTrue: [self @env0:at: 3] ifFalse: [nil])
          ifNil: [self ___pyAttrLoad___: #x]
  ___pyattr_x___: v
      3 > self @env0:_basicSize ifTrue: [self ___grailGrowTo___: 3].
      self @env0:at: 3 put: v
  ```

  The position is a literal per class, so the pair is one primitive plus a
  compare. `nil` is the unbound token, as everywhere in Grail (None is a
  singleton), so `del self.x` is `at: 3 put: nil` and the read falls into the
  loader exactly as an unset named slot does today.
- The three runtime probes (`___pyAttrLoad___`, `___pyAttrStore___`,
  `___pyAttrDelete___`) keep asking `___pySlotIndexFor___:` first and then use
  `at:` / `at:put:` with the same guard instead of `instVarAt:`. The
  `__dict__` view (`PyInstanceDict`), `vars()`, `dir()` and `__getstate__`
  read the layout and skip nil values, which is what they do for inferred
  slots now.

**Redefinition.** On a rebuild that reuses the class identity, the new layout
is the OLD layout with: names the new body no longer infers turned into
tombstones, names re-inferred with their old position, new names appended.

*What a tombstone means for an existing instance* (decided 2026-09-16, and
the one place this deliberately departs from CPython): the retired name reads
as **absent**. The value is still in the indexed part — nothing rewrites
instances on an import — but the index table has no entry for the name, the
class's own pair for it is removed, and `vars()` / `__dict__` / pickling do
not list it. A foreign `obj.x = v` of a retired name is a per-object attribute
(dynamic storage), as for any name the class does not know. CPython would
keep showing the old value, because there the instance dict is the schema;
here the class is, and an edit that removes an attribute is taken to mean the
attribute is gone. A later revision that declares or infers the name again
revives the tombstone in place, and the old instances' old values come back
with it. Compaction is what actually frees the position.
The class never changes shape because it has none: the metaclass is constant
(class side, done) and the instance side is "indexable with no named
instVars". So `___canonicalSubclassOf:` reuses whenever the superclass matches,
which after cut 2 it already does, and the flag-on degradation to dynamic
storage goes.

**Subclasses.** B's layout continues A's. James's example:

| step | A layout | B layout |
|---|---|---|
| A defined with `a1` | `(a1)` | |
| B(A) defined with `b1` | | `(a1 b1)` |
| A redefined with `a1 a2` | `(a1 a2)` | `(a1 b1 a2)` |

`a2` is position 2 in A and 3 in B, so B compiles its own `___pyattr_a2___`
pair with its own literal. The general rule: **every class compiles a pair for
every name in its layout**, inherited or not (today only the declaring class
does). Then a pair never needs to agree with a superclass's positions, A's
methods running on a B instance dispatch to B's pair, and the "override the
accessor when the position differs" case is not special. A rebuild of A walks
its transitive subclasses (`___registerSubclass___` keeps the registry) and
recompiles their layouts and pairs; the MI merge copies A's *methods* into a
class that lists A as a secondary base, and those methods send the pair too,
so that class needs positions for A's names — the merge asks the layout, as
it asks for class attributes now.

**Per-object attributes** (a name no method of the class assigns): dynamic
instVars, exactly as today's non-strict behaviour. Option (1) of the
proposal, chosen because kernel-rooted subclasses force the mechanism to exist
regardless, and because (2) makes every instance of the class grow and every
assigning session write the class object, while (3) breaks `type(obj) is C`,
pickling by class name and `__subclasses__()`.

**Compaction** is optional and separate: `Cls ___grailCompactSlots___`
rewrites the layout of the class and of every class below it without
tombstones, recompiles the index tables and the pairs, and shifts every
instance's slots (and shrinks it to its last set position). It is a
repository scan (`SystemRepository listInstances:` plus the session's
in-memory objects) and runs in the caller's transaction, so the caller
decides when to commit and can batch it like any GemStone migration. Nothing
in normal operation depends on it; §4 item 5 has the details and the one
known gap (a method-local class's persisted instances).

## 3. What it buys, honestly

| | dynamic instVars | named slots (today's flag) | indexed slots |
|---|---|---|---|
| add attribute on edit | free | new class version + migrate | append a position |
| per-attribute storage | name OOP + value | value | value |
| attribute ceiling | 255 per object | none | none |
| class knows its attributes | no | yes | yes, ordered, with history |
| accessor pair speed | n/a | ~1 ns read | ~8 ns read + guard |
| GemStone equality index on the attribute | no | yes (named instVar path) | **no** (a path term cannot name a position today; James is asking the core team) |

The last row is the one real loss against named slots and the reason this is
scoped as the flag-on replacement rather than as "the" storage: if the
indexing rewrite admits positions it disappears; if not, a class that needs an
index on an attribute is the case for a named instVar and a migration.

## 4. Cuts

1. **Storage cut.** `PythonInstance` indexable; `ClassDefAst` stops declaring
   `___slot_*___` instVars and emits the layout instead; the installer
   compiles position-literal pairs from the layout for every name (inherited
   too); the three probes and the `__dict__` / `__getstate__` readers move
   from `instVarAt:` to guarded `at:`. Growth helper. Same flag, same fixture
   (`tests/python/inferred_slots.py`), `InferredSlotsTestCase` and
   `SlotsTestCase` both ways.
2. **Redefinition cut.** Layout merge on identity reuse (tombstones,
   re-added names, appends); subclass walk and recompile; drop the "reused
   class cannot grow an instVar" degradation. Extends
   `runCanonicalClassTest.gs` with a flag-on revision that adds an inferred
   name and reads it off a pre-edit instance.
3. **`__slots__` cut.** Done. Declared slots are positions too, keeping the
   strictness markers and the not-in-`__dict__` rule; a method-body `self.x`
   on a declared slot is the same accessor send as an inferred one, so the
   IR emitter's named-instVar leaf and its deferred-offset rewrite are no
   longer exercised by slots (the code stays for any other named instVar).
   `Class >> ___subclass___:` drops the mangled `___slot_*___` names for a
   `PythonInstance`-rooted class, so no such class has a named instVar and
   §8.3's residue is empty for the default and the flag-on path alike. The
   exception is a KERNEL-rooted class (Exception, dict, str, ...), whose
   indexed part is its content: there a declared slot stays a named instVar
   behind the same pair. Two of those roots (Exception, KeyValueDictionary)
   refuse a reflective `instVarAt:put:` (`_structuralUpdatesDisallowed`), so
   `___pySlotAt___:put:` stores through the pair's bytecode setter for them; a
   foreign `e.tag = v` on a slotted Exception subclass used to fail outright.
4. **Tombstones.** Done. `___grailMergedSlotLayout___:` writes `~name` for a
   position the rebuilt body no longer holds and revives one in place; the
   index table skips tombstones; the rebuild removes the class's own indexed
   pair for a retired name; `___grailPropagateSlotLayoutToSubclasses___`
   retires the name in a subclass that does not hold it itself
   (`___grailOwnSlotNames___`: its declared and own-inferred tables) and gives
   a subclass that does its own pair. `IndexedSlotRebuildTestCase` pins the
   drop, the revival, the per-object fallback and the two-subclass case.
5. **Compaction.** An explicit, developer-invoked maintenance operation, never
   an import side effect: `Cls ___grailCompactSlots___` rewrites the layout of
   the class and of every subclass without tombstones, recompiles the index
   tables and the indexed pairs, and moves every existing instance's values
   to the new positions. The subclasses come from the persistent canonical
   class registry (the session registry `__subclasses__` reads is per
   session, so a subclass whose module is not imported in this session would
   be missed by it); instances from a repository scan. Runs in the caller's
   transaction; the caller commits. A method-local class is not in the
   registry, and its persisted instances are not migrated — documented, not
   handled.
6. **Decide the default.** With the shape problem gone the flag can default
   on; that is a measurement (the flag-on CPython suite is not clean today:
   see the IR notes on `test_set`), not a design decision.

## 5. Risks and open questions

- **Format change.** Every committed Python instance in a dev stone becomes
  incompatible with its re-minted class the first time this installs. No
  users yet, so a fresh extent is the answer; say so in the PR.
- **Kernel readers of the indexed part.** Grepped: no Grail code tests
  `isIndexable` on a Python instance, `len()` goes through `__len__`,
  truthiness tests `isKindOf: Collection`; `printString` of an indexable
  `Object` shows only the class name. The three `_basicSize > 0` sites are on
  exceptions (frame slots) and unaffected. `copy` copies the indexed part,
  which is the right Python semantics.
- **Growth selector.** Probed on gs40: both `size:` and `_basicSize:` grow a
  pointer-indexable `Object` to an arbitrary size, filling with nil; `at:
  size+1 put:` grows by one; a gap raises 2003. A guarded read
  (`n <= _basicSize ifTrue: [at: n]`) measured 14 ns against 7 ns for the
  bare `at:`, so the guard is the whole cost of tolerating short instances.
  `copy` keeps the indexed part.
- **Frame width.** The pair's body is one primitive and a compare, no block
  temps; re-run test_richcmp's recursion tests and the traceback suite.
- **The MI merge and secondary-base positions** (§2) is the piece most likely
  to need iteration; `SubclassAttrShadowTestCase` and
  `MultipleInheritanceTestCase` are the gates.
- **A kernel-rooted slotted class on an edit.** Its declared slot is a named
  instVar, a reused class cannot grow one, so a slot ADDED to such a class by
  an edit gets the dynamic pair instead, and because the index table then
  answers 0 for it a strict class refuses a foreign store of that name. Rare
  (a `__slots__` on an Exception or dict subclass, then edited to add one) and
  the fix is known: let the strict check consult `___pyDeclaredSlotNames___`
  as well as the index table.
