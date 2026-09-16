# Instance attributes as indexed slots (design)

**Status:** proposal, 2026-09-16, not implemented. Follows
[Class_Attribute_Single_Home.md](Class_Attribute_Single_Home.md), which did the
class side. This is James's indexable-class proposal, scoped as the replacement
for the **inferred-slot** storage behind `GRAIL_INFERRED_SLOTS`, not for the
default dynamic-instVar storage.

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

**Compaction** is optional and separate: rewrite the layout without
tombstones, recompile the pairs, and shift every instance's slots. It is an
`allInstances` scan and must be batched like any GemStone migration. Nothing
in normal operation depends on it.

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
3. **`__slots__` cut.** Declared slots become positions too, keeping the
   strictness markers. Then no Python-defined class has a named instVar, and
   §8.3's residue is empty for the default and the flag-on path alike.
4. **Decide the default.** With the shape problem gone the flag can default
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
- **Growth selector.** Which kernel selector grows a pointer-indexable object
  by more than one (`size:`? `_basicSize:`?) is to be probed; the accessor
  needs exactly one.
- **Frame width.** The pair's body is one primitive and a compare, no block
  temps; re-run test_richcmp's recursion tests and the traceback suite.
- **The MI merge and secondary-base positions** (§2) is the piece most likely
  to need iteration; `SubclassAttrShadowTestCase` and
  `MultipleInheritanceTestCase` are the gates.
