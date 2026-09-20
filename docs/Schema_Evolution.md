# Changing a class whose instances are already in the database

*For Python developers using Grail with GemDB. The implementation is in
[Instance_Attribute_Indexed_Slots.md](Instance_Attribute_Indexed_Slots.md);
the review of it, with the proposals this page marks as **proposed**, is
[Schema_Evolution_Review.md](Schema_Evolution_Review.md). Every claim on this
page is one of the runnable examples in
[experiments/schema_changes/](../experiments/schema_changes/) or
[experiments/schema/](../experiments/schema/).*

In a relational or document store, changing what an object looks like is a
*migration*: a new column, an `ALTER TABLE`, a script that rewrites every
row. In Grail there is no table and no row format. Your objects are stored as
they are, your class is the only description of them, and when you edit the
class the instances already in the database follow the edit. This page says
exactly what "follow" means for each kind of edit, what it costs, and where
the edges are.

## 1. What Grail knows about your class

Grail stores an instance's attributes by *position*, not by name. Each class
carries a **layout**: the ordered list of attribute names its instances hold,
and the position of each. You can look at it:

```python
class Account:
    def __init__(self, owner):
        self.balance = 0
        self.owner = owner

Account.___pySlotLayout___()      # ['balance', 'owner']
```

An `Account` instance is a small array; `balance` is slot 1 and `owner` is
slot 2. Nothing else records the schema. There is no table definition to keep
in step, because the layout *is* derived from the class body.

**Which names get a position.** Every name the class's *own* methods assign
through `self`: `self.x = v`, `self.x += v`, `self.a, self.b = t`, `del
self.x`, `for self.i in …`, `with … as self.f`. Names under `__slots__` count
too. Not counted: dunder and sunder names; a name that is a `@property` of the
same class; anything at all in a class that defines `__setattr__`,
`__getattribute__` or `__delattr__`, or whose methods do not call their first
parameter `self`. Those classes work normally; their attributes are stored
per object rather than by position, and nothing on this page applies to them.

An attribute assigned from *outside* the class (`acct.note = "…"` in a
caller) is also per object. It is not part of the schema and survives every
edit untouched.

**The layout only grows.** Positions are handed out once and never reused by
a later edit. That single rule is what makes every scenario below work
without moving instances: an edit can add a position at the end, or stop
using one, but `balance` is slot 1 forever. A position an edit stops using is
*retired* and shows up as `~balance` in the layout. It is reclaimed only by
an explicit compaction (§3.4).

## 2. When the schema changes, and the one thing to remember

The schema changes when the edited module is **imported**. Grail notices the
source no longer matches what it deployed, rebuilds the class in place, and
the class object keeps its identity, so every instance in the database is
still `isinstance` of the very same class. `experiments/schema/` proves the
identity survives with `id(B)` recorded before the edit and compared after.

The rebuild is an ordinary part of that session's transaction. **If the
session that imported the edit does not commit, the rebuild is rolled back
with everything else**, and the next session to import the same source does
the rebuild again. Nothing is broken by that, but a change you thought was
deployed is not (`uncommitted_rebuild`). In a `./grail` script, put a
`gemdb.commit()` after the imports, or do the work inside
`with gemdb.transaction():`.

## 3. The changes

### 3.1 Add an attribute

```python
class Account:
    interest = 0.0                       # the default for instances that predate it
    def __init__(self, owner):
        self.balance = 0
        self.owner = owner
        self.interest = 0.0
```

`interest` is appended to the layout. An instance created before the edit is
*shorter* than its class, and a read of a position it does not have is
"absent", so `old.interest` falls through to the class attribute and answers
`0.0`. The first `old.interest = 0.05` grows that one instance in place.
Nothing is rewritten on import, and instances that are never touched stay at
their old size.

Without the class-level default, `old.interest` raises `AttributeError`,
exactly as CPython does for an instance that never had the attribute set.
Handle that the way you would in plain Python: a default, a `getattr`, a
property. It is a Python question, not a database one.
(`experiments/schema/`, with the full transcript in its README.)

