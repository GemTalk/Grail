## The reserved-name cut: a guard wider than the text it guarded (2026-09-11)

`NameAst:reservedIdentifier` (30) is closed, and like the argument-0 row before
it, the fix was to delete a refusal rather than build anything.

| row | before | after | where it went |
| --- | ---: | ---: | --- |
| `NameAst:reservedIdentifier` | 30 | **0** | 30 eligible, nothing displaced |

`cm:eligible` 10540 → **10570**, measured paired on one base commit. The full
row-set diff between the two censuses has exactly two lines: the row vanishing
and `cm:eligible` rising by 30. Nothing moved to a neighbouring row.

### What it was

`___irNonLocalLoadKind___:` answered nil — refuse — for any load of a Smalltalk
pseudo-variable name (`self`, `super`, `thisContext`, `nil`, `true`, `false`),
*before* the dispatch could reach its class-cell branch. But the text does not
refuse those reads. A reserved-name load that resolves through the class cell
gets the ordinary cell read:

    (self @env1:___classCell___: #'___cell_self___')

which is name-agnostic — dumped from the text path, not reasoned about. And
`___readsThroughClassCell___`'s own comment had already written the rule down:
its second caller is *"the reserved-name transport rename, which must stand
down for exactly the same reads. They were written as separate copies once; the
copies disagreed."* The IR guard had simply never been given that exception.

The shape is everywhere in the corpus — thirty rows across ten modules, led by
`datetimetester` (10) and `test_pickle` (8):

```python
class B1(self.basetype):            # test_bytes
    def __new__(cls, value):
        me = self.basetype.__new__(cls, value)
```

`self` inside that `__new__` is not the method's receiver; it is a free
variable of the enclosing TEST METHOD, reaching the body through the class's
closure cell.

**So that is three rows in a row closed by reading a predicate rather than
writing an emit** (`super-methodLocalClass`, `super-argZeroDeletable`, this
one). The pattern is worth naming: a guard copied from the text's dispatch
order, without the exception the text attaches to it.

### The fixture's capture must cross a CLASS boundary

Same trap as last time, checked for deliberately this time. The capture has to
cross a class boundary — that is what makes the method string-compile onto the
inner class with no lexical link to the enclosing temps, and so what sends the
read through the cell. A plain nested FUNCTION capturing `self` reaches the temp
directly and never refused. With the nesting right: 4 refused / 8 eligible
before, 0 refused / 12 eligible and 12 compiled after.

### A gate verdict that took three runs to read

The Tier 2 gate reported `REGRESSION test.test_decimal: fail+err 9 -> 10` on
this branch **twice in a row**, while pristine `main` read clean **twice in a
row**. That 2-vs-2 split looks exactly like causation. It was not: the third
branch run read clean, and the extra failure was `PyPythonAPItests.test_abc`
(`_pydecimal.Decimal is not a subclass of numbers.Number`) — the known
import-state flake.

The cheaper and stronger settlement was available all along and should have been
reached for first: **this change is unreachable with the flag off.**
`___irNonLocalLoadKind___:` is called only from `___irEligibleValueLocals___:`
and `___emitIRValueOn___:`, and `run_cpython_suite.sh` sets no IR flag. Check
reachability before spending seven minutes a run.

### The board after this cut

| row | count |
| --- | ---: |
| `CallAst:frameSensitive-exec` | 77 |
| `CallAst:frameSensitive-eval` | 52 |
| `shape:TryAst` | 25 |
| `NonlocalAst:notLocal` | 21 |
| `classDef:nonlocalBelow` | 19 |

The top two remain one cut and genuine frame machinery. `shape:TryAst` (25) is
now the largest codegen row.
