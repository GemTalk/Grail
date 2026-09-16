## `__class__` in a method-local class: one send, once the right text is read (2026-09-14)

`cm:NameAst:__class__-methodLocalClass` (12). CPython gives every method that
mentions `__class__` an implicit closure cell holding the class. A module-scope
class reads it back as a module attribute (cut 55); a class defined inside a
FUNCTION has no module attribute to read, so the class comes from the injected
cell — **one send**:

```smalltalk
(self @env1:___dunderClassCell___: #'___cell_<Cls>___')
```

`___dunderClassCell___` rather than the plain `___classCell___` because
`__class__` wants what the cell HOLDS: a read that still answers the class when
a metaclass has replaced the name binding with a non-class.

### The side effects are part of the emit

`addCapturedClassName:` is what makes ClassDefAst emit the cell store at
definition time — without it the class carries no `___cell_<Cls>___` and the
read finds nothing. `classNeedsClassCell:` and `___recordClassCellMethod___` are
CPython's own condition for injecting `__classcell__`, recorded per METHOD so
`__closure__` can answer per method rather than per class. The text branch fires
all three; so does this one.

The module-scope arm wraps its read in `___grailClassCellValue___` when the cell
is rebindable. This arm must NOT: it already goes through the cell, which is the
thing a rebind changes.

### Why this row sat parked for three ticks

It was scoped once and set aside as "resolves at runtime through the class cell,
not an emit substitution" — on the strength of a `smalltalkForPath:` dump that
renders this case as a **bare `__class__` identifier**. That dump is the
module-level program, not what the class's method is compiled from. The
INSTALLED method's `sourceString` is the `___dunderClassCell___` send, and one
look at it would have shown the emit was a single send all along.

**Read the compiled method, not the module dump.** That is the second time this
session a `smalltalkForPath:` rendering has misled about a method-local class —
the first was the async-genexp construction rule.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:NameAst:__class__-methodLocalClass` | 12 | **0** |
| `cm:eligible` | 10878 | **10890** (98.7%) |

Twelve retired, **+12 net** — nothing moves up behind it, so not one of the
twelve refuses on a second reason. Measured against a same-tree baseline on the
`main` this branch is cut from; it does not include #981, which moves the same
family's other row.

### The control

Reverted, the fixture censuses 9 `cm:NameAst:__class__-methodLocalClass` against
2 `cm:eligible` and compiles 11 of the 20 — and the behavioural comparison
**still passes on all eight checks**, from the text twin. The census assertion
is the only instrument that sees this cut.

`defining_class_not_receiver_class` is the fixture's sharpest check: reading
`type(self)` instead of the cell gives the same answer for every instance of the
defining class and diverges only on a SUBCLASS instance, which is exactly why
CPython uses a cell.