### 3.2 Remove an attribute

Delete the assignment from your methods:

```python
class Account:
    def __init__(self, owner):
        self.owner = owner               # balance is gone
```

On import, `balance` is retired: the layout reads `['~balance', 'owner']`.
For an old instance, `acct.balance` raises `AttributeError`, `hasattr` is
false, `vars(acct)` no longer lists it. The 10 the instance was holding is
still physically there, at the retired position; it is just unreachable from
Python. That value is kept until you compact (§3.4).

**This is a departure from CPython**, where removing the assignment leaves an
old instance's `__dict__` entry readable. Grail's rule today is that the
class is the schema, so an attribute the class no longer assigns is gone.
The review proposes changing this so that a retired value stays *readable*
until compaction (see §5); until then, the value is safe but invisible.

Removing is *implicit*: nothing in the source says "drop balance", the
absence of an assignment says it. Two consequences worth knowing:

- **A refactor can retire a name by accident.** Moving `self.height = h`
  into a module-level helper that receives the instance under another name
  (`def _size(obj): obj.height = h`) means no method of the class assigns
  `self.height` any more. The name is retired, old instances hide their
  value, and new instances store `height` per object instead of by position.
  Behaviour is identical; the schema is not (`refactor_helper`).
- **A subclass that assigns the name keeps it.** If `Base` stops assigning
  `a2` but `Derived` assigns it, `Derived` keeps `a2` live at its position
  and old `Derived` instances read it unchanged (`move_in_hierarchy`).

### 3.3 Re-add an attribute you removed

Put the assignment back. The retired position **revives in place**, and with
it the values the old instances have been carrying: after the re-add,
`acct.balance` answers the 10 from before the removal (`remove_and_readd`).
So a removal followed by a re-add is lossless, at any distance in time, with
one exception: if a compaction ran in between, the position is gone and the
re-added name is a fresh position at the end. An old instance then reads it
as absent (`compact`, version 3).

### 3.4 Compact: the one step that loses data, and the only explicit one

Retired positions cost a slot per old instance, and they keep whatever object
was stored there alive. To reclaim them:

```python
gemdb.commit()                              # compaction scans the repository:
classes, instances = Account.___grailCompactSlots___()   # it needs a clean transaction
gemdb.commit()
```

This rewrites the layout of `Account` *and every class below it* without
tombstones, recompiles the accessors, moves every existing instance's values
to the new positions and shrinks each instance to its last set position. It
runs in your transaction and answers how many classes and instances it
touched. It is never done for you on import. Treat it as you would a
migration script: run it when you are sure the retired attributes will not
come back, on a quiet system, and commit once.

Two limits today: every instance moved is held in memory for the duration, so
a class with more instances than one transaction should carry is not handled;
and a class defined inside a function is not in the registry the compaction
walks, so its persisted instances are not moved.

### 3.5 Rename an attribute

To Grail today, `phone` → `phones` is a removal plus an addition, so **the
naive rename hides every old value**: the layout becomes
`['~phone', 'phones']`, and an old contact answers `AttributeError` for both
names, with nothing in `vars()` (`rename`, version 2). The value is retained,
as in §3.2, but no Python code can reach it.

It can be recovered, because a re-added name revives its position (§3.3).
The pattern is to keep *one* assignment to the old name in some method, and
to migrate each old instance lazily on first use:

```python
class Contact:
    phone = None                 # class default for an instance that never had one
    _phones = None

    def __init__(self, phones):
        self._phones = list(phones)

    @property
    def phones(self):
        if self.phone is not None:          # a pre-rename instance: one number
            self._phones = [self.phone]
            self.phone = None               # this assignment keeps 'phone' in the layout
        return self._phones if self._phones is not None else []
```

