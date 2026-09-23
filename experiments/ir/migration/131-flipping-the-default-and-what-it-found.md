## Flipping the default, and what flipping it found

`GRAIL_IR_CODEGEN` now DISABLES the IR path rather than enabling it. Unset or
empty means IR; `0` / `false` / `no` / `off`, any case, means text.
`GRAIL_IR_CODEGEN=1` still reads as the IR arm, so nothing that set it needed
changing -- but the flag-OFF arm of a comparison now has to say `=0`, and a
script that forgets measures IR twice and reports two arms that agree.

Two judgement calls, both about failures that are QUIET:

* **empty reads as ON.** It used to mean off, which was harmless while off was
  the default. Now it would be the one way to disable the path by accident:
  `GRAIL_IR_CODEGEN=$SOMETHING` with SOMETHING unset would take a suite off the
  path it exists to gate.
* **the off-words are lowercased before comparing.** The list this replaced held
  `false` and `FALSE` but not `False`, `no`/`NO` but not `No`. Harmless before;
  after the flip an unrecognised spelling of OFF leaves IR running while the
  caller believes they are measuring text.

`___irCodegenFlagFor___:` exists so `IRCodegenFlagDefaultTestCase` can pin every
spelling without an SUnit case altering a running gem's environment.

### The flag works. Main does not.

Verified directly -- seam live with no env var, dead with `=0`:

```
default:              FLAG|true  ENABLED|true   SUPPORTED|true   compiled=101
GRAIL_IR_CODEGEN=0:   FLAG|false ENABLED|false  SUPPORTED|true   compiled=0
```

And then the gates:

| arm | result |
| --- | --- |
| SUnit, text (`=0`) | `7018 run, 7018 passed, 0 failed, 0 errors` |
| SUnit, IR (the new default) | `7018 run, 1 failed, **52 errors**` |
| corpus, text | `OK 74 · FAIL 3 · ERROR 18` |
| corpus, IR | `OK 72 · FAIL 3 · ERROR 19`, 2 regressions |

**THE FLIP IS NOT THE CAUSE, AND THAT WAS MEASURED RATHER THAN ARGUED.** The
same suite with `GRAIL_IR_CODEGEN=1` on this branch and on CLEAN MAIN produces
the SAME 53 defects, listed and diffed:

```
A: flip tree, =1         7018 run, 1 failed, 52 errors   53 distinct defects
B: clean main, =1        7014 run, 1 failed, 52 errors   53 distinct defects
diff A B                 (identical)
```

(7018 vs 7014 is this cut's own four tests.)

So main is not IR-clean, and has not been since somewhere in #1074..#1084 --
ten merges that landed after the last IR-gated tree. Cut 130's board, measured
on that tree, read `OK 74` in BOTH arms with no module worse under IR. That
board described a tree that no longer exists.

### Why it was invisible

`ci.yml` runs the SUnit shards and the fixture gate with the flag unset, which
until this cut meant the TEXT path. Nothing in the pre-merge pipeline has ever
compiled a line through IR. The flag-on sweep is a thing a person runs by hand,
and between cut 130 and this one nobody did -- so ten PRs merged green while
five test classes were failing on the path we are about to make the default.

**That is the argument for a flag-on CI job BEFORE the flip, not after it.** A
default that is only gated by hand is a default whose regressions arrive in
batches and have to be bisected out of a week of merges, which is exactly the
trade `docs/` already records for the conformance nightly.

### The 53, clustered by cause rather than counted

| tests | class | signature |
| ---: | --- | --- |
| 20 | `FlaskScaffoldingTestCase` | mostly one: `SeqIter.__init__() takes 1 positional argument but 2 were given` |
| 10 | `SuperNewBindingTestCase` | |
| 9 | `EnumAutoAtAssignmentTestCase` | `TypeError: _NT expected at most 1 argument, got 2` |
| 7 | `EnumTupleStorageTestCase` | |
| 6 | `MethodOwnerAndMetaclassTestCase` | |
| 1 | `TypingSurfaceTestCase` | |

The Flask signature is the interesting one and probably not 20 bugs: the
qualname in it is
`TestCase.test_builtin_filter.<locals>.Seq.__iter__.<locals>.SeqIter` -- a
METHOD-LOCAL class from a CPython TEST MODULE, being instantiated inside
jinja2's filter code. That is a class aliasing across modules, which is the
family cut 129 was about (helpers keyed by a class's source offset, filed per
class) and is worth suspecting first. `_NT expected at most 1 argument` has the
same shape: a namedtuple class resolving to the wrong one.

Cluster size is an upper bound on the work, not a measure of it. Six classes,
and the two signatures above may well be one cut.

### Where this leaves the flip

The change is ready and its own tests pass both ways. It must not merge while
the suite it would make the default is red, so the PR is opened as a DRAFT with
this note as its evidence. The order that follows from the measurement is:

1. a flag-on CI job, so this cannot recur silently;
2. bisect #1074..#1084 for the aliasing signature -- cheap, because a single
   test class reproduces it in about a minute rather than the eight a suite
   takes;
3. fix, re-gate, then flip.

### Postscript, 2026-09-23: undrafted

Step 1 happened first, as planned: the flag-on sweep ran on its own branch
(`ci/ir-flag-on-sweep`), `main` was merged into it, and each red run named the
next defect. The aliasing signature was not a range bisect in the end -- it
was a def-registration id built from a per-SESSION counter and compiled as a
literal (#1118, cut 132), and the rest were IR emit copies that had drifted
from their text twins (#1122, #1125, #1128, #1129, #1140; cuts 133-137). The
sweep went green on run 35881184586, and #1148 moves it onto every pull
request.

The two recursion checks that still failed under IR on a Mac were not IR at
all: a GemStone VM defect, Kermit 52108 (`resignalAs:` from the stack-overflow
handler re-trips the limit in the interpreter), reproduced in plain Smalltalk
on branch `repro/resignal-retrip`. #1150 skips exactly those two checks on
interpreted gems; CI, which runs native code, still runs them.

Re-gated with this branch rebased onto main (add51089) plus #1150, Darwin
arm64:

| arm | result |
| --- | --- |
| SUnit, text (`=0`, cold) | `7342 run, 7342 passed, 0 failed, 0 errors`, 8 of 8 shards |
| SUnit, default -- now IR (cold) | `7342 run, 7342 passed, 0 failed, 0 errors`, 8 of 8 shards |
| corpus, text (`=0`) | `OK 83 · FAIL 2 · ERROR 11` |
| corpus, default -- now IR | `OK 83 · FAIL 2 · ERROR 11` |

The regression gate against the committed board reads 0 regressions for the
default arm, and IR against this run's own text board reads 0 regressions and
2 improvements (`test_contextlib_async` 8 -> 7, `test_asyncgen` 6 -> 5). The
53 are gone.
