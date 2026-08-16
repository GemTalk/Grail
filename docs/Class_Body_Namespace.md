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

That closes `test_enum_dict_in_metaclass`.

## Stage 2, as shipped

The gate is gone: every class statement asks for a namespace. An ordinary class
pays one send and gets nil, storing exactly what it did before. The point is that
Grail's own metaclasses are **Smalltalk** — an enum's namespace comes from `Enum
class`, and there is no `metaclass=` keyword to carry it — so a compile-time gate
on that keyword could never reach an enum at all.

`Enum class` now supplies an `EnumDict`, so every enum body in the corpus runs
against one. Verified at 0 regressions across 71 modules, which is the number
that matters for a change with that reach.

One behaviour moved, and it is a fix: a reused member name is refused **where it
is written**, so the reported value is the one the mapping already holds.
`ClassBodyRebindingTestCase` had recorded the old answer as a deviation — the
metaclass hook noticed the clash only after the earlier store was gone, and named
the surviving value. CPython's own `test_dynamic_members_with_static_methods`
pins the correct reading (`'FOO_CAT' already defined as 'aloof'`), and that
expectation is updated with the reasoning.

## Stage 3, as shipped

`EnumDict.__setitem__` resolves an `auto()` **as it is assigned**, so the rest of
the body sees the number and `ALL = nonmember(A | B)` works. That closes
`test_using_members_as_nonmember`.

