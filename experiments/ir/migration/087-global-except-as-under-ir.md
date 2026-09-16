## Progress — `global` + `except ... as` under IR (2026-09-10)

Second item off the readiness queue. Again not a coverage cut.

`test.test_global` was `OK` flag-off and `ERROR 1` flag-on:
`KeyError: 'name_caught_exc'` from `test_caught_exception`, which declares
`global name_caught_exc` and then binds it with `except ZeroDivisionError as
name_caught_exc`, reading `globals()[...]` inside the handler.

**Cause, and why it needed two fixes.** The IR emit assigned the payload to a
METHOD LOCAL. That looks impossible for a `global`-declared name -- the parser
strips such names from `writes`, which is why plain `global x; x = 1` has no leaf
and routes to the module already (cut 69) -- but an `except`-as / `with`-as
TARGET is recorded in `body.variables` whichever way it is declared. So a leaf
existed, the plain assign compiled and ran without complaint, and `globals()`
kept the old value. Measured directly: with `E1 = 0` at module scope,
`type(globals()['E1']).__name__` answered `int` under the flag where both the
text path and CPython answer `ZeroDivisionError`.

Routing the STORE through a new `___emitIRModuleScopeStoreOf___:from:on:` -- the
IR twin of the text's `___emitModuleScopeStoreOf___:from:on:`, deciding by the
same four-way rule rather than a second copy of it -- then exposed the other
half: the handler-body READ still took that local, so it answered `None`. A
`global`-declared name is a module binding for the whole scope and never a
local, so the declaration now precedes the leaf in `___emitIRValueOn___:` too.
Both halves are needed; either alone is wrong in a different way.

**`with ... as` was measured and was already correct** on both paths, so
`except`-as was the only broken form of the two. It is asserted alongside
anyway, being the sibling caller of the same helper.

**The fixture that should have caught this enumerated ten binding forms and
omitted these two.** `GlobalBindingFormsTestCase` exists because "``global
NAME'' was honoured by exactly ONE binding form" -- it covers class, def,
walrus, match, match-star, match-as, import, unpack, augassign and plain. The
two forms it does not cover are `except`-as and `with`-as, which are exactly the
two callers of the helper that file's fix introduced. Both are now in it (18
claims, all measured against CPython).

**Result.** `test.test_global` `ERROR 1` -> **`OK`** on the flag-on arm. Gates:
flag-off `6593 run, 6593 passed`; flag-on cold `6593, 1 error`
(`PrivateNameMangling` alone). All three changed emitters are IR-only, so the
flag-off arm cannot move.
