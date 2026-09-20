## `nestedDef:kwonly`: the closure's defaults live in a cell, not in the closure (2026-09-13)

`nestedDef:kwonly` (10 class methods + 1 top-level def) named its reason
precisely — "the text's mutable `___kwdefaults___` cell shape" — and the shape
is the whole difficulty. A nested `def f(*, k=1)` cannot inline its default,
because `__kwdefaults__` is WRITABLE: assigning it must change what the next
call binds, and `del f.__kwdefaults__['k']` must make a defaulted parameter
required again. So the default lives in a one-slot Array built when the `def`
statement runs and stamped onto the function object, and the closure reads it on
every call.

### Five pieces, each mirroring a `printSmalltalkOn:` branch

* the def-time wrapper block now exists for keyword-only parameters too, not
  only for positional defaults — `def f(*, q)` needs it for the `{ nil }` cell,
  and `nil` rather than an empty dict is what makes every name required;
* `___emitIRKwDefaultsCellOn___:into:` builds and fills the cell, evaluating
  each default ONCE, in the enclosing scope;
* **the `shallowCopy` moves INSIDE the wrapper** so the stamp can name the cell
  (`… shallowCopy ___pyKwDefaults___: ___kwdefaults___`), and there is then no
  second copy outside — the wrapper's value IS the function object;
* `___emitIRNestedKeywordOnlyBindingOn___:kw:cell:` binds each name from the
  live cell, with EVERY keyword-only name in the missing-argument check rather
  than only those declared without a default, because the cell decides which is
  which at call time;
* the `**kwarg` binding copies and drops the keyword-only names, so a name that
  is keyword-only does not also arrive in `**kwargs` — and the copy is what
  leaves the caller's dict unmutated.

### The builder change, which cost the most to find

`PyMethodIRBuilder>>nestedFunctionDo:` hides every inherited `___`-prefixed
binding from the closure so emitters allocate their own helper temps, exempting
the def-time wrapper temps `___default_…` / `___lamdef_…`. `___kwdefaults___` is
exactly that category and was not exempt, so the closure could not see the cell
and **every keyword-only parameter bound to nil** — a silently wrong value, not
an error, and one that reads as "my binding code never ran". It took a probe
that assigned a literal instead of the lookup to separate "the assignment does
not reach the temp" from "the looked-up value is wrong".

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:nestedDef:kwonly` | 10 | **0** |
| `nestedDef:kwonly` (top-level) | 1 | **0** |
| `cm:eligible` | 10753 | **10763** (98.4%) |
| `compiled` (test corpus top-level) | 1316 | **1317** |

Re-measured after rebasing onto #964: the row read 10743 -> 10753 against the
main it was written on and 10753 -> 10763 against this one, the same **+10**, so
this cut and the `bigmemtest` one do not overlap.

Nothing moves up behind it. The stdlib corpus is unmoved at 4575.

### A pre-existing TEXT bug the fixture found, fixed here

A keyword-only default that is a CALL emitted unparenthesised into the cell's
`at:put:`:

```smalltalk
(___kwdefaults___ @env0:at: 1) @env0:at: 'k' put: (note …) @env1:value: { } value: nil.
```

The keywords run together and Smalltalk parses ONE `at:put:value:value:` send to
the dict, so `def f(*, k=note())` inside a function raised *"a PyDict does not
understand #'at:put:value:value:'"* — on the TEXT path, on `main`, today. A
literal default hid it, which is why the corpus never reached it. Fixed with one
pair of parentheses, in the same emitter, because the fixture for this cut trips
it and shipping a cut in this area while leaving it would be worse than the
small scope increase. The IR emit was never affected: it builds a send tree, so
it has no precedence to get wrong.

### The control

With the refusal restored the fixture censuses 9 `nestedDef:kwonly` and compiles
3 of 12, and the behavioural comparison **still passes on all fourteen checks**
— the text twin answers them correctly. Only the census (and `compiled`) move.
