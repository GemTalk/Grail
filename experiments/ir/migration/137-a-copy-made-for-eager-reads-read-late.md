## A copy made for eager reads, read late

With #1128 and #1129 in, the flag-on sweep was down to one new check, from
`b7363dca` (test_annotationlib, merged the same day):

```
[FAIL] AnnotationMachineryTestCase  method_nested_class_nonlocal
       "NameError: name 'later' is not defined"  vs  "ok -> ('later', <class 'list'>)"
```

```python
class _Holder:
    def nonlocal_in_class(self):
        class Demo:
            nonlocal later
            x: later
        refs = get_annotations(Demo, format=Format.FORWARDREF)
        later = list
        return refs['x'].__forward_arg__, refs['x'].evaluate()
```

### The mechanism, and why the annotation only exposed it

A class statement inside an IR-built def runs as a compiled-text helper, and a
carried `nonlocal` name reaches it as a reader block. Methods call that block,
so they read the enclosing binding at read time. The helper **also** seeds a
temp of the name's own spelling from the block once, on entry -- documented,
deliberately, "for the reads the class emit makes eagerly at class-creation
time (a base expression, a class attribute's value, a method's def-time
default), which is exactly when the text evaluates them too".

What that left out is class-level code that runs **later**. Before PEP 649 it
was a lambda or a lazy generator expression; since `b7363dca` it is every
class-level annotation. Each read the copy. Measured before the fix:

| case | CPython | text | IR |
| --- | --- | --- | --- |
| class body writes, then reads | (2, 2) | (2, 2) | (2, 2) |
| enclosing changes; a **method** reads | 5 | 5 | 5 |
| enclosing changes; a class-level **lambda** reads | 5 | 5 | **1** |
| bound only after; a class-level lambda reads | 'set after' | same | **UnboundLocalError** |

So a pre-existing IR defect since `nonlocal` names were first carried, which
the new annotation test was the first thing to exercise.

### The fix: refuse, narrowly

`classDef:deferredReadOfNonlocal` refuses a class whose class-level code reads
a `nonlocal` name inside a lambda, a generator expression or an annotation
(a method's parameter and return annotations included, since PEP 649 defers
them too). Method bodies are not walked -- they read through the cell and are
right. The def then compiles as text, which is correct today. Making the emit
read those through the block is the widening that can follow, with this test
as its oracle.

### The control, and the positive control

`IRClassDeferredNonlocalTestCase` forces IR. Its `testTheRefusalIsNarrow`
asserts that `write_then_read` -- a class that declares `nonlocal` and reads
nothing late -- is **still IR-built**, and that each late-read shape is not,
so the fix cannot pass by refusing every such class.

| tree | flag off |
| --- | --- |
| with the fix | 3 run, 3 passed |
| refusal reverted | 3 run, **0 passed, 3 failed** |

### Gates

| gate | result |
| --- | --- |
| fixtures | 449 fixtures, 7462 OK, 53 XFAIL, all agreeing with CPython |
| full suite, text | 7299 run, 7299 passed, 0 failed, 0 errors (8 of 8) |
| full suite, IR on | 7299 run, 7297 passed, 1 failed, 1 errors (8 of 8) |
| corpus, default | `0 regression(s), 3 improvement(s)` |
| corpus, **IR vs text** | **`0 regression(s)`**, IR better on 2 rows |

The IR-vs-text corpus row is the first with no module worse under IR. The two
IR-on suite defects left are the recursion-depth pair: Darwin-only, and the
same mechanism reproduces on the text path (see the stack-exhaustion memory).
