! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- SystemExit
expectvalue /Class
doit
BaseException subclass: 'SystemExit'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SystemExit comment:
'Request to exit from the interpreter.

This exception is raised by the sys.exit() function.  It inherits from
BaseException instead of Exception so that it is not accidentally caught
by code that catches Exception -- which is the whole point of the class:
``except Exception'' must not swallow an exit request.

``code'' is the exit status, and it is DERIVED from args rather than stored.
CPython''s SystemExit.__init__ sets it from the constructor arguments -- none
means None, one means that argument, more than one means the whole tuple -- so
every construction path already carries the answer in args and a single reader
keeps them agreeing.  A declared ``code'' instVar did NOT: it was never
assigned by anything, so every path would have had to remember to set it, and
none did.  See ``code'' below, and StopIteration >> value, which derives
``value'' from args for the same reason.
'
%

expectvalue /Class
doit
SystemExit category: 'Grail-Exceptions'
%

set compile_env: 1

category: 'Grail-Accessing'
method: SystemExit
code
	"The exit status: CPython's only SystemExit-specific attribute, and what
	sys.exit()'s whole contract is expressed through.  An int is the process
	status, None and 0 both mean success, and a str is a message for stderr.
	Anything that catches SystemExit to decide what happens next reads it --
	``sys.exit(main())'' wrappers, unittest's runner, and test_zipapp's four
	CLI tests, which assert on ``cm.exception.code'' directly.

	CPython's SystemExit_init is the rule, and it is a rule about ARGS:

	    len(args) == 0  ->  None            (the slot is never assigned)
	    len(args) == 1  ->  args[0]
	    len(args) >  1  ->  args            (the whole tuple)

	Grail had the attribute nowhere -- ``SystemExit(1).code'' raised
	AttributeError -- while the class DECLARED a ``code'' instVar that no path
	ever assigned, so the slot could only ever have read nil.  Deriving from
	args instead of filling that slot is what makes this hold for the raise
	paths too: ``sys.exit(3)'', ``raise SystemExit(3)'' and ``SystemExit(3)''
	construct three different ways and all three set args, none of them an
	instVar.  The instVar is gone with this method; a declared slot nothing
	writes is not a smaller bug than a missing attribute, it is the same one
	with somewhere to hide.

	Note what the 0-argument case is NOT: it is not ``args[0] if it happens to
	be None''.  ``SystemExit(None)'' has args ``(None,)'' and code None, and
	``SystemExit()'' has args ``()'' and code None -- the same code from
	different args, which is why the length is what gets tested and not the
	value.

	An explicit ``e.code = 3'' needs no setter: the store lands in
	dynamic-instVar storage, which ___pyAttrLoad___ probes (Phase B) BEFORE the
	value-attribute hook, so the assignment shadows this derivation -- and,
	matching CPython's plain writable member, leaves args alone."

	| a n |
	a := self args.
	n := a @env0:size.
	(n @env0:= 0) ifTrue: [^ None].
	(n @env0:= 1) ifTrue: [^ a @env0:at: 1].
	^ a
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: SystemExit
___pythonValueAttrs___
	"``e.code'' is the exit STATUS, not a callable, so ___pyAttrLoad___ must
	perform the accessor rather than wrap it as a BoundMethod -- otherwise
	``e.code'' answers ``<BoundMethod object ...>'', which is truthy, so
	``if e.code:'' takes the failure branch on a successful exit and every
	comparison against a status silently disagrees instead of erroring.

	Extends the inherited set (args / __traceback__ / the chaining trio) rather
	than replacing it; BaseException builds a fresh IdentitySet per call, so
	adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'code';
		yourself
%
