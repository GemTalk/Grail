## `classDef:bodyStatement`: one declaration, once the frame it makes was real (2026-09-15)

`cm:classDef:bodyStatement` (4). A class body's DECLARATIVE statements — defs,
nested classes, a docstring, a plain or annotated assignment — are emitted by
ClassDefAst's own branches and stamp no position. An `if`, `for`, `with`, `try`,
`del` or augmented assignment falls through to the ORDINARY statement emitters,
which store a `___curPos___` the class-body helper did not declare.

**The declaration is the whole cut** — two lines, conditional on the body
actually having control flow, so a declarative body's helper is unchanged.

**It was parked for a tick, and that was the point.** `___curPos___` is also
what `PyFrame>>___namesIncludeCodegenMarker___:` reads to decide a frame is
generated Python, and the class-body helper had neither a Python name nor a
position map — so declaring it turned the helper into a frame the traceback
machinery could not describe. That defect was already live for the simple
bodies the IR path compiled; admitting these four would have spread it to
`test_enum` and `test_scope`. The [class-body frame cut](#the-class-body-helper-was-not-a-frame-a-wrong-answer-behind-a-refusal-2026-09-15)
landed first, and this one sits on top of it. Measured on the shape that was
refused:

```
CPython     raises_… @ 'class C:'   +   C @ 'b = 1 // 0'
Grail IR    raises_… @ 'class C:'   +   C @ 'b = 1 // 0'      <- exact
```

That is why the fixture's last check is a traceback and not a value.

### All four sites are real code, and between them use four statements

| site | statement |
| --- | --- |
| `test_enum` `_EnumTests.setUp` | `if` / `else` picking a member |
| `test_enum` `TestSpecial.test_ignore` | `for` over `vars()`, building members |
| `test_enum` `TestEnumDict.test_enum_dict_in_metaclass` | `with self.assertRaises(...)` |
| `test_scope` `testClassNamespaceOverridesClosure` | `del` of a class-body name |

### The control caught a flaw in the test, not in the cut

An eligibility refusal never reaches the seam, so it is **not** a fallback: the
refused methods compile the old way, every value stays right and `fallbacks`
reads 0 either way. So the cut needs a CENSUS assertion — and the first version
of that assertion guarded itself on `___irCodegenEnabled___`, the AMBIENT flag,
which is false in the flag-off suite. It returned before measuring anything and
passed with the refusal restored. Guarded on `___irCodegenSupported___` instead
(the helper forces the seam on itself), it fails with the other two.

Three of the four tests fail when the refusal is put back.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:classDef:bodyStatement` | 4 | **0** |
| `cm:eligible` | 13213 | **13217** |

Four retired, **+4 net** — nothing moves up behind it. Same-tree baseline
measured by reverting `ClassDefAst.gs` alone to this branch's base, re-running
`install.sh` and censusing again. `CENSUS.md` still wants one combined
re-measure once the family has landed.