The marker is **mutated** — its `value` slot filled in, CPython's `v.value =
self._generate_next_value(...)` — and the mapping stores the number. The mutation
is not decoration: it is what keeps `dupe = third` an alias rather than a second
call to the generator, since the same marker object bound again now answers a
value.

Two things did **not** happen, deliberately.

The builder's resolution pass was **not retired**. It still runs for every path
with no class body — the functional API, `_convert_`, dynamically built classes —
and the fixture pins both spellings agreeing. What the namespace resolves, the
builder simply sees as an ordinary value.

The ordering rule was **not** reimplemented in `EnumDict`. CPython raises
`_generate_next_value_ must be defined before members` from `__setitem__`, keyed
on an `_auto_called` flag, but a `def` still bypasses the namespace (below), so
`EnumDict` never sees the generator arrive and cannot time it. The check stays
where it was, reading `___classBodyOrder___` — only its **evidence** changed.
It used to look for a member still holding an unresolved marker; resolving at
assignment takes that evidence away, so `EnumDict` records the names it actually
had to generate for (`_auto_named`) and the builder reads that instead. Closing
the `def` gap is what would let the rule move to where CPython keeps it.

A namedtuple value carrying markers is left to the builder, which unwraps and
rebuilds it. The namespace handles a bare marker and a plain tuple of markers.

## Stage 4, as shipped

`locals()` / `vars()` in a class body answers a **`ClassBodyLocals`** — the
snapshot it always answered, with the writes connected. `__setitem__` and
`__delitem__` route through `___classBodyDefinitionalStore___` /
`___classBodyDefinitionalDelete___`, the two entry points a class-body `if`
branch and a class-body loop already store through, so a write binds a class
attribute *and* is offered to the prepared namespace on the same terms as any
other class-body assignment.

Reads had to move with it. Grail resolves a class-body name statically, which is
exact only for a body whose bindings are all statements — so a body that calls
`locals()` now probes the class's own dynamically-bound names first, CPython's
LOAD_NAME order. The probe is gated on that call (the only way a name can be
bound behind codegen's back) and reads the class's **own** holder, never the
bases, since LOAD_NAME does not see inherited attributes.

Two class-body statement kinds that were **dropped whole** are emitted with it,
because `locals()['x'] = 43` is one of them: an assignment through a subscript,
and `del`. Both go out at their own source position, interleaved with the
attribute stores, since either can change what a later attribute value reads.

That closes `test_scope` (`FAIL/2 -> OK/0`) — `testClassAndGlobal` and
`testClassNamespaceOverridesClosure`, the two the stage-1 note listed as
needing the namespace.

Note what it does **not** buy: `test_ignore` and
`test_dynamic_members_with_static_methods` write into `vars()` in an **enum**
body, and their names still have to become members. The mapping now carries the
write to `EnumDict`; the member set is built from `___classBodyOrder___`, a
static list, which a dynamic name never joins.

## Stage 5, as shipped

A bare **expression statement** is emitted, joining the `try` / `for` / `while` /
`with` statements stage 4 rescued. It had been dropped for the same reason and
one step earlier: it binds no name at all, so the structural compile had nothing
to hang it on. A class-body `print(...)` produced no output and no error.

The one that matters is `vars().update({...})`, which is how a class body defines
members computed at runtime. Emitting the statement was only half of it — `dict`'s
mutators store with `at:put:` rather than through `__setitem__`, which is right
for a dict (CPython's `dict.update` does not call a subclass's `__setitem__`
either) and wrong for a namespace whose whole job is to be connected. So
`ClassBodyLocals` routes `update` / `_update:kw:` / `setdefault` / `pop` /
`popitem` / `clear` through `__setitem__` / `__delitem__`. Subscript assignment
already went that way, which is why *it* worked and `.update()` silently dropped
everything.

That closes `test_dynamic_members_with_static_methods` — so the paragraph above
is now half wrong, and worth reading for which half. A dynamic name **does** join
the member set, just not through `___classBodyOrder___`: `___grailBuildMembers:`
already sweeps the per-class `dynInstVars` holder for candidates the static list
missed, which it grew for names assigned under a class-body `if`. A `vars()`
write lands in the same holder and is picked up by the same sweep. What is still
true is the READ side, which is what `test_ignore` needs and still does not have:
`OneDay = day_1` names something no statement bound, and a statically scanned
body cannot resolve it.

Emitting the statement then exposed two things the drop had been hiding, both
about a comprehension in a class body:

- a **free name** there skips the class namespace (a comprehension is its own
  scope), so it is a global read. `isVariableIsDeclared:` goes class-body-blind
  when it climbs out of a `def` or a `lambda` but not out of a comprehension, so
  the doit fallback concluded a bare identifier would compile. Under `exec` it
  does not — the Smalltalk compiler rejects the whole `exec` with `undefined
  symbol` before running a line. Fixing that cured three pre-existing failures of
  the same family in `test_listcomps`
- a **walrus** there is a `SyntaxError` (PEP 572): it would bind in the scope
  enclosing the comprehension, which is a class namespace a comprehension cannot
  write to, so CPython refuses the program at compile time. Grail had no
  complaint only because the statement was dropped

`test_enum` `ERROR/9 -> ERROR/8`, `test_listcomps` `24 -> 21`,
`test_named_expressions` `37 -> 36`.

## Stage 6, as shipped

A class-body **`def`** and a **nested `class`** are offered to the namespace, at
their own source position. These were the two body statements that bind a name
without producing a value — a `def` compiles to a Smalltalk method, a nested
class is built and stored through `___classHolderAttrStore___` — which is why
they had no store to route and bypassed the mapping entirely. A prepared
namespace saw `a`, `b`, `c` and never `f` or `Inner`.

Both join `___classBodyOrderedRuntimeStatements___`, the source-order flush the
`global`/subscript/`del`/`if` statements already use, so the mapping sees the
body in the order CPython executes it. They are **not** emitted by that flush —
each already has its own emission path — only bound.

`object >> ___grailNsBind___:` reads the value **back off the class** rather
than taking one passed in: by the time it runs the method is compiled and the
nested class stored. That is also what makes a **decorated** `def` come out
right, and for free — the decorator has already rebound the name in the
dynInstVars holder, and the load reads the holder first, so the mapping gets the
decorated object rather than the raw method.

Two asymmetries with `___grailNsStore___:value:`, both deliberate:

- it does **not** read the value back out of the mapping onto the class. The
  method is already compiled, so a namespace that *transforms* a `def` is
  recorded and not reflected. Nothing can observe that until a metaclass is
  handed the mapping.
- a name the class cannot answer is **skipped**, not raised on. The emit is
  driven by the source, and a body can bind a name codegen does not install as
  a readable attribute; answering nothing is the narrower miss.

`async def` is bound by the same emit and is a **no-op today**: Grail does not
compile a class-body `async def` to an attribute at all (`hasattr(K, 'coro')` is
false), so there is nothing to offer. Listed anyway, because the omission would
be the wrong shape once that separate gap closes.

**This unlocks no CPython suite test on its own** — 0 regressions, 0
improvements across the full corpus, which for a change that fires on every
class definition is the number that matters. Its value is as the prerequisite:
every test in `test_super`'s `__classcell__` cluster reads a `def` back out of
the namespace its metaclass was given, so none of them can move until the
namespace has one. Stage 7 (dispatching `Meta.__new__`/`__init__` with the
mapping, and making `type(A)` answer the metaclass) is what turns it into
visible conformance.

`ClassBodyNamespaceTestCase` had recorded the absence as a known gap
(`testDefsAndNestedClassesBypassItWhichIsAKnownGap`); that expectation is
updated with the reasoning, as stage 3's was.

## What is still missing

- a metaclass's `__new__` / `__init__` are never dispatched, and `type(A)`
  answers `type` rather than the metaclass. Only `__prepare__` is called. This
  is now the load-bearing one: the mapping is faithful enough to hand over, and
  nothing hands it over. It is what the whole `__classcell__` cluster in
  `test_super` waits on, and it is a change of ownership rather than a hook — a
  `class` statement in Grail *creates a Smalltalk class*, where CPython lets the
  metaclass return anything at all, including `None`
- the `_auto_called` ordering rule still reads `___classBodyOrder___` rather
  than living in `EnumDict` where CPython keeps it. Stage 6 removed the reason
  it could not move (a `def` now reaches the mapping), so this is available
  work rather than blocked work
- a class-body `del` of a `def`-bound name is still dropped: removing the method
  would break a sibling assignment, which compiles to a `BoundMethod` naming its
  *selector* — flask's `NullSession`
- `locals()` answers a mapping bound to the class, but not the prepared
  namespace **object**: an alias held across statements reports the names bound
  up to the call rather than growing with the body. Same root cause — a body is
  scanned, not executed into a mapping
- an inherited PYTHON metaclass is not asked, per the note above

## Scale

Stages 1 and 2 touched every class definition in the corpus, so they were tier 2
by `.claude/CLAUDE.md`'s rule and each took a full CPython suite run. Stage 3 did
not: it is confined to `EnumDict` and `PyEnumTypes`, so it is tier 1 — the
machinery it needed was already in place and paid for. Stage 4 moved codegen
again and went back to tier 2, and so did stages 5 and 6. Stage 7 (metaclass
dispatch) is tier 2 by the same rule, and is the widest of them: it changes who
owns the object a `class` statement produces.
