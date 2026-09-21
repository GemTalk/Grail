# Changing a class whose instances are already in the database

*For Python developers using Grail with GemDB. The implementation is in
[Instance_Attribute_Indexed_Slots.md](Instance_Attribute_Indexed_Slots.md);
the review of it, with the proposals this page marks as **proposed**, is
[Schema_Evolution_Review.md](Schema_Evolution_Review.md), and the decisions
behind the current behaviour, with the cuts still to come (a declared rename,
`gemdb.schema`), are in [Schema_Evolution_Design.md](Schema_Evolution_Design.md).
Every claim on this
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

import gemdb.schema
gemdb.schema.layout(Account)
# [{'name': 'balance', 'position': 1, 'kind': 'assigned'},
#  {'name': 'owner',   'position': 2, 'kind': 'assigned'}]
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
assigning one, but `balance` is slot 1 forever. An edit never removes a
name. Removing one is an explicit step you take by name (§3.4), and it
leaves a hole, shown as `~balance`, that only a compaction reclaims.

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

On import, nothing happens to the data. The layout still reads
`['balance', 'owner']`, an old instance still answers `acct.balance == 10`,
`vars(acct)` still lists it, and a caller can still assign it. The class has
merely stopped assigning it, so a *new* `Account` never gets one. This is
what CPython does too: removing the assignment leaves an old instance's
`__dict__` entry alone (`remove_and_readd`, version 2).

So removing an assignment is not a deletion. It is a signal about new
instances, and it is safe to make by accident: moving `self.height = h` into
a module-level helper that receives the instance under another name
(`def _size(obj): obj.height = h`) changes nothing for old or new instances,
because the helper's store lands in the same position (`refactor_helper`).
Likewise, if `Base` stops assigning `a2` and `Derived` assigns it instead,
no layout changes (`move_in_hierarchy`).

Deleting the values is a separate, explicit step, by name, in §3.4.

### 3.3 Re-add an attribute you removed

Put the assignment back. The layout does not change, because the name never
left it, and `acct.balance` still answers the 10 it always had
(`remove_and_readd`, version 3). The one exception is a name you *dropped*
in between (§3.4): the drop freed the values, and the re-added name is a
fresh position, so an old instance reads it as absent (`compact`, version 3).

### 3.4 Drop, then compact: the two explicit steps, and the only ones that lose data

An attribute nobody assigns any more still costs a slot per instance and
keeps whatever object is stored there alive. To get rid of it, first stop
assigning it (§3.2) and import that, then **drop** it by name:

```python
import gemdb.schema
gemdb.commit()                                  # the scan needs a clean transaction
gemdb.schema.drop(Account, "balance")           # {'classes': 1, 'instances': 12034}
```

The drop nils `balance` on every instance of `Account` and of every class
below it, and turns its position into a *hole*. From then on the name is
unknown to the class: `acct.balance` raises, `vars()` does not list it, and
assigning it from outside makes an ordinary per-object attribute. It is
refused while any method still assigns the name, because the next instance
would bring it straight back. It commits itself every thousand instances, so
a large class is handled and an interrupted run is safe to repeat: nothing
moves, so a re-run finds fewer values and finishes (`compact`, version 2).

A hole costs one empty slot per instance. To reclaim holes:

```python
gemdb.commit()
gemdb.schema.compact(Account)
```

This rewrites the layouts without holes, recompiles the accessors, moves
every existing instance's values to the new positions and shrinks each
instance. Unlike the drop it cannot be batched, because every instance has
to move together or a read would find the wrong position, so it is the step
to run on a quiet system. Neither step is ever done for you on import.

**Which attributes are worth dropping** is what `gemdb.schema.report()`
answers, across the whole repository:

```python
gemdb.schema.report()
# [{'class': 'billing.Account', 'instances': 12034,
#   'attributes': [{'name': 'balance', 'kind': 'unassigned', 'holding': 12034}]}]
```

