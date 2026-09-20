# Class attributes: one home (design sketch)

**Status:** cuts 1 and 2 (§4) implemented 2026-09-15/16 on branch
`feat/class-attr-single-home`. Every class attribute, the body's own and the
synthetic `__module__` / `__doc__` / `_fields` / `___annotatedFields___` /
`__annotations__`, is a holder entry behind an accessor pair; every generated
class declares exactly one classInstVar; `___canonicalSlotsSatisfied___` and
`___inheritClassAttrs___` are deleted; `vars(cls)` and `del cls.x` were fixed
on the way. The instance side is the separate design in
[Instance_Attribute_Indexed_Slots.md](Instance_Attribute_Indexed_Slots.md).

**Related:** [Python_Class_Attribute_Namespaces.md](Python_Class_Attribute_Namespaces.md)
(the three homes and the `name` clobber), [Persistent_Modules_and_Classes.md](Persistent_Modules_and_Classes.md)
D2 and §8.3 (identity reuse, and the one case that still strands instances),
[Persistence_Design_History.md](Persistence_Design_History.md) §B (the reconciliation
table), [Concurrency.md](Concurrency.md) (why runtime class-attribute writes are
session-local).

---

## 1. The problem, stated from the code

A Python class attribute (`class C: x = 1`) has **three homes** in Grail today,
and which one holds a given name is decided at emit time by the *shape* of the
class body rather than by the name:

| home | what lands there | where |
|---|---|---|
| **A. accessor pair over a classInstVar** on the metaclass, category `Grail-Class Attrs` (`x ^ x` / `x: v x := v`) | a name assigned **unconditionally** in the class body | `ClassDefAst` ~L1195-1250; the slot is declared in `classInstVarNames:` |
| **B. the `___dynInstVars___` holder** (an `Object new` in a classInstVar; its dynamic instVars are the dict) | conditional bindings (`if` in the body), `locals()` writes, nested classes, a decorator's rebinding, `setattr(cls, …)` on a non-canonical class, values merged from MI secondary bases, everything `type(name, bases, ns)` and the functional Enum API store | `___classHolderAttrStore___:put:`, `___classChainAttrLookup___:` |
| **C. the session overlay** (`SessionTemps` → `GrailClassAttrOverlay`) | runtime `Cls.x = v` on a canonical class | `___classAttrOverlayStore___:name:value:` and `…Lookup…` |

Home C is deliberate and stays: a runtime store on a shared committed class must
not dirty it (write-write conflicts across sessions, session objects swept into
the next commit). Homes A and B are the accident, and they cost five things:

1. **Re-mint on an added attribute — the stranding case.** Home A needs a
   classInstVar per attribute. A metaclass can never be made modifiable (it has
   exactly one instance, the class), so a reused class cannot grow a slot.
   `importlib ___canonicalSlotsSatisfied___:names:` therefore *declines*
   identity reuse when an edit adds a class attribute, the class re-mints, and
   every persisted instance stays on the old class. This is §8.3's "largest
   missing piece". It is the **only** shape change a plain class edit can cause:
   instance attributes are dynamic instVars and need no slot.
2. **Snapshot inheritance.** Because a classInstVar is per-class storage, a
   subclass that does not redeclare `x` has a nil slot, so
   `importlib ___inheritClassAttrs___:exclude:` *copies* the parent's value into
   the subclass's slot at build time. A later committed change to `A.x` is
   invisible through `B.x` on the committed path, while the overlay path walks
   the chain. Two different inheritance semantics for one Python concept.
3. **Reserved-name mangling.** A classInstVar named `name` coalesces with the
   kernel `Behavior` slot and overwrote the class's real name (the Django
   `cached_property` crash on 4.0 MR #6). The fix, `___cattr_name___` backing
   slots, exists only because home A is a slot.
4. **Home guessing.** `___classBodyDefinitionalStore___:put:` must probe for a
   setter to decide whether a conditional binding goes to A or B;
   `___classBodyDefinitionalDelete___:` looks in three places; the loader's
   Behavior branch has an "own holder beats inherited accessor" pre-check
   (`___ownDynInstVarHas___:`) purely because A and B can disagree about the
   same name across a subclass boundary.
