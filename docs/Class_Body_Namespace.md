# The class-body namespace (`__prepare__`)

Grail has no class-body namespace. A class body is *scanned* for the names it
binds, and each name becomes a class-side accessor pair whose value is stored
once, after the scan. CPython instead *executes* the body against a mapping and
hands that mapping to the metaclass.

This is the single largest remaining blocker in `test_enum`, and it is not a bug
that can be fixed where it shows up. This note records what it costs, why the
obvious cheap fixes do not work, and what an implementation has to change — so
whoever picks it up does not have to rediscover the dead ends.

## What it blocks

Five `test_enum` failures, out of the 13 remaining as of PR #361. Each needs the
namespace for a different reason, which is worth keeping separate — a partial
implementation will unlock some and not others.

| Test | What it needs |
| --- | --- |
| `TestEnumDict.test_enum_dict_in_metaclass` | `__prepare__` called, and each assignment *statement* routed through the returned mapping, so a duplicate name raises **at the second assignment** |
| `TestSpecial.test_ignore` | `vars()` inside a class body returning the live namespace, plus `_ignore_` |
| `TestSpecial.test_dynamic_members_with_static_methods` | the same `vars()` mapping, written to in a loop |
| `TestSpecial.test_using_members_as_nonmember` | `auto()` resolved **at assignment time**, so `A \| B` later in the body operates on ints rather than on unresolved markers |
| `TestSpecial.test_extra_member_creation` | a metaclass whose `__prepare__` returns a custom mapping that manufactures members |

`EnumDict` — the mapping the first of these prepares — already exists
(`src/smalltalk/Python/EnumDict.gs`, PR #343). It is complete and tested
standalone; it has simply never been used as a namespace, because nothing can
hand it one.

## Why there is no cheap slice

Three approaches were investigated and each fails for a structural reason, not
for want of effort.

**Mirror each assignment into the namespace, keyed by name.** This is what
stage 1 does, and it works — see below. An earlier revision of this note claimed
it could not, on the grounds that `classBodyAttributes` collapses to one pair per
name. That was wrong, and worth correcting rather than deleting: the collapse is
in `attrAssignPos`, which only decides the *bound-names context* an emit runs
under. `classBodyAttributes` itself keeps one pair per (statement, target) in
source order, so `a = 1; a = 2` already emits two stores and evaluates both
right-hand sides. Verified by side effect, not by reading.

**Gate the new path on an explicit `metaclass=` keyword**, to contain the blast
radius at compile time. It misses inherited metaclasses: `class Sub(Base)` where
`Base` already has one gets `Meta.__prepare__` in CPython and no keyword to key
off here. Stage 1 accepts that deliberately — the hole is narrower than it looks,
because Grail does not install a Python metaclass as the Smalltalk metaclass, so
a subclass has nothing to ask either way. Closing it means fixing that first.

**Populate the namespace after the body runs**, then hand it to the metaclass.
Every one of the five tests observes the namespace *during* the body — a
duplicate raising, `vars()` being written to, `auto()` resolving before the next
statement reads it. After-the-fact is too late for all five.

## What an implementation has to change

The work is in `src/smalltalk/PythonAst/ClassDefAst.gs`, and it is a change of
shape rather than of detail: class-body emission has to go from *scan for names,
emit one store per name* to *execute statements in order against a namespace*.

The sites that emit class-body bindings today, all of which would have to route
through the namespace to be faithful:

- the plain attribute-value loop (`classAttrs do:` — one store per name, in
  `attrAssignPos` order)
- the chained-assignment special case beside it (`a = b = expr`, which
  deliberately emits the RHS once and reads the first target back)
- nested `class` statements, stored through `___classHolderAttrStore___`
- top-level `if` statements in the body, whose branch assignments store per-class
  dynamic attrs
- `def` statements, which compile to methods rather than to stores
- decorated `def`s, whose rebinding goes to the dynInstVars holder

A faithful namespace sees all of them, in source order, because CPython's
namespace does. A first stage that covers only plain assignments would unlock
`test_enum_dict_in_metaclass` and nothing else, and would leave the namespace
visibly incomplete to any `vars()` caller — worth doing only if it is labelled
as a stage rather than as support.

Two properties to preserve, both of which have bitten previous changes here:

- **Values are evaluated once.** The chained-assignment path exists because
  re-emitting the RHS per target re-runs side effects; a namespace write plus an
  accessor store must not become two evaluations.
- **Canonical classes are rebuilt cold.** A warm canonical-class probe skips the
  guarded region entirely (see `Persistent_Modules_and_Classes.md`), so anything
  emitted inside it — the metaclass hook, decorators, `__init_subclass__` — does
  not re-run. The namespace belongs inside that region with them.

## Stage 1, as shipped

`__prepare__` is called for a class statement that names a metaclass, and every
class-body **assignment** is routed through the returned mapping in source order
— body level and inside a compound statement (`with`, `if`, loops) alike. Two
places do it: the attribute-value emit in `ClassDefAst`, and
`object >> ___classBodyDefinitionalStore___:put:`, which both the single and the
chained runtime store already funnel through. `EnumDict(cls_name)` gained the
constructor CPython gives it, which a `__prepare__` returning `EnumDict(cls)`
needs and which the inherited dict constructor was refusing.

That closes `test_enum_dict_in_metaclass`. The other four still need what stage 1
does not do:

- `def` and nested `class` bindings bypass the namespace — each has its own
  emission path
- `vars()` inside a body answers a plain dict, not the live namespace, which is
  what `test_ignore` and `test_dynamic_members_with_static_methods` write into
- `auto()` is not resolved at assignment time, which `test_using_members_as_nonmember`
  needs — the read-back is already in place for it, but no namespace exists for a
  plain `class E(Flag)` since none names a metaclass
- an inherited metaclass is not asked, per the note above

## Scale

This touches every class definition in the corpus, so it is tier 2 by
`.claude/CLAUDE.md`'s rule and wants the full CPython suite before any PR. It is
realistically several sessions of work, not one, and it should be staged with a
full-suite run at each stage rather than landed at once.