After this version is imported, `old.phones` answers `['555-1234']` and the
instance has been upgraded in place (`rename`, version 3). It works, and it
also handles the change of *shape* (one value to a list) that a rename often
carries. But the `self.phone = None` line is load-bearing and nothing says
so; delete it as dead code and every old phone number is hidden again.

**Proposed** (not implemented; see the review): declare the rename in the
class body and let Grail relabel the position,

```python
class Contact:
    __renamed__ = {"phone": "phones"}
```

which costs nothing per instance because the data does not move; only the
name of slot 1 changes. A rename that also changes shape would still use a
lazy normaliser like the property above, but without the hidden dependency.

### 3.6 Change what an attribute holds

`phone` holding a string becoming `phone` holding a list is not a schema
change at all to Grail: the position is the same, the objects in it are
whatever you put there. Old instances hold the old shape until something
rewrites them. Handle it with a lazy normaliser (a property that upgrades on
first read, as in §3.5) or an explicit pass over `gemdb.root` that rewrites
each instance and commits in batches. There is no type to declare and no
column to alter.

### 3.7 Move an attribute up or down the hierarchy

Works in both directions without touching instances. Moving `a2` from `Base`
into `Derived` retires it in `Base` and keeps it live in `Derived` at the
same position; moving it up appends it to `Base`, and a `Derived` that
already holds it keeps its position (`move_in_hierarchy`). Each subclass has
its own layout that *continues* its parent's, so a name can sit at position
2 in the parent and position 3 in a child that had already used slot 2; each
class compiles its own accessors for its own positions.

### 3.8 What still re-mints the class

Changing a class's **bases** produces a new class object, and existing
instances stay on the old one. That is the one edit for which you still need
a migration in the SQL sense: walk the old instances, build new ones, replace
the references, commit. Renaming a class, or moving it to another module, is
the same situation, because the class is found by its name and module.

A class rooted at a built-in (`Exception`, `dict`, `list`, `str`) stores its
attributes per object, not by position, since its indexed part is its
content. Its edits never move anything, and a `__slots__` name added to such
a class on an edit falls back to per-object storage.

## 4. Two things that can bite today

Both are measured in `dual_home` and are defects the review asks to fix, not
behaviour to rely on.

- **A name with two homes.** An attribute first assigned from outside the
  class (per object) that a later edit promotes to a position, or a retired
  name that a caller assigns while it is retired and that a later edit
  revives, ends up stored twice on the same instance. Reads take the
  position, `vars()` shows the other value, and `del obj.x` clears only the
  position, so the older value resurfaces where CPython would raise
  `AttributeError`. Until fixed: avoid assigning a retired name from outside
  the class, and after promoting a per-object attribute, assign it once
  through the class before relying on `del`.
- **A body that assigns nothing keeps everything.** If an edit removes
  *every* `self.x = …` from a class, the layout is not updated at all; the
  old names stay live and a new instance still stores them by position. If it
  removes only some, those are retired. The two outcomes should be the same.

## 5. Cheat sheet

| you want to | do | instances in the database | data loss |
| --- | --- | --- | --- |
| add an attribute | assign it in a method; give the class a default | untouched; read the default until assigned | none |
| remove an attribute | stop assigning it | untouched; the name reads as absent | none until you compact |
| bring a removed one back | assign it again | untouched; old values reappear | none (unless compacted) |
| reclaim removed attributes | commit, `Cls.___grailCompactSlots___()`, commit | every instance moved, in one transaction | the retired values, deliberately |
| rename | today: keep one assignment to the old name + lazy migrate (§3.5); **proposed** `__renamed__` | untouched | none, if the old name stays assigned |
| change the value's shape | lazy normaliser, or a batch rewrite | untouched until read or rewritten | none |
| move between parent and child | just move the assignment | untouched | none |
| change the bases / rename the class | a real migration: new instances, replace references | stranded on the old class | none, but manual |

Where every row says "untouched": the instance's bytes on disk do not change
on import. An instance grows only when *you* assign a position it lacks, and
shrinks only in a compaction. That is the whole difference from a migration.