`holding` is how many instances still carry a value, so an attribute nothing
assigns and nothing holds is free to drop, while a large `holding` is a
deletion to think about. Grail deliberately does not turn an unused
attribute into an import error: the rebuild happens in whichever session
imports the edited source first, which may be production, and a refactor
should not halt an application.

One limit today: a class defined inside a function is in neither registry
these steps walk, so its persisted instances are not touched.

### 3.5 Rename an attribute

Rename it by name, and nothing is copied:

```python
gemdb.commit()
gemdb.schema.rename(Contact, "phone", "phones")   # {'classes': 1, 'instances': 0}
```

That is a *relabel*, and it is what you get when `phones` has no position
yet: the position keeps its data and changes its name, so however many
contacts there are, none is touched. Renaming *before* shipping the code
that assigns `phones` is therefore the cheap order, and that code's import
then finds the name already in the layout holding the values.

If the code ships first, its import appends `phones` as an empty position
while `phone` survives with the data, and the same call *moves* every value
across and leaves `phone` a hole (`rename`, version 3). It refuses if any
instance has a value under both names rather than choosing one.

Either way it refuses while a method still assigns `phone`, so the edit that
stops assigning it comes first.

**Without renaming**, the edit alone is an addition beside a name the class
stopped assigning: the layout becomes `['phone', 'phones']`, an old contact
still answers `c.phone`, and `c.phones` raises because that instance never
had one (`rename`, version 2). Nothing is lost, but nothing migrated either.
That is the case for a migration in plain Python, lazily on first use, which
is also how to handle the change of *shape* a rename often carries:

```python
class Contact:
    _phones = None

    def __init__(self, phones):
        self._phones = list(phones)

    @property
    def phones(self):
        old = getattr(self, "phone", None)
        if old is not None:                 # a pre-rename instance: one number
            self._phones = [old]
            del self.phone
        return self._phones if self._phones is not None else []
```

After this version is imported, `old.phones` answers `['555-1234']` and the
instance has been upgraded in place, with `phone` deleted from it (`rename`,
version 3). Once every instance has been touched, drop `phone` (§3.4).

**Proposed** (cut 3 of the design note, not implemented): declare the rename
in the class body, so it applies on import without a separate call,

```python
class Contact:
    __renamed__ = {"phone": "phones"}
```

which costs nothing per instance because the data does not move; only the
name of slot 1 changes. A rename that also changes shape would still use a
lazy normaliser like the property above.

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

## 4. One name, one home

An attribute first assigned from *outside* the class is stored per object.
If a later edit makes a method assign it, the name gets a position, and an
old instance holds the value in the old place until something writes the
new one. Reads still find it, and the first store or `del` through the
attribute moves the name into its position and removes the per-object copy,
so `vars()` and the attribute always agree and `del` leaves nothing to
resurface (`dual_home`). A store made inside a method leaves the old copy
behind unread; it is invisible and goes with the next `del`.

## 5. Cheat sheet

| you want to | do | instances in the database | data loss |
| --- | --- | --- | --- |
| add an attribute | assign it in a method; give the class a default | untouched; read the default until assigned | none |
| stop using an attribute | stop assigning it | untouched; old values still read | none |
| bring one back | assign it again | untouched; nothing ever left | none |
| delete an attribute's values | stop assigning it, import, then `gemdb.schema.drop(Cls, "x")` | every instance nilled at that position, in batches | the values, deliberately |
| reclaim holes | `gemdb.schema.compact(Cls)` | every instance moved, in one transaction | none |
| rename | `gemdb.schema.rename(Cls, "old", "new")`; **proposed** `__renamed__` | untouched for a relabel | none |
| change the value's shape | lazy normaliser, or a batch rewrite | untouched until read or rewritten | none |
| move between parent and child | just move the assignment | untouched | none |
| change the bases / rename the class | a real migration: new instances, replace references | stranded on the old class | none, but manual |

Where every row says "untouched": the instance's bytes on disk do not change
on import. An instance grows only when *you* assign a position it lacks, and
is written by Grail only in the `gemdb.schema` operations you run by name.
That is the whole difference from a migration.
