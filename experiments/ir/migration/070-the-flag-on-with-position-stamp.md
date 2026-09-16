## Progress — the flag-on `with` position stamp (2026-09-10)

The first item taken off the readiness queue the flag-on CPython board opened.
Not a coverage cut: no census row moves.

`test.test_with` was `OK` flag-off and `FAIL 1` flag-on, on
`NestedWith.testExceptionLocation`, with the signature
`AssertionError: 'self.Dummy()' != 'self.ExitRaises()'`. Reproduced locally
before touching anything -- one module, flag off `OK 1`, flag on `FAIL 1`.

**Cause.** CPython pins a raise out of `__init__` / `__enter__` / `__exit__` to
the CONTEXT MANAGER EXPRESSION, precisely so `with A(), B(), C():` says which one
failed. `___emitIRItem___:` stamps its own item at entry -- and then its block
emits **item N+1 recursively**, because that is how the nest is built. Item N's
handler and ensure block, which hold item N's three `__exit__` call sites, are
emitted *after* that recursion has re-stamped the builder with N+1's expression.
So `with ExitRaises(), Dummy() as d:` blamed `Dummy()`.

**Fix.** Stamp inside `___emitIRProtocolCall___:...at:`, not at the call site.
It cannot be done by the caller: building the argument array is itself emission
and re-stamps the builder before the method is entered. The stamp has to be the
last thing before the send it labels. `AsyncWithAst` inherits the method and so
the fix.

**Why the test case built for this missed it.** `WithItemPositionsTestCase`
already drove `with ExitRaises(), Dummy() as d:` -- and asserted only the LINE.
Both managers sit on one line, so `exit_raises_line` reads `[63, 63]` whichever
is blamed; the columns are the entire point of the file and only the INIT case
had them. `exit_raises_columns` and `enter_raises_columns` are now asserted,
measured from CPython (`[13, 25]`, `[13, 26]`). Verified by **positive control**:
with the emit fix reverted the new assertion fails on the flag-on arm and
nothing else new does, so the test has detection power and the fix is what fixes
it.

The fixture additions are appended at the TAIL on purpose -- three expectations
in that file encode ABSOLUTE line numbers, and an insertion mid-file silently
invalidates them (it did, in three tests, before being moved).

**Gates.** flag-off `6593 run, 6593 passed`; flag-on cold `6593, 1 error`
(`PrivateNameMangling` alone). Tier 2 flag-off reports two rows, NEITHER
attributable: this change is IR-emit code and `run_cpython_suite.sh` does not set
the flag, so it is unreachable in that run. Measured per module: `test_decimal`
reads fail+err 10 on this machine even run ALONE against a CI baseline of 9 -- an
unexplained platform delta, worth chasing rather than baselining, in the class of
the old `test_traceback` 14-vs-16 story; `test_urllib2_localnet` reads **9 alone**
and 10 in the full run, so it is suite-order-dependent.
