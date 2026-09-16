## Progress — cut 75 (a lambda parameter spelled like a pseudo-variable)

`LambdaAst:reservedName`, cut 74's twin one node class over: 1 def in the test
corpus (`test.test_call.TestPEP590.test_vectorcall_override_on_mutable_class`),
none in the stdlib.  Same fix, same size: `___irOwnLeafNames___` answers the
transport spelling of each `___irOwnNames___` entry, and
`___emitIRLambdaBlockOn___:` hands those to `blockWithArgs:temps:do:` while
`withLocals:do:` keeps the Python names.  The prologue already resolves every
parameter through `leafFor: <python name>` (the positional gate, the vararg
tuple, the keyword-only bindings, the `**kwargs` copy and its `removeKey:`
drops), so nothing else moved.  `LambdaAst:leafNameCollision` replaces the
refusal, for the same `self` + `_self` case; no occurrence in either corpus.

Unlike the nested def, **the lambda text path had no gaps to record here**: it
spells the `___lamdef_` default temps with the transport name on BOTH the
declaration and the read (so a defaulted pseudo-variable parameter compiles),
and it looks a keyword up under the PYTHON name (`pyName` in
`printSmalltalkOn:`), which is what CPython binds.  The one text limit is the
same star-parameter one cut 70 found for defs: `varargName` / `kwargName` are
taken raw, so `lambda *self: ...` is a CompileError on text.  It compiles
through IR and is therefore not asserted in the fixture.

Oracle check: the text dump for `lpv_plain.<locals>.<lambda>` and
`lpv_defaults.<locals>.<lambda>` is `| ___curPos___ _self _nil _true |` with
`_self` in every read and `'self'` as the kwargs key -- what the IR builds,
send for send, differing only in the temps' spelling (an IR method has no
`___curPos___`, and its `___lamdef_` memo temps take the raw name; neither is
observable).

Fixture: lpv_plain (a `self` parameter, called positionally and by keyword),
lpv_defaults (`self`, a defaulted `nil`, a keyword-only `true`), lpv_key (the
inline `key=lambda nil: ...` a call site passes), lpv_meta (the `__name__` /
`__qualname__` stamps), LpvHolder.scaled (the lambda's `self` shadowing the
method's receiver, inside a comprehension).  Compiled 458 -> 465 (5 top-level
defs + 2 class methods), 0 fallbacks, RESULTS true with the flag on and off.

Gates: flag-off `6535 run, 6535 passed, 0 failed, 0 errors`; flag-on cold
sweep `6535 run, 6520 passed, 14 failed, 1 errors` -- the same fifteen as cut
74, no new name.

A harness note worth carrying: main's PR #876 took `run_tests.sh` from four
shards to EIGHT, so ONE run now opens 8 sessions and two worktrees on one
stone exceed gs40's max-sessions.  Three of my shards died on "Login failed:
the maximum number of users are already logged in" and the runner still
printed a well-formed `4028 run, 4028 passed, 0 failed` -- the vacuous pass of
the "Overlapping run_tests.sh" note, and 4028 is short of 6535 only if you
know the number.  Check `pgrep -fl runTestsShard.gs` before starting, and
after a run confirm `grep -h GRAIL_SHARD_RESULT out/shard_*.out | wc -l` is 8
and the per-shard counts sum to the suite line.

### The flag-on board, measured again on Darwin arm64 (2026-09-10)

Both arms, same tree (this branch), same machine, back to back, after the `with`
fix above. This is a SECOND measurement of the board #909 opened, in a different
environment, and it qualifies one of its two headline findings.

| | flag OFF | flag ON |
| --- | ---: | ---: |
| OK | 72 | 68 |
| FAIL | 3 | 4 |
| ERROR | 17 | 19 |
| CRASH | 0 | **1** |
| TIMEOUT | 0 | 0 |
| wall time | 452s (and 420s on a second run) | **450s** |

**The 1.9x wall-time cost does not reproduce here.** #909 read 939s -> 1773s;
this machine reads 452s -> 450s, which is INSIDE the flag-off run-to-run spread
(420-452s). The difference between the two measurements is the environment --
#909's arms ran in the x86_64 container under emulation, this one runs native --
so the time cost is a property of that environment rather than of the IR path.
Worth knowing before anyone optimises against a 1.9x that native hardware does
not show.