5. **Read-order duplication.** The MRO-versus-method rule ("a nearer class's
   compiled method outranks an ancestor's stored attribute") is implemented
   separately for the holder walk, the overlay walk, and the accessor perform.

## 2. The proposal

**Keep the accessor pair as the protocol. Move the value into the holder.**

The pair is load-bearing as an *interface*: the loader tells a data attribute
from a method by the pair's category; `___classBodyValueAt___:`,
`___declaresOwnClassAttr___:`, `___reversedBlocked___:`, `__set_name__`,
`GRAIL_DIRECT_CALLS`' setter diversion and `GRAIL_ATTR_ACCESSORS`' compiled
reads all key on it; and `PyEnumTypes.gs`, `datetime_module.gs`, `functools.gs`
and `type.gs` hand-write pairs in the same category on Smalltalk-defined
classes. None of that changes. What changes is the two-line body ClassDefAst
generates:

```smalltalk
x
	^ self ___classAttrOwnOrInherited___: #x        "raw value: own holder, then superclass holders"

x: ___1
	(object @env0:___grailClassAttrSetterDiverts___) ifTrue: [ ... unchanged ... ].
	self ___classHolderAttrStore___: #x put: ___1
```

and `classInstVarNames:` shrinks to the one slot every class already declares,
`___dynInstVars___`. Consequences, each one a deletion:

- `___canonicalSlotsSatisfied___:names:` is always true → **delete it and the
  re-mint branch.** Identity is reused whenever the superclass matches. An added
  class attribute compiles a pair and stores into the holder; existing instances
  see it on the next read because they never left the class.
- `___inheritClassAttrs___:exclude:` → **delete.** The getter walks the
  superclass chain at read time, so `A.x` is one value with one owner, as in
  CPython. (The MI copy in `___mergeSecondaryBases___` stays: secondary bases
  are not on the Smalltalk superclass chain, so a walk cannot reach them.)
- `___classAttrBackingSlotFor:reserved:` and the reserved-name set → **delete.**
  There is no slot to coalesce. The env-1 selector `name` never collided with
  env-0 `Behavior>>name`; only the slot did.
- `___classBodyDefinitionalStore___:put:` → one store. It still fires the pair's
  setter when the name has one (so DIRECT_CALLS dispatch installation keeps
  working), and the setter lands in the same holder the fallback does. Deletion
  looks in two places (namespace, holder) and removes the pair.
- The loader's `___ownDynInstVarHas___:` pre-check → **delete.** With one home
  the ordering question it answers no longer exists.
- `___grailResetClassNamespace___` keeps its shape (remove own pairs, empty the
  holder); it now clears one store instead of reconciling two.

**Semantics after the change**

| Python | before | after |
|---|---|---|
| edit adds `added = 7` to a deployed class | re-mint, instances stranded | identity kept, `old_instance.added == 7` |
| edit drops `doomed` | identity kept, AttributeError (D2) | unchanged |
| `class B(A): pass`, then a committed change to `A.x` | `B.x` answers the build-time copy | `B.x` answers the new `A.x` |
| `class B(A): x = 2` | own slot, own pair | own holder entry, own pair |
| runtime `Cls.x = v` on a canonical class | overlay (D3) | unchanged |
| `del Cls.x` | overlay, then holder | unchanged |
| `class C: name = None` | mangled slot | plain holder entry |
| `vars(C)` / `C.__dict__` | holder ∪ pair values ∪ methods ∪ overlay | holder ∪ methods ∪ overlay (the pair values *are* holder entries now) |

## 3. Design decisions and recommendations

**D1. Holder representation: keep the dynamic-instVar PROTOCOL, not the
`Object new`.** Every reader speaks that protocol (`___classChainAttrLookup___:`,
`___classDict___`, `___grailEmptyClassHolder___`, `type()`, the functional
Enum API, the MI merge), and it is insertion-ordered, which
`test_namespace_order` depends on. But a GemStone dynamic instVar caps at 255
per object, and the first full CPython run found the case the classInstVars
had been absorbing: `test_listcomps.test_code_replace_extended_arg` runs a
body with 300 assignments in class scope. So the holder is
[GrailClassAttrHolder](../src/smalltalk/Python/GrailClassAttrHolder.gs), which
answers the same six messages over an unbounded ordered dictionary; no reader
changed. That also removes the 255-attribute ceiling from every class, which
`Object new` never had a way around.

**D2. Getter answers the RAW stored value.** The loader applies descriptor
binding to whatever a pair's perform answers (`___descriptorGet___:` /
`___classDescriptorGet___:` at the pair-read sites). If the getter itself went
through `___classChainAttrLookup___:` the value would be unwrapped twice. So the
walk the getter uses is a new, minimal `___classAttrOwnOrInherited___:` that
returns what the holder holds and applies no descriptor protocol. One send, no
block temps: the loader's frame width is load-bearing for test_richcmp's
recursion depth, and the pair getter sits inside that path.

