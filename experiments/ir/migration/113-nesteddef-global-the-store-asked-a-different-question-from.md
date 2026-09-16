## `nestedDef:global`: the store asked a different question from the read (2026-09-15)

`cm:nestedDef:global` (4). Any closure whose body declared `global` refused.
The declaration emits nothing on either path — what it decides is where each
read and store of the name goes: the module binding, never a local, and never
an enclosing function's local either.

**In a top-level def or a method that costs the IR path nothing**, which is why
this had never been a problem before. The PARSER strips a declared global from
the declaring scope's variables, so no local of that name exists and both halves
route to the module by default. A nested def compiles to a BLOCK, and the
binding that must not win belongs to the ENCLOSING scope, whose temps are still
registered on the builder.

So the two halves disagreed with each other. `AssignAst>>___emitIRStatementOn___:`
decides module-versus-local by asking whether `aBuilder leafFor:` answers a leaf;
`NameAst`'s read tests the declaration BEFORE the leaf, deliberately — cut 69 put
it that way for the except-as target. Measured:

```python
tag = 'MODULE-INITIAL'
def shadow():
    tag = 'enclosing local'
    def setit():
        global tag
        tag = 'set by nested'
        return tag          # IR: 'MODULE-INITIAL'   CPython/text: 'set by nested'
    return setit(), tag     # IR: enclosing tag is now 'set by nested'
```

Two wrong answers from one missing removal, and neither is an error.

### The cut is the removal, not a fifth store branch

`PyMethodIRBuilder>>withoutLocalsNamed:do:` takes the declared names out of the
local table for the closure body's duration. That is the emit half of what the
parser already does one lexical level up, and it moves EVERY leaf-based decision
at once — a plain assign, an augmented assign, a `for` target, an except-as
target, a `del`. `___irNestedLocals___:` subtracts the same names so the
judgement and the emit cannot disagree.

Patching `AssignAst` alone would have left the other four wrong, all of them
silently: `testEveryBinderRoutesToTheModule` exists to say so.

### One shape was a silent fallback, not a wrong answer

A def nested inside the DECLARING def lists the name among its free variables —
the text does too, emitting `___setFreevars___: #('g1')` with a cell whose reader
is `(self ___moduleAttrLoad___: #'g1')` rather than a temp read. The IR
closure-cell build had only two cases, a leaf or the method receiver, so it
raised `free variable g1 has no leaf at the def site`, the seam caught it, and
the enclosing method compiled as text. **Every value in the fixture was already
correct**; only `___irStats___` could see it.

The fix routes that case through the NameAst resolver
(`___emitIRFreeVariableRead___:parent:on:`, lifted from `CallAst` to
`AbstractNode` so both callers share it) rather than spelling the module read a
second time. Anything else leafless still raises: replacing a fallback with an
emit is a behaviour change, and only the declared-global shape was measured.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:nestedDef:global` | 4 | **0** |
| `cm:eligible` | 13205 | **13209** |

Four retired, **+4 net** — nothing moves up behind it. Measured on `8c301199`,
the `main` this branch was originally cut from, by reverting the four touched
files to `origin/main`, re-running `install.sh` and censusing again; the branch
has since been rebased onto a `main` that includes the eval-nested cut above.

**The two sections' numbers are a coincidence, not a copy.** Both read 13205 →
13209, because each was measured against its own pre-cut tree and each freed
four class methods — the eval cut's baseline was `d6ba0d4f` and this one's
`8c301199`, which does not contain it. Stacked, the two deltas are additive;
neither 13209 is the board's absolute position now that both have landed.
`CENSUS.md` still wants one combined re-measure once the family has landed.
