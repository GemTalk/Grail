## Progress — cut 34 (the `with` statement)

printItem:onStream:'s nest, one ``[:___cm___ | ...] value: (expr)'' per item,
innermost item running the body.  Inside each block the same sends as the
text: ``PythonCoroutine @env0:___grailAwait___: ((___cm___ @env1:___pyAttrLoad___:
#'__enter__') @env1:value: { } value: nil)'' stored into the ``as'' target (any
store shape the cut-33 unpack emitter knows -- a name, an attribute, a
subscript, a tuple on holder ``___tgt____n''), the body under ``@env0:on:
BaseException do:'' with the control-flow-signal filter (PythonReturn / Break /
Continue get a clean __exit__ and ``pass''), and the exceptional __exit__ run
under ``BaseException ___whileHandling___:do:'' on the PAYLOAD with a falsy
result re-``pass''-ing the exception.

Two departures, both because an IR ``return'' is a real ``^'' (returnFromHome)
where the text signals PythonReturn for its own handler to catch:

* the CLEAN __exit__(None, None, None) runs from an ``ensure:'' block, guarded
  by a ``___handled___'' block temp the handler sets first, instead of the
  text's ``(protected) == true ifTrue: [...]'' after the on:do:.  A ``^'' out of
  the body never reaches the handler, but ensure blocks run on every unwind,
  so the manager still exits cleanly on return; a handled exception -- passed
  on or suppressed -- set the flag, so it gets no second __exit__, exactly the
  double-call the text's ``else'' placement fixed;
* there is no ``___val___'' temp: the enter value goes straight into the target
  (or is evaluated for effect when there is none).

`AsyncWithAst` (a subclass) never qualifies.  Flow: items in order -- each
manager expression's reads must be bound by what precedes it and its target
names join the set (``with a() as x, b(x) as y'') -- then the body walks from
that set; afterwards only the targets count as bound, since a suppressed body
exception skips the rest of the body.  The control-signal filter moved to
StatementAst>>___emitIRControlSignalGuard___:on: (TryAst still carries its own
copy; a later tidy).

Fixture: two text-compiled managers (Ctx logging enter/exit and optionally
suppressing; Pair whose __enter__ answers a tuple) and with_plain, with_target,
with_return (+ with_return_log asserting the clean exit ran on the ``^''),
with_raise, with_suppress, with_two, with_break, with_tuple; compiled
128 -> 137, first try.

Cut 34 flag-on sweep: the known families, one AlmostOutOfMemory ERROR
(`SmalltalkForwarderTestCase>>testStaticmethodKeywordForwarder`), and one NEW
member of the PEP 657 column family:
`WithItemPositionsTestCase>>testTheColumnsIdentifyWhichManagerFailed` reads
``[None, None]'' for ``[22, 34]'' -- the manager expression's COLUMNS in the
frame that blames a raising __init__.  The line is right (the sibling tests
pass; the enter-call send is stamped at the manager expression's offset); IR
frames carry no columns until the (method, ip) -> span side table exists.