**D3. The synthetic slots move too, so the metaclass shape is constant.**
`__module__`, `__doc__`, `_fields`, `___annotatedFields___` and `__annotations__`
are classInstVars today, some declared only when the body has annotations, so a
first annotation on a deployed class would still re-mint. Give them the same
holder-backed pair and the declared shape becomes exactly
`#(___dynInstVars___)` for every class from every creation site
(`ClassDefAst`, `type()`, functional Enum, `json_module`). This can be a
separate cut after the user-attribute cut is green.

**D4. Holder initialisation moves to right after `___subclass___:`.** Today it
is conditional and late (a nested class or class-body `if` may have forced it
into existence earlier). With every class-body store landing in the holder it
must exist before the first attribute value is evaluated, unconditionally.

**D5. Read order in the loader's Behavior branch becomes:** overlay → holder
chain with the MRO-versus-method rule → compiled methods. The hand-written
pairs on Smalltalk-defined classes are still reached through the existing
accessor-perform branch, which stays for them.

## 4. Cuts

**Cut 1 — user class attributes to the holder (tier 2).**
`ClassDefAst`: pair bodies as in §2; `allClassInstVars` loses the per-attribute
names; holder init first (D4); delete the reserved-set computation.
`Object.gs`: add `___classAttrOwnOrInherited___:`; remove the
`___ownDynInstVarHas___:` pre-check; `___classBodyDefinitionalStore___/Delete`
to one home. `importlib.gs`: delete `___canonicalSlotsSatisfied___:names:` and
`___inheritClassAttrs___:exclude:` and their call sites. Tests:
`runCanonicalClassTest.gs` revision 3 flips from "reuse is declined, so the
class RE-MINTS" to "identity KEPT" and gains "an instance created under revision
2 reads `added`"; `SubclassAttrShadowTestCase`, `AttributeInheritanceTestCase`,
`ClassAttrDictSubclassTestCase`, `ClassmethodCreationNoInvokeTestCase`,
`runOverlayReuseTest.gs`, `run_concurrent_import_test.sh` phase 2. New SUnit:
a class rebuilt with an added attribute while an instance exists, and a
subclass reading a parent's class attribute changed after the subclass was
built. Full CPython suite plus the regression gate, quoting the 0-regressions
line.

**Cut 2 — synthetic slots to the holder (D3), tier 2.** Constant metaclass
shape; `type()` and the functional Enum API stop compiling their own holder
pairs because nothing else is declared any more.

**Cut 3 — documentation.** `Python_Class_Attribute_Namespaces.md`'s leak
section becomes history; `Persistent_Modules_and_Classes.md` D2 loses its
"cannot grow one" clause and §8.3 shrinks to the instance-side shape cases;
`Persistence_Design_History.md` §B records why the added-attribute row moved;
the talk notes §4.9.

## 5. What this does NOT fix

Instance-side shape changes: when this was written, a class that declares
`__slots__`, or one built with `GRAIL_INFERRED_SLOTS` on, had real named
instVars, and adding one still needed a new class version. That was the
territory of the indexable-storage proposal, taken as a separate decision and
since done ([Instance_Attribute_Indexed_Slots.md](Instance_Attribute_Indexed_Slots.md)):
both kinds of slot are now positions in the instance's indexed part. With this
change the *default* path (dynamic instance attributes) has no shape at all.