**The memory cost is NOT environment-specific: `test.test_set` OOMs here too**
(`CRASH`, from `OK`). So of #909's two structural claims, the crash stands
unchanged and the slowdown needs re-measuring wherever it is going to be acted
on.

Seven modules differ, same machine, same tree -- six worse, one better:

| module | flag OFF | flag ON |
| --- | --- | --- |
| test.test_set | OK | **CRASH** (out of memory) |
| test.test_copy | OK | ERROR f=4 e=1 |
| test.test_global | OK | ERROR e=1 |
| test.test_traceback | OK | FAIL f=1 |
| test.test_codecs | ERROR f=25 e=52 | ERROR f=**26** e=52 |
| test.test_funcattrs | ERROR f=0 e=1 | ERROR f=**1** e=1 |
| test.test_contextlib_async | ERROR f=6 e=2 | ERROR f=6 e=**1** (better) |

`test.test_with` is no longer among them, which is this branch's fix seen on the
corpus rather than on one module.

**Three modules on #909's flag-on list are not IR divergences at all.**
`test_named_expressions`, `test_asyncgen` and `test___all__` appear as FAIL in
the flag-on run and fail IDENTICALLY flag-off, so they are pre-existing failures
that a one-arm reading picks up as though the flag caused them. The flag-on
board is only interpretable as a DIFF against a flag-off run of the same tree on
the same machine; the absolute counts carry the corpus's own failures along with
them. `test.test_math`'s TIMEOUT behaves the same way (it reads TIMEOUT in both
arms, or neither, depending on load).

### The same board on 4.0.0.Alpha1 with IR alive again (2026-09-10, later)

The section above was measured on the PREVIOUS GemStone build. On
`4.0.0.Alpha1 Build 2026-09-09`, main's capability probe fails and
`___irCodegenSupported___` answers false, so a flag-on run of main does not run
IR at all and both arms come back IDENTICAL -- a zero diff that looks like a
clean result and means nothing. This re-measurement is on `main` + the
capability fix (`fix/ir-source-offsets-40`), which is the first tree on this
build where the comparison can be made. Both arms back to back, same tree, same
machine, nothing else on the stone.

| | flag OFF | flag ON |
| --- | ---: | ---: |
| OK | 72 | 69 |
| FAIL | 3 | 5 |
| ERROR | 17 | 17 |
| IMPORTERROR | 10 | 10 |
| CRASH | 0 | **1** |
| TIMEOUT | 0 | 0 |
| total fail+err | 206 | 212 |
| wall time | 397s | 410s |

**SIX modules differ, and that confirms #913's prediction.** #913 said six and
never measured it; the section above measured SEVEN on the older build. The row
that left the list is `test.test_global`, which is #913's own fix
(`global`-declared names and `except ... as` bindings routed through the module
scope) seen on the corpus rather than on one module.

| module | flag OFF | flag ON |
| --- | --- | --- |
| test.test_set | OK | **CRASH** (out of memory) |
| test.test_copy | OK | FAIL f+e=4 |
| test.test_traceback | OK | FAIL f+e=1 |
| test.test_codecs | ERROR f+e=65 | ERROR f+e=**66** |
| test.test_funcattrs | ERROR f+e=1 | ERROR f+e=**2** |
| test.test_contextlib_async | ERROR f+e=8 | ERROR f+e=**7** (better) |

The two smallest deltas were re-run on their own in both arms and reproduce
exactly (8 -> 7 and 0 -> 1), so neither is a single-run flake.
`test.test_traceback`'s flag-on failure is
`TestColorizedTraceback.test_colorized_traceback_from_exception_group`.

**The 1.9x wall time still does not reproduce: 397s -> 410s, 1.03x.** That is a
second native measurement agreeing with the first (452s -> 450s), on a different
build and a different tree, and it now also carries the cost of
`___pyCallValue___:kw:` standing in for the ExecBlock-invoke opcode -- the
overhead the kernel `optimize` request would remove. So the slowdown remains a
property of the emulated x86_64 container, not of the IR path.

**`test.test_set` still CRASHes on memory**, unchanged and environment
independent -- three measurements now.

Every one of the five regressions is already a named item on the readiness
queue; the flag-on board opens no new work, it just confirms what is on it.
