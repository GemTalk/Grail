# Schema changes, one scenario per directory

Each directory is one class edited across versions of one module, `v1.py`,
`v2.py`, `v3.py`, run in that order, **one session each**, against the same
repository. Version 1 commits an instance; the later versions are the edit and
what the committed instance looks like afterwards. Every line that prints is
also an `assert`.

The narrative that goes with these is
[docs/Schema_Evolution.md](../../docs/Schema_Evolution.md) (for Python
developers) and [docs/Schema_Evolution_Review.md](../../docs/Schema_Evolution_Review.md)
(the design review, for Grail implementors). The *add an attribute* case is
the older demo next door, [experiments/schema/](../schema/).

| scenario | the edit | what it shows |
| --- | --- | --- |
| `remove_and_readd` | stop assigning `balance`, then assign it again | nothing is retired: the old value stays readable and listed; re-adding changes nothing |
| `compact` | stop assigning `raw`, DROP it, compact, re-add `raw` | the two explicit steps through `gemdb.schema`; a name re-added after a drop is a new position |
| `rename` | `phone` → `phones`, the code shipped first | the old value stays readable under the old name; `gemdb.schema.rename` then MOVES it, because a second position already exists |
| `renamed_declaration` | the same rename, declared as `__renamed__` | the import relabels the position in place: the value never moves, and the declaration is a no-op on a repository that has already caught up |
| `move_in_hierarchy` | `a2` moves from `Base` into `Derived` | no layout changes; every value reads as before |
| `refactor_helper` | assign `height` through a helper instead of `self` | the class stops assigning the name but the helper's store lands in the same position; same schema |
| `uncommitted_rebuild` | an edit imported but not committed | the rebuilt layout is rolled back with the session; a schema change is part of the importing transaction |
| `dual_home` | promote a per-object value; store an unassigned name from outside | one name, one home: the store moves the value, `vars()` agrees with the read, `del` leaves nothing behind |

## Running

```bash
./scripts/with_stone_lock.sh experiments/schema_changes/run.sh                 # all eight
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

## Measured output (2026-09-21, gs40, cuts 1 and 2 of the design note)

```
=== remove_and_readd v1 ===
v1: layout = ['balance', 'owner']  vars(acct) = {'balance': 10, 'owner': 'ann'}
=== remove_and_readd v2 ===
v2: layout = ['balance', 'owner']  acct.balance = 10  vars(acct) = {'balance': 10, 'owner': 'ann'}  new Account() has balance? False
=== remove_and_readd v3 ===
v3: layout = ['balance', 'owner']  acct.balance = 10  Account().balance = 0

=== compact v1 ===
v1: layout = ['raw', 'value']  vars(r) = {'raw': 1, 'value': 2}
=== compact v2 ===
v2: layout = {'raw': 'unassigned', 'value': 'assigned'}
v2: dropped raw -> {'classes': 1, 'instances': 1}  layout = {'raw': 'hole', 'value': 'assigned'}
v2: compacted -> {'classes': 1, 'instances': 1}  layout = ['value']  vars(r) = {'value': 2}
=== compact v3 ===
v3: layout = ['value', 'raw']  r.raw -> AttributeError  (gone: the drop freed it)

=== rename v1 ===
v1: layout = ['phone']  vars(c) = {'phone': '555-1234'}
=== rename v2 ===
v2: layout = ['phone', 'phones']  c.phone = 555-1234  c.phones -> AttributeError  vars(c) = {'phone': '555-1234'}
=== rename v3 ===
v3: rename -> {'classes': 1, 'instances': 1}  layout = [('phone', 'hole'), ('phones', 'assigned')]  c.phones = 555-1234

=== renamed_declaration v1 ===
v1: layout = ['phone']  vars(c) = {'phone': '555-1234'}
=== renamed_declaration v2 ===
v2: layout = ['phones']  c.phones = 555-1234  vars(c) = {'phones': '555-1234'}
=== renamed_declaration v3 ===
v3: layout = ['phones']  c.phones = 555-1234

=== move_in_hierarchy v1 ===
v1: Base = ['a1', 'a2']  Derived = ['a1', 'a2', 'd1']
=== move_in_hierarchy v2 ===
v2: Base = ['a1', 'a2']  Derived = ['a1', 'a2', 'd1']  (d.a1, d.a2, d.d1) = (1, 2, 7)

=== refactor_helper v1 ===
v1: layout = ['width', 'height']  vars(w) = {'width': 1, 'height': 2}
=== refactor_helper v2 ===
v2: layout = ['width', 'height']  old w.height = 2  new Widget(): vars = {'width': 1, 'height': 2}

=== uncommitted_rebuild v1 ===
v1: layout = ['text']
=== uncommitted_rebuild v2 ===
v2: layout in this session = ['text', 'body']  -- and no commit
=== uncommitted_rebuild v3 ===
v3: layout = ['text']  (no '~body': v2's uncommitted rebuild left no trace)

=== dual_home v1 ===
v1: vars(p) = {'x': 1} (per-object)   Q layout = ['x', 'y']
=== dual_home v2 ===
v2 Point: layout = ['x']  after p.x = 2: vars(p) = {'x': 2}  after del p.x: hasattr = False
v2 Q: layout = ['x', 'y']  after q.x = 99: vars(q) = {'x': 99, 'y': 20}
=== dual_home v3 ===
v3 Q: layout = ['x', 'y']  q.x was 99; after del q.x: hasattr = False
```

The scenarios use the public `gemdb.schema` API: `layout` (one row per
position, with a `kind` of `assigned`, `unassigned` or `hole`), `drop`,
`rename` and `compact`. See [docs/GemDB_Module.md](../../docs/GemDB_Module.md).