### 5.1 The per-class accessor methods, and why they cannot be hoisted

Every generated class still compiles its own accessor pair for each class
attribute, including the synthetic `__doc__` / `__module__` /
`___dynInstVars___` whose source is byte-identical on every class. In Smalltalk
the *storage* must be per-class, but the *method* need not be: one pair on
`PythonInstance class` would serve every descendant and take six compiled
methods off every generated class. **That hoist does not work, and the reason is
this design's own foundation.**

Grail models a class's `__dict__` as *that class's own metaclass method
dictionary*, and own-ness is tested explicitly, never inferred:
`object class >> ___grailClassAttrAccessorValue___:name:`
([Object.gs:2088](../src/smalltalk/Python/Object.gs#L2088)) and
`___classBodyDefinitionalDelete___:`
([Object.gs:4834](../src/smalltalk/Python/Object.gs#L4834)) both require
`whichClassIncludesSelector: ... == meta`, and the `__dict__` builders iterate
`(meta methodDictForEnv: 1) keys`
([Object.gs:4916](../src/smalltalk/Python/Object.gs#L4916),
[4992](../src/smalltalk/Python/Object.gs#L4992)). An inherited pair is
deliberately invisible to all four. So hoisting compiles, and the slots still
read, but the names vanish from every class's `__dict__`: `Cls.__module__`
answers nil, membership tests go False, and `inspect.classify_class_attrs`
raises `UnboundLocalError` when its MRO walk finds no home -- cascading into
pydoc and the enum docs. Measured 2026-09-10 on a throwaway prototype: 50
failures (5 fail / 45 error) against a 6625/6625 control on the same worktree.

**And it would not be worth fixing.** Same prototype, 500 classes churned per
sample, `System _tempObjSpaceUsed` after two `_vmMarkSweep` passes:

| class shape | before | after | delta | metaclass methods |
| --- | --- | --- | --- | --- |
| `class Empty(object): pass` | 8590.7 B | 7182.7 B | -16.4% | 8 -> 2 |
| class with 2 methods | 16735.3 B | 15535.3 B | -7.2% | 16 -> 10 |

That is ~200 bytes per removed compiled method -- the bare cost of a
`GsNMethod` -- and nothing else in the 8.6-16.7 KB retained per class is
attributable to the six. The share shrinks as a class gains methods, and the
`GsMethodLookupCache` / `Array` / `SymbolSet` old-gen bulk that actually
dominates per-class retention is untouched. (Those samples were taken on
3.7.5, before support for it was dropped; the quantity they measure is the
bare size of a `GsNMethod`, so the conclusion does not turn on the kernel. A
4.0 measurement of the same shape put `class Empty: pass` at 9,376 B, in the
same neighbourhood.)

**If anyone retries it,** the guard must test
`<cls> class superclass allInstVarNames includes: #'__doc__'`, *not*
`whichClassIncludesSelector:`. The metaclass chain terminates at `Object`, so a
selector probe for `#__doc__` finds the instance-side `object >> __doc__` and
answers non-nil for every class -- a guard that never fires.

## 6. Risks

- **Loader frame width.** The pair getter is on the class-attribute read path.
  Keep it to one send; re-run test_richcmp's recursion tests and the traceback
  suite before and after.
- **Read cost.** A class-attribute read through a pair becomes a dynamic-instVar
  probe (~11 ns measured on gs40) plus one probe per superclass level on a miss,
  instead of a compiled instVar read. Measure with the existing
  `scripts/benchDynamicInstVar.gs` shape; if it matters, cache nothing — the
  overlay design already rules out per-session caches on class attributes.
- **Enum.** `___grailBuildMembers:` reads class-body values through
  `___classBodyValueAt___:` (a perform of the pair), so it keeps working; but
  `PyEnumTypes.gs` is the largest consumer of the category and needs its own
  targeted run (`test.test_enum`).
- **Dataclass and `__set_name__`.** Both walk `attrNames` and perform pairs;
  unchanged in protocol, but they are the first things that break if a pair's
  getter ever answers something other than the raw stored value (D2).
