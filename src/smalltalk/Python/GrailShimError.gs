! ------------------- Superclass check
run
Error ifNil: [self error: 'Error is not defined. Check file ordering.'].
%

! ------- GrailShimError - the C shim's own error, and ONLY the C shim's
expectvalue /Class
doit
Error subclass: 'GrailShimError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailShimError comment:
'The exception the C shim raises across the user-action boundary, and the only
thing CPythonShim>>___shimUserAction:withArgs: catches.

WHY IT IS ITS OWN CLASS.  The wrapper used to catch plain ``Error'', which
matched two completely different things:

  * what raise_error() in src/c/shim/cpython.cc signals.  That arrives with the
    C frames ALREADY UNWOUND -- GciRaiseException unwinds before it signals --
    so a handler may safely re-signal it as a Python exception, which is the
    whole job of ___translateShimError:.

  * an exception signalled INSIDE a callback the user action made back into
    Smalltalk.  Smalltalk runs a handler on top of the signalling frame, so
    that handler runs with the user-action C frame still LIVE beneath it, and
    from there NOTHING terminating is legal: ex return: is refused with 2758
    (ERR_EXC_RETURN_DISALLOWED) and re-signalling crosses the frame again.
    ___translateShimError: does exactly that, which is how one recoverable
    LookupError became a re-signal loop ending in AlmostOutOfStack and
    UncontinuableError 6011.  Measured: bypassing the wrapper gave ONE clean
    error and no loop.

Matching only this class means the second case finds NO handler, so the VM''s
default action runs, GciPerform traps it, and the C side gets the real
exception in GciErrSType>>exceptionObj -- which check_gci_error() translates
and the boundary then raises AS a GrailShimError, with the C frames unwound.
Same destination, reached the one way the VM permits.

See docs/GemStone_Feature_Requests.md 1.5 for the measurements, and note that
this does not make the cross-frame unwind legal -- it stops Grail needing it.'
%

expectvalue /Class
doit
GrailShimError category: 'Grail-Shim'
%
