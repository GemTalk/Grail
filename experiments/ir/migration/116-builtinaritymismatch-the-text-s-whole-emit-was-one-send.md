## `builtinArityMismatch`: the text's whole emit was one send (2026-09-16)

`cm:CallAst:builtinArityMismatch` (2) — test_asyncgen's `test_aiter_bad_args`
and `test_anext_bad_args`, calls like `aiter()`, `anext(gen(), 1, 3)` and
`anext(aiterator=gen())` whose only purpose is the `TypeError`.

The row had survived not because the shape was hard but because nobody had
read what the text emits for it. Dumping it with `GRAIL_CODEGEN_TRACE_DIR`
answered the question in one line:

```smalltalk
^ ((TypeError ___signal___: 'len() takes wrong number of arguments (2 positional, 0 keyword) - no matching method')).
```

`printSmalltalkOn:` resolves the mismatch at COMPILE time. It emits one send,
carrying one constant literal, and **no argument expressions at all** — so
`aiter(gen(), 1)` raises without ever calling `gen()`. The IR twin is that same
send, built from `globalNamed: #TypeError` and one `obj:` literal. There is no
argument emit to write, no receiver to resolve, and no run-time computation:
the positional and keyword counts are properties of the node.

### Two refusals, one emit

The shape method had `^ nil` in two places — a known BUILTIN whose arity
matched no fast path, and a known CLASS whose `__new__` matched nothing. Both
are the same text method, `printArityMismatchErrorOn:forName:`, reached from
two branches of `printSmalltalkOn:`, so both become `#arityMismatch`. Only the
builtin arm has corpus sites today; admitting one and refusing the other would
have split one text emit across two answers.

The message is now built by a shared `___arityMismatchMessageFor___:` that both
paths call. That is not tidiness — test_asyncgen is a test ABOUT the exception,
so a drift between the two spellings would be a wrong answer rather than a
cosmetic difference.

### The argument-evaluation divergence is the text's, and is reproduced on purpose

CPython evaluates a call's arguments before discovering the arity is wrong;
Grail's compile-time raise never evaluates them. The fixture pins that as an
XFAIL. The IR path reproduces it deliberately: emitting the arguments here
would fix one path only, and flag-on and flag-off would then disagree about how
many times a side effect ran. Fixing it is a change that must move both paths.

### The first census assertion was vacuous, and the control is what said so

The obvious test — `counts at: #'CallAst:builtinArityMismatch' = 0` — passes
against the REVERTED cut. This cut also deletes that name from
`___irRefusalDetail___:`, as a label that can no longer fire, so with the shape
refusal restored the fixture censuses as `CallAst:other` and the watched row
reads zero in both states. The control was run, it PASSED, and that is the only
reason the flaw was found; the assertion now reads the counts instead:

| | refusal | cut |
| --- | ---: | ---: |
| `compiled` | 2 | **5** |
| `cm:eligible` | 1 | **2** |
| `CallAst:other` | 3 | **0** |
| `cm:CallAst:other` | 1 | **0** |

This is the same lesson as `a-well-formed-number-describing-nothing`, met from
a new direction: the number was real, the row it named had simply stopped being
reachable. A test that watches a row a cut deletes can never fail.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:CallAst:builtinArityMismatch` | 2 | **0** |
| `cm:eligible` | 13217 | **13219** |

Measured same-tree: the baseline is this branch with `CallAst.gs` alone
reverted to `origin/main`, re-installed and re-censused. The row-by-row diff
shows exactly two lines changing and nothing moving.
