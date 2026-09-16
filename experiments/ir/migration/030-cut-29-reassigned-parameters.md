## Progress — cut 29 (reassigned parameters)

A Smalltalk method argument is read-only and comgen refuses the store outright
(`emitStore: unexpected store to method or block arg` -- probe 01, rungs 5-6),
so a parameter the body rebinds arrives under a TRANSPORT name and is copied
into a temp of its own name before the body runs: the text's ``_x'' argument
and ``x := _x'' opener, reproduced by `___installIRMethodBodyOn___:`.  The
transport is ``_x'' unless that collides with another parameter, a body local
or a module instVar, else ``___<i>'' (the text's rule).  Reads of ``x'' in the
body resolve to the temp because the temp is what `leafFor: #x` answers; the
flow analysis already seeds `bound` with every parameter, which the opener
makes true.  `___irAllParamsAreReadOnlyArgs___` now refuses only a DELETED or
a pseudo-variable parameter (the latter cannot be a temp; the text renames its
reads instead).

Fixture: clamp (two conditional rebinds), accumulate (aug-assign to a param
inside a for), normalize (chained rebinding through attribute calls); compiled
100 -> 103.

### The cold-shard flag-on ERRORs are AlmostOutOfMemory, and importlib's handler makes them fatal

Captured from the cut-29 sweep's shard log before it was wiped:
`PropertyNotDynamicClassAttributeTestCase>>testHelpOnAnEnumPrintsCPythonsHeading`
ERRORed with **`AlmostOutOfMemory` (notification 6013), "Session's temporary
object memory is almost full"**, signalled asynchronously during
`Behavior>>methodDictForEnv:` inside `___pyAttrLoad___:` -- deep in a COLD
`importlib loadModuleFromPath:name:`.  The frame that turned a notification
into a test ERROR is importlib's own: the module body runs under

    [...] on: AbstractException do: [:ex | self removeModule: moduleName. ex outer]

and `AbstractException` includes every Notification, so a memory-pressure
warning UNLOADS the module being imported and hands the notification up to
SUnit's runCase, which reports it as an error.  Three different classes have
now shown exactly this shape (enum help, Unicode names, codecs), always in a
cold shard, always green alone -- the pressure is GRAIL_TEST_COLD=1 (every
shard compiles every framework) plus the IR builder's node garbage per def.
Not an emit defect, and not flag-specific in principle: any cold shard near
the temp-memory ceiling can trip it.  Two follow-ups, both outside the IR
cuts: (a) the handler should not unload on a Notification -- `on: Error` (or
excluding Notification) keeps a warning a warning; (b) the sweep could raise
GEM_TEMPOBJ_CACHE_SIZE for cold flag-on shards.  Recorded here so the next
sweep does not re-triage it.
