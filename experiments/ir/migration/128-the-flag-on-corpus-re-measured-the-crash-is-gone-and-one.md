## The flag-on corpus re-measured: the crash is gone, and one regression is bisected

Both arms on `main` at cdcd4776, same machine, back to back inside ONE stone
lock, 2026-09-20. This is the first flag-on corpus measurement since 2026-09-10
(#909 in the container, 73eacc77 natively) and the first on a tree containing
the class-method family.

| | flag OFF | flag ON |
| --- | ---: | ---: |
| OK | 74 | **72** |
| FAIL | 3 | **4** |
| ERROR | 17 | **18** |
| SKIP | 1 | 1 |
| IMPORTERROR | 9 | 9 |
| CRASH | **0** | **0** |
| TIMEOUT | 0 | 0 |
| wall | 421s | 456s |

The seam was live in the flag-on arm, which has to be established before any of
these numbers mean anything -- a corpus that silently fell back to text scores
exactly like flag-off:

```
flag off:  IRFLAG|false   compiled->0    fallbacks->0
flag on:   IRFLAG|true    compiled->101  fallbacks->0
```

(one `textwrap` import, the same control 73eacc77 used, same 101.)

### The structural blocker from 2026-09-10 is closed

`test.test_set` was `OK -> CRASH` (`VM temporary object memory is full`) in BOTH
of the September 10 measurements, container and native, and cut 92 called it
"the structural item". **It is `OK` in both arms now and there is no CRASH
anywhere in the corpus.** The per-class ~18 KB session cost that caused it was
diagnosed as not-an-IR-bug (both arms leaked at the same rate; flag-on merely
ran steeper and died first), so what closed it was the per-class cache work,
not anything in the IR path.

The wall time reads +8%, near the flag-off run-to-run spread, and nothing like
the 1.9x that #909 measured under emulation and 73eacc77 withdrew.

### Five modules differ, and three are BETTER under IR

| module | flag OFF | flag ON | |
| --- | --- | --- | --- |
| test.test_asyncgen | FAIL f=6 | FAIL f=5 | better |
| test.test_contextlib_async | ERROR e=2 | ERROR e=1 | better |
| test.test_xml_etree | ERROR e=35 | ERROR e=34 | better |
| test.test_traceback | OK | **FAIL f=1** | known since 2026-09-10 |
| test.test_datetime | OK | **ERROR e=3** | new |

Gone from September's list entirely: `test_set`, `test_copy`, `test_global`,
`test_codecs`, `test_funcattrs`. The gate is down to two modules.

### test_datetime is a real defect, and it is bisected

Three identical errors, one per `theclass` subclass of
`test_strftime_with_bad_tzname_replace`:

```
a MyTzInfo class does not understand #'___irClassDef_91742_MyStr___' (env 1)
```

The shape is a class inside a method of a method-local class:

```python
class MyTzInfo(FixedOffset):          # method-local, in the test method
    def tzname(self, dt):
        class MyStr(str):             # one level deeper
            def replace(self, *args):
                return None
        return MyStr('name')
```

`git bisect` over the 149 first-parent commits since the last clean
measurement, discriminating on the DNU string rather than on the module's
OK/ERROR status so an unrelated failure could not steer it, names

**641ce7d1 -- "IR: a class nested in a method-local class's method" (#983)**

whose entire diff to the emitter is the deletion of one line from
`FunctionDefAst>>___irMethodLocalClassMethodReason___`:

```smalltalk
- self ___irSubtreeContainsClassDef___ ifTrue: [^ #'method:methodLocalNestedClass'].
```

Both endpoints were verified before bisecting (the good end at 73eacc77 answers
`OK 1`, the bad end reproduces 3 DNUs); without that check bisect answers
confidently and wrongly.

### What this says about the cut, and about fixtures

That cut's claim was that the guard turned away a shape the transport already
handled, so removing it was the whole change. It distrusted the claim in the
right way -- the fixture went three levels deep, shared a capture across several
methods, used a base expression and resolved both class-cell readers against
the inner class -- and all nine checks agreed with CPython under IR, 0
fallbacks.

The corpus still found a shape the fixture did not have. **A fixture that
stresses the family is evidence about the family it imagined, not about the
family.** What the corpus has and the fixture lacked is the leaf class
inheriting from a BUILTIN (`class MyStr(str)`) rather than from a fixture class
or `object`, inside a method of a class whose own base is method-local.

Two ways out, not yet chosen:

* **restore the guard** -- the shape returns to the text transport, the
  `method:methodLocalNestedClass` row reopens with 11 methods, and the flag-on
  regression closes today;
* **install the helper on the class that is asked for it** -- the selector is
  looked up on `MyTzInfo class` and lives elsewhere, so the transport is
  choosing the wrong holder for the one-level-deeper case.

The second is the real fix and needs the holder decision traced; the first is
honest and costs eleven methods.
