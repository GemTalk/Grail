## The bare rewrite: two pieces already here, plus the send that joins them (2026-09-13)

The cut the previous section's split pointed at. After eval/exec stopped
refusing by name, the dominant remaining reason was `-bareRewrite` — 51 of the
55 left — and it named a CODEGEN gap, not the frame machinery the family had
been attributed to.

### What the rewrite is

Grail does not dispatch a single-positional `eval(expr)` / `exec(src)` to the
builtin at all. `printSmalltalkOn:`'s step 0c rewrites it at compile time:

```smalltalk
(builtins instance) _eval: {
    <expr>.
    (builtins instance) ___evalScopeFor___: <moduleReceiver>
                        locals: <locals snapshot> } kw: nil
```

because `_eval` / `_exec` otherwise run in an EMPTY scope, and
`eval('val.split()[0]')` referencing the local `val` raised *undefined symbol*.
So an IR path that emitted the ordinary builtin call instead would not be a
smaller version of the text — it would be a **wrong answer**, which is why the
shape was right to refuse until the emit existed.

### Why it was a small cut

Both halves of that expression were already spelled by earlier cuts:

* `___emitIRLocalsSnapshotOn___:` — cut 84's locals snapshot, in the same order
  the text prints (free variables, then own names sorted, then comprehension
  targets);
* `___emitIRModuleStoreReceiverOn___:` — factored out of
  `___emitIRGlobalsViewOn___:` in this cut, since two emits want the same
  receiver and only one of them wraps it in a `PyModuleDict`.

What was missing was `___evalScopeFor___:locals:` around them and the
`_eval:kw:` send. One new emit method, one factoring, one shape symbol.

### Two scopes of five

`printBareEvalExecOn:` serves five scope cases and this path spells two — a
top-level def and a method. `___irEvalScopeShape___` answers `#nested` for the
other three (a class body, a comprehension, a nested def or lambda), each of
which the text prints through a different helper with no IR twin. Admitting one
of those would emit a snapshot of the wrong names, which is exactly the class of
bug this whole family exists to avoid.

The shape test is read off the PARENT CHAIN. Step 0c's own guard asks
`CallAst functionBeingCompiled notNil`, a compile-context read that answers
about another frame's def during an eligibility probe.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:CallAst:frameSensitive-eval-bareRewrite` | 37 | **0** |
| `cm:CallAst:frameSensitive-exec-bareRewrite` | 14 | **0** |
| `CallAst:frameSensitive-eval-bareRewrite` (top-level) | 1 | **0** |
| `cm:CallAst:frameSensitive-eval-nested` | 4 | 6 |
| `cm:CallAst:frameSensitive-exec-nested` | 0 | 2 |
| `cm:eligible` | 10642 | **10689** (97.3% → 97.7%) |

The `-nested` rows go UP because some of the retired `-bareRewrite` sites were
nested as well, and now name the reason that actually blocks them. That is the
census working as intended: it reports the FIRST refusal, so retiring one reason
uncovers the next.

**The frame-sensitive family is now 8 rows**, all `-nested`, from 129 at the
start of the day. The stdlib corpus lost its last two as well (1573 → 1574
top-level, 4574 → 4575 class methods: `pickle._builtin_type_registry` and
`pydoc.Helper.help`).

### A gap the fixture found, which is not this cut's

`(lambda z: eval('z + 1'))(41)` answers 42 in CPython and raises
`NameError: name 'z' is not defined` in Grail **on both codegen paths**. Step
0c injects the snapshot of the enclosing FUNCTION, and a lambda's own parameter
is not in it. Documented in the fixture and left out of its checks rather than
asserted — a red test for a pre-existing gap would say nothing about the cut the
file is here for. It is the same family as the nested-def divergence `-nested`
names, and it is a second reason that row is worth closing.
