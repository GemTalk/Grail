## The class-body helper was not a frame: a wrong answer behind a refusal (2026-09-15)

Not an eligibility cut — no census row moves. It came out of looking at
`cm:classDef:bodyStatement` (4), and it is the reason that row is still open.

**The widening itself was easy and the gates were green.** Allowing `if` / `for`
/ `with` / `del` / `try` in a method-local class body needs one declaration —
the helper must declare the `___curPos___` the ordinary statement emitters store
into — and it measured 7/7 probe shapes correct, 0 fallbacks, `cm:eligible`
13209 → 13213, flag-on cold suite 6828/6828.

**It was the wrong thing to ship, and the reason only shows up if you look at a
traceback rather than a value.** The IR path compiles a method-local class body
into a helper method of its own. That helper had neither a Python NAME nor a
derivable LINE, so `BaseException`'s capture walk skipped it — *"a non-nil
derived line is what IDENTIFIES a Python frame"* — and an exception raised while
the body ran lost the line it happened on:

```
CPython      make @ 'class C:'   +   C @ 'b = 1 // 0'
Grail text   make @ 'b = 1 // 0'         (the body is inlined in make)
Grail IR     make @ 'class C:'           (the failing line is GONE)
```

That is live on `main` today for the simple class bodies the IR path ALREADY
compiles. The widening would have extended it to four more sites, in
`test_enum` and `test_scope` — so the row is blocked behind this, not by it.

### Three pieces, each necessary, none sufficient

* the helper's source now carries the `___GRAILPOS___` map the class emit
  already built — **the generating `PrettyWriteStream` had it all along and
  nobody harvested it**, so this piece is three lines and a shift;
* `___tracebackLineForMethod___:` consults that map even when the `___curPos___`
  scan found nothing. That is not a relaxation of the "is this generated
  Python" test but the same test read off a better source: only codegen writes
  either;
* `___pythonFrameNameForMethod___:` parses the helper's selector
  (`___irClassDef_<offset>_<Name>___`) and answers the CLASS NAME, which is what
  CPython calls a class-body frame.

Reverting them one at a time fails 3, 3 and 1 of the five tests.

### The IR path is now the more accurate of the two

```
CPython      make @ 'class C:'   +   C @ 'b = 1 // 0'
Grail IR     make @ 'class C:'   +   C @ 'b = 1 // 0'      <- exact
Grail text   make @ 'b = 1 // 0'                           <- no class frame
```

The text has no class-body frame to name, because it inlines the build into the
enclosing def. Pinned by `testTheTextPathStillHasNoClassBodyFrame` so the
asymmetry is a measurement rather than a remark — the same treatment the
eval-nested cut's parameter asymmetry got.

One shape stays an XFAIL: a class nested INSIDE a method-local class body. Only
the outermost becomes a helper, so the inner build is inline within it and the
failing line is reported under the OUTER class's name — one frame short of
CPython, with the line present, which is what had been lost.

### What this leaves for `classDef:bodyStatement`

The widening is unblocked and is its own PR: with the class-body frame carrying
a name and a line, admitting control flow no longer spreads a wrong answer. It
is parked rather than abandoned.
