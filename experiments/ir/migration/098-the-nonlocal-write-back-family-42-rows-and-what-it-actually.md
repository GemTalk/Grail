## The nonlocal write-back family: 42 rows, and what it actually costs (2026-09-12)

Two rows that read as separate shapes are one mechanism. Measured on the suite
manifest, per-module deduped:

| row | count |
| --- | ---: |
| `cm:NonlocalAst:notLocal` | 21 |
| `cm:classDef:nonlocalBelow` | 19 |
| `cm:NonlocalAst:classCell` | 2 |

`nonlocalBelow` names the ENCLOSING test methods and `notLocal` names the inner
class's methods, for one shape the corpus is full of — and a twelve-line fixture
reproduces both rows at once:

```python
def test_x(self):
    calls = 0
    class Key:
        def __eq__(self, other):
            nonlocal calls
            calls += 1
```

That makes it the second-largest coherent family after the 128-row frame rows,
and `classDef:capturesLocal` / `classDef:captureBeyondClass` both measure **0**,
so 42 is the whole payoff rather than the visible part of something larger.

### The text mechanism, dumped rather than reasoned about

The class stores TWO cells per captured-and-written name, and both blocks are
created in the ENCLOSING scope:

    Key ___pyAttrStore___: #'___cell_calls___'       put: [calls].
    Key ___pyAttrStore___: #'___cellSetter_calls___' put: [:v | calls := v].

and the inner method's write is
`(self ___classCellSetter___: #'___cellSetter_calls___') value: <new>`.

### The read half is already done; only the write half is missing

Worth stating because the obvious guess is wrong. `___irCarriedCaptureNames___:`
carries each capture as **the enclosing frame's own zero-argument READER
BLOCK** — not as a value — which is why reads are already by reference and why
`capturesLocal` is 0. The helper takes `___irCaptured___`, an array of those
blocks, and `___cellReaderSourceFor___:` routes each cell reader through
`___irCell_<i>___`.

So `ClassDefAst`'s refusal comment — *"the setter block writes the ENCLOSING
frame's temp. The helper's frame is not that frame, and no marshalling makes it
so"* — is right about the mechanism and wrong about the conclusion. The helper's
prologue does `<id> := ___irCell_<i>___ value`, so `<id>` is a local COPY and a
setter written there would indeed miss. But the marshalling that fixes it is the
one already in use for readers: pass a second array of one-argument setter
blocks built in the enclosing IR frame.

### The design, and the honest cost

Symmetric to the reader throughout:

1. `___irHelperSelector___:` gains a `setters:` keyword when
   `___irClassBodyDeclaresNonlocalBelow___:` is true — a STATIC AST walk, so it
   is known before the helper source is generated (the text's
   `classCapturedWriteNames` is a side effect OF that generation and arrives too
   late to pick a selector).
2. The helper declares `___irSetter_<i>___` temps and a prologue
   `___irSetter_<i>___ := ___irSetters___ at: i`.
3. A `___cellSetterSourceFor___:` mirrors `___cellReaderSourceFor___:`, routing
   the setter cell's body through `___irSetter_<i>___` instead of naming a temp
   the helper does not have.
4. `___emitIRStatementOn___:` builds the setter blocks
   (`blockWithArg:do:` + `assign:from:` over `leafFor:`) and passes the array.
5. `NonlocalAst`'s and `ClassDefAst`'s refusals narrow to the genuinely
   uncarriable case — a written name reached past an intervening class.

**Item 6 is the one that makes this a real cut rather than another predicate
read: there is no IR store-through-cell emit at all.** `___classCellSetter___`
appears only in text emits (`AssignAst`, `AugAssignAst`, `ClassDefAst`, all
`nextPutAll:`). Both of those store paths need a new IR emit, plus the
store-side eligibility to admit a name that resolves through the cell — the
write counterpart of the read this board closed as `NameAst:reservedIdentifier`.

So: five coordinated changes across three files, two of them new emits in the
assignment path. Bigger than the last four cuts put together, and unlike them it
is not a guard wider than its reason — the guard is describing something real.
Recorded rather than attempted so the next session starts from the design
instead of the hypothesis.
