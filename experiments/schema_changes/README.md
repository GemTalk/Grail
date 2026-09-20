# Schema changes, one scenario per directory

Each directory is one class edited across versions of one module, `v1.py`,
`v2.py`, `v3.py`, run in that order, **one session each**, against the same
repository. Version 1 commits an instance; the later versions are the edit and
what the committed instance looks like afterwards. Every line that prints is
also an `assert`, except in `dual_home/`, which demonstrates two defects and
prints what happens instead of pinning it.

The narrative that goes with these is
[docs/Schema_Evolution.md](../../docs/Schema_Evolution.md) (for Python
developers) and [docs/Schema_Evolution_Review.md](../../docs/Schema_Evolution_Review.md)
(the design review, for Grail implementors). The *add an attribute* case is
the older demo next door, [experiments/schema/](../schema/).

| scenario | the edit | what it shows |
| --- | --- | --- |
| `remove_and_readd` | drop `balance`, then assign it again | a dropped name is retired (`~balance`), reads as absent; re-adding revives its position and the old value |
| `compact` | drop `raw`, compact, re-add `raw` | compaction is the one lossy step, explicit, commit-compact-commit; a name re-added afterwards is a new position |
| `rename` | `phone` → `phones` | the naive rename hides the old value with no Python route to it; the recovery keeps one assignment to the old name alive |
| `move_in_hierarchy` | `a2` moves from `Base` into `Derived` | the parent retires it, the child keeps it live at the same position; nothing is lost |
| `refactor_helper` | assign `height` through a helper instead of `self` | a behaviour-preserving refactor retires the name: the old value hides, new instances go per-object |
| `uncommitted_rebuild` | an edit imported but not committed | the rebuilt layout is rolled back with the session; a schema change is part of the importing transaction |
| `dual_home` | promote a per-object value; store a retired name from outside | **defects**: one name with two homes on one instance, `vars()` disagreeing with the read, `del` resurrecting an older value |

## Running

```bash
./scripts/with_stone_lock.sh experiments/schema_changes/run.sh                 # all seven
./scripts/with_stone_lock.sh experiments/schema_changes/run.sh rename compact  # some
```

Under the stone lock, always: each version is a login, and a stone has a
session limit that another worktree's `run_tests.sh` (eight sessions) can be
sitting just under. An unlocked login then kills one of *its* shards silently
while its suite line still prints green. The lock waits until the suite is done.

Every run uses a fresh module name (`<scenario>_<run id>`), because a class
outlives `PythonModules`: the canonical class registry keeps it, so re-running
under the same name would start from the previous run's layout instead of from
nothing. The versions are copied under that name into a temp tree that the
runner removes on exit. Each version is a separate `./grail -c 'import …'`, so
each is its own session and its own transaction.

## Measured output (2026-09-20, gs40, main at #1056)

```
=== remove_and_readd v1 ===
v1: layout = ['balance', 'owner']  vars(acct) = {'balance': 10, 'owner': 'ann'}
=== remove_and_readd v2 ===
v2: layout = ['~balance', 'owner']  hasattr(acct,'balance') = False  vars(acct) = {'owner': 'ann'}
=== remove_and_readd v3 ===
v3: layout = ['balance', 'owner']  acct.balance = 10  (the v1 value, back through the revived position)

=== compact v1 ===
v1: layout = ['raw', 'value']  vars(r) = {'raw': 1, 'value': 2}
=== compact v2 ===
v2: compacted 1 class, 1 instance; layout = ['value']  vars(r) = {'value': 2}
=== compact v3 ===
v3: layout = ['value', 'raw']  r.raw -> AttributeError  (gone: compaction freed it)

=== rename v1 ===
v1: layout = ['phone']  vars(c) = {'phone': '555-1234'}
=== rename v2 ===
v2: layout = ['~phone', 'phones']  c.phone -> AttributeError  c.phones -> AttributeError  vars(c) = {}
=== rename v3 ===
v3: layout = ['phone', '~phones', '_phones']  c.phones = ['555-1234']  vars(c) = {'_phones': ['555-1234'], 'phone': None}

=== move_in_hierarchy v1 ===
v1: Base = ['a1', 'a2']  Derived = ['a1', 'a2', 'd1']
=== move_in_hierarchy v2 ===
v2: Base = ['a1', '~a2']  Derived = ['a1', 'a2', 'd1']  (d.a1, d.a2, d.d1) = (1, 2, 7)

=== refactor_helper v1 ===
v1: layout = ['width', 'height']  vars(w) = {'width': 1, 'height': 2}
=== refactor_helper v2 ===
v2: layout = ['width', '~height']  old w.height -> AttributeError  new Widget(): vars = {'width': 1, 'height': 2}

=== uncommitted_rebuild v1 ===
v1: layout = ['text']
=== uncommitted_rebuild v2 ===
v2: layout in this session = ['~text', 'body']  -- and no commit
=== uncommitted_rebuild v3 ===
v3: layout = ['text']  (no '~body': v2's uncommitted rebuild left no trace)

=== dual_home v1 ===
v1: vars(p) = {'x': 1} (per-object)   Q layout = ['x', 'y']
=== dual_home v2 ===
v2 Point: layout = ['x']  p.x = 1 (the old per-object value)
v2 Point: after p.x = 2: p.x = 2  but vars(p) = {'x': 1}   <-- DEFECT: two homes
v2 Point: after del p.x: hasattr = True  p.x = 1   <-- DEFECT: CPython raises AttributeError
v2 Q: layout = ['~x', 'y']  after q.x = 99: q.x = 99  vars(q) = {'y': 20, 'x': 99}
=== dual_home v3 ===
v3 Q: layout = ['x', 'y']  q.x = 10  vars(q) = {'x': 99, 'y': 20}   <-- DEFECT: the read and the dict disagree
v3 Q: after del q.x: hasattr = True  q.x = 99   <-- DEFECT: the 99 resurfaces
```

`Cls.___pySlotLayout___()` is the class's slot layout, callable from Python;
`~name` marks a retired position. `Cls.___grailCompactSlots___()` is the
compaction and answers `[classes rewritten, instances moved]`. Both are
Grail-internal spellings, used here because they are the only way to *see*
the schema today; the review proposes public names.
