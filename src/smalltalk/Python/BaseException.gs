! ------------------- Superclass check
run
(Globals at: #Exception) ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- NOTE: All Python exceptions are now created as Python classes
! ------- to ensure proper inheritance from BaseException and access to __new__ methods.
! ------- Previously, some exceptions were mapped to GemStone classes, but this
! ------- broke the inheritance chain and prevented access to Python exception methods.

! ===============================================================================
! Python Exception Class Definitions (as the install user)
! ===============================================================================
! Define Python exception classes BEFORE switching to SystemUser.
! This ensures that exception classes like IndexError, ValueError, TypeError
! are available when we import methods for base classes (which may reference them).
! We use GemStone's Exception as the base for Python's BaseException to ensure
! compatibility with GemStone's exception handling mechanism.
! ===============================================================================

! ------- BaseException (Python's root exception class)
expectvalue /Class
doit
(Globals at: #Exception) subclass: 'BaseException'
  instVarNames: #( args tracebackObj )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BaseException comment:
'Python BaseException - root of Python exception hierarchy.

This is the base class for all built-in exceptions in Python.
It inherits from GemStone''s Exception to integrate with GemStone''s
exception handling mechanism.

Instance variables:
  args - tuple of arguments passed to the exception constructor
         (Note: This is separate from GemStone''s gsArgs instance variable)
'
%

expectvalue /Class
doit
BaseException category: 'Grail-Exceptions'
%

! ===============================================================================
! BaseException Methods (Python 'BaseException' type)
! ===============================================================================
! This file contains method implementations for the BaseException class,
! which is the root of Python's exception hierarchy.
!
! BaseException inherits from GemStone's Exception to integrate with GemStone's
! exception handling mechanism.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from BaseException
expectvalue /Metaclass3
doit
BaseException removeAllMethods: 1.
BaseException class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: BaseException
__new__
	"``ExceptionClass()`` as an expression — the class-call fast path
	(CallAst >> printBareCallClassNewOn:) emits ``(cls @env1:__new__)``
	with the exception class as the RECEIVER and the constructor
	arguments as the keyword arguments.  Construct without signaling:
	``e = ValueError(); raise e`` signals later via RaiseAst's
	``@env0:signal`` form.

	NOTE: the previous ``__new__: cls`` / ``__new__: cls _: anArray``
	forms here followed the explicit-cls convention of a dispatcher
	that prepended the class argument; through the fast path that
	bound the FIRST CONSTRUCTOR ARGUMENT as ``cls`` and sent
	``___new___`` to a string.  No senders of the old forms remain."

	| instance |
	instance := self ___new___.
	instance ___args___: #().
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1
	"``ExceptionClass(arg)`` as an expression — one constructor argument."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1 _: arg2
	"``ExceptionClass(a, b)`` as an expression."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1. arg2 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1 _: arg2 _: arg3
	"``ExceptionClass(a, b, c)`` as an expression."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1. arg2. arg3 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
__new__: arg1 _: arg2 _: arg3 _: arg4 _: arg5
	"``ExceptionClass(a, b, c, d, e)`` as an expression —
	UnicodeDecodeError / UnicodeEncodeError take five arguments."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1. arg2. arg3. arg4. arg5 }.
	^ instance
%

category: 'Grail-Initialization'
classmethod: BaseException
___signal___: message
	"Create and signal an exception with proper Python args."

	| instance |
	instance := self ___new___.
	instance ___args___: { message }.
	instance ___applyImplicitContext___.
	instance ___signal___: message.
%

set compile_env: 0
category: 'Grail-Initialization'
classmethod: BaseException
___hasUserInit___
	"True if this class defines its OWN Python __init__ (any arity) somewhere
	below BaseException — i.e. a user-defined exception (or a library one like
	werkzeug's HTTPException/BuildError) that must run __init__ when raised.
	Built-in exceptions inherit BaseException's __init__ and return false."

	| c |
	c := self.
	[c notNil and: [c ~~ BaseException]] whileTrue: [
		| md |
		md := c methodDictForEnv: 1.
		((md includesKey: #'__init__')
			or: [(md includesKey: #'__init__:')
			or: [(md includesKey: #'__init__:_:')
			or: [(md includesKey: #'__init__:_:_:')
			or: [md includesKey: #'___init__:kw:']]]])
				ifTrue: [^ true].
		c := c superclass.
	].
	^ false
%
set compile_env: 1

category: 'Grail-Initialization'
classmethod: BaseException
___signalNew___: positional kw: kwargs
	"``raise Cls(*positional, **kwargs)`` — construct with the FULL args tuple,
	run any user-defined __init__ (the plain ___signal___: path skips __init__
	and keeps only the first arg), then signal.  Built-in exceptions inherit
	BaseException's __init__ so they skip the __init__ call but still receive
	the complete args tuple."

	^ self ___signalNew___: positional kw: kwargs cause: nil
%

category: 'Grail-Initialization'
classmethod: BaseException
___signalNew___: positional kw: kwargs cause: aCause
	"``raise Cls(*positional, **kwargs) from aCause''.  As ___signalNew___:kw:,
	but the cause is applied to the freshly built instance BEFORE it is
	signalled -- ``__cause__'' has to be in place by the time any handler sees
	the exception.  nil aCause means there was no ``from'' clause at all (as
	distinct from ``from None'', which arrives as the None singleton)."

	| instance |
	instance := self ___new___.
	instance ___args___: positional.
	(self @env0:___hasUserInit___) ifTrue: [
		(instance ___pyAttrLoad___: #'__init__') value: positional value: kwargs
	].
	"Implicit context BEFORE the explicit cause: ``raise X from Y'' records both,
	and ___applyCause___ must not find the slot already occupied by its own Y."
	instance ___applyImplicitContext___.
	aCause == nil ifFalse: [BaseException ___applyCause___: aCause to: instance].
	"Signal WITH a message so GemStone's ``messageText'' / ``description''
	carry it -- the old ___signal___: path set this, and a bare ``signal''
	would leave it nil (``ValueError(''x'') description'' would drop the
	''x'').  Use the first positional argument, exactly as the old path
	did: it's the conventional exception message and avoids invoking the
	exception's ``__str__'', which can touch attributes a user __init__
	hasn't set (e.g. itsdangerous BadData.__str__ reading self.message)
	and would raise the WRONG exception out of a raise."
	^ instance ___signal___:
		((positional @env0:isEmpty) ifTrue: [''] ifFalse: [positional @env0:at: 1])
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___pyRaise___: excValue
	"``raise excValue`` (the expression form).  CPython: a BaseException subCLASS
	is signalled (``raise ValueError'' behaves like ``raise ValueError()''); a
	BaseException INSTANCE signals itself; anything else -- a plain class, a str,
	a number -- raises ``TypeError: exceptions must derive from BaseException''.
	excValue is an ARGUMENT (not the receiver) so a non-exception can't die on a
	MessageNotUnderstood for #signal (test_baseexception test_raise_string /
	test_raise_new_style_non_exception)."

	^ self ___pyRaise___: excValue cause: nil
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___pyRaise___: excValue cause: aCause
	"``raise excValue from aCause''.  nil aCause means there was no ``from''
	clause; ``from None'' arrives as the None singleton, which suppresses the
	context without recording a cause.

	The instance branch must NOT always #signal.  ``except E as e: raise e''
	re-raises the very exception being handled, and GemStone refuses to signal
	one a second time (UncontinuableError 6011, 'Exception has already been
	signaled').  #pass is the primitive for continuing an exception already in
	flight, and it preserves object identity -- CPython requires the caught
	object to BE the one raised.  #_handlerActive is the kernel's own test for
	``a handler is running for this exception'', true both in the handler block
	and in any frame beneath it (so a helper that re-raises works too), and
	false for an exception that was merely stashed and raised after its handler
	unwound -- which must still take the ordinary #signal path."

	(excValue @env0:isKindOf: Behavior) ifTrue: [
		((excValue == BaseException) or: [excValue @env0:inheritsFrom: BaseException])
			ifFalse: [^ TypeError ___signal___: 'exceptions must derive from BaseException'].
		"A bare class has no instance to hang __cause__ on, so ``raise Cls from
		C'' has to build one; without a cause keep the cheaper direct signal."
		aCause == nil ifTrue: [
			"...and neither does it for the IMPLICIT context, so when there is an
			exception being handled, build the instance rather than signalling the
			class directly.  ``raise KeyError'' inside an ``except'' must record the
			handled exception as __context__ exactly as ``raise KeyError()'' does
			(test_traceback's PyExcReportingTests test_context).  With nothing being
			handled -- the common case -- keep the cheaper direct signal."
			(BaseException @env0:___currentException___) isNil
				ifTrue: [^ excValue @env0:signal].
			^ excValue ___signalNew___: (Array @env0:new) kw: nil cause: nil].
		^ excValue ___signalNew___: (Array @env0:new) kw: nil cause: aCause].
	(excValue @env0:isKindOf: BaseException) ifTrue: [
		"An ALREADY-BUILT exception gets its context here: ``raise z from e''
		re-raises an instance, and CPython records the handled exception as its
		__context__ just as for a fresh one.  ___applyImplicitContext___ declines
		to chain an exception to itself, which is what ``except E as e: raise e''
		does, and declines to build a cycle."
		excValue ___applyImplicitContext___.
		aCause == nil ifFalse: [self ___applyCause___: aCause to: excValue].
		(self ___isInFlight___: excValue) ifTrue: [^ self ___passOrSignal___: excValue].
		^ self ___signalOrPass___: excValue].
	^ TypeError ___signal___: 'exceptions must derive from BaseException'
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___isInFlight___: excValue
	"Is excValue the exception this session is currently HANDLING?

	Grail's own ___currentException___ is the authority here, NOT the kernel's
	#_handlerActive.  TryAst sets it on except-handler entry and restores the
	prior value from an ensure:, so it unwinds correctly however the handler is
	left -- including a Python ``return'' out of the except body.
	#_handlerActive does not: after such a return it stays stuck true, so a
	LATER re-raise of that same exception object misroutes into #pass, skipping
	the handler that should have caught it.  ___currentException___ also stacks
	properly for nested handlers, which is what makes ``different exception
	raised inside a handler'' fall through to the ordinary #signal path."

	^ excValue == (self @env0:___currentException___)
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___passOrSignal___: excValue
	"#pass an exception ___isInFlight___ says is being handled, falling back to
	#signal if the kernel cannot actually reach the handler frame.

	The two do not agree in every case: #_handlerActive can answer true while
	#pass still fails with ``ImproperOperation: cannot find handler frame for
	exception'' -- e.g. re-raising an exception stashed out of a handler that
	has since unwound in a way that leaves the flag set.  Without this fallback
	that surfaces as an UNCATCHABLE Smalltalk error, which no Python
	``try''/``except'' can contain; #signal at worst raises the ordinary
	already-signalled error, which is strictly better to hand back.

	The fallback is inside the handler block so the failed #pass has fully
	unwound before #signal is attempted."

	^ [excValue @env0:pass]
		@env0:on: (Globals @env0:at: #ImproperOperation)
		do: [:e | e @env0:return: (excValue @env0:signal)]
%

category: 'Grail-Recursion'
classmethod: BaseException
___recursionGuard___: aBlock
	"Evaluate aBlock -- an entry into Python execution -- converting GemStone's
	AlmostOutOfStack notification into CPython's catchable RecursionError.
	Runaway Python recursion otherwise exhausts the Smalltalk stack and raises
	a notification no Python ``try''/``except'' can contain, killing the whole
	evaluation instead of raising the RecursionError CPython promises.

	#resignalAs: is what makes ONE guard at the boundary enough, with NO
	per-call cost: it restarts the handler search from the ORIGINAL signal
	point, deep inside the recursion, so a Python ``except RecursionError:'' at
	any depth below this guard still sees it.  Signalling a NEW exception from
	the handler would instead bypass every handler between here and the
	overflow, delivering the error only to code OUTSIDE the guard -- which is
	why this is not written as a plain ``on:do: [RecursionError signal]''.

	The replacement is built rather than signalled so it carries Python args
	(``str(e)'' / ``e.args'') as well as GemStone's messageText.

	It also takes the implicit __context__ every other raise gets.  The overflow
	happens at some arbitrary depth, which for the classic runaway --

	    def f():
	        try: 1/0
	        except ZeroDivisionError: f()

	-- is inside a handler, so CPython reports the RecursionError with the
	innermost ZeroDivisionError as its context, and that one chained to the next
	out, giving a context chain as long as the recursion.  Building the
	replacement with ___new___ alone left it unchained, so the whole chain
	rendered as a single traceback (test_long_context_chain)."

	^ aBlock @env0:on: AlmostOutOfStack do: [:ex | | re |
		re := RecursionError ___new___.
		re ___args___: { 'maximum recursion depth exceeded' }.
		re @env0:messageText: 'maximum recursion depth exceeded'.
		re ___applyImplicitContext___.
		ex @env0:resignalAs: re]
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___signalOrPass___: excValue
	"#signal excValue, falling back to #pass when the kernel refuses because it
	is already in flight.

	The mirror of ___passOrSignal___, and it covers what ___currentException___
	cannot see on its own: an exception whose handler is still on the stack but
	is NOT the innermost one --

	    except A as a:
	        try: ...
	        except B: raise a      -- a is in flight, but B is ''current''

	Here ___currentException___ holds the B exception, so the ordinary #signal
	path is chosen, and only the kernel knows a is unsignalable.  Without this
	that surfaces as UncontinuableError 6011 escaping as an uncatchable
	Smalltalk error."

	^ [excValue @env0:signal]
		@env0:on: (Globals @env0:at: #UncontinuableError)
		do: [:u | u @env0:return: (excValue @env0:pass)]
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___applyCause___: aCause to: anException
	"Wire up ``raise anException from aCause''.  CPython sets __cause__, and
	sets __suppress_context__ as a side effect either way -- ``from None''
	suppresses the implicit context while recording NO cause, which
	___setCause___:context: expresses as a nil cause.  A cause that is neither
	None nor a BaseException is a TypeError."

	| c |
	c := (aCause == None) ifTrue: [nil] ifFalse: [aCause].
	(c == nil
		or: [(c @env0:isKindOf: BaseException)
			or: [(c @env0:isKindOf: Behavior)
				and: [(c == BaseException) or: [c @env0:inheritsFrom: BaseException]]]])
		ifFalse: [^ TypeError ___signal___:
			'exception causes must derive from BaseException'].
	^ anException ___setCause___: c context: nil
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___pyRaiseNew___: cls args: positional kw: kwargs
	"``raise cls(*positional, **kwargs)`` for a bare-name callee.  Validate that
	cls is a BaseException subclass -- else ``TypeError: exceptions must derive
	from BaseException'' (``raise NewStyleClass()'') -- then construct and signal
	via ___signalNew___ (running any user __init__), exactly as the unguarded
	path did for a real exception class."

	^ self ___pyRaiseNew___: cls args: positional kw: kwargs cause: nil
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___pyRaiseNew___: cls args: positional kw: kwargs cause: aCause
	"``raise cls(*positional, **kwargs) from aCause'' -- as ___pyRaiseNew___:args:kw:
	with the ``from'' clause applied to the new instance before it is signalled."

	((cls @env0:isKindOf: Behavior)
		and: [(cls == BaseException) or: [cls @env0:inheritsFrom: BaseException]])
			ifFalse: [^ TypeError ___signal___: 'exceptions must derive from BaseException'].
	"Every Python ``raise'' funnels through here, and this runs BEFORE the signal,
	so arming the VM's stack capture here covers even the session's first raise.
	Memoised in SessionTemps, so after the first raise it is one dictionary
	probe.  Placed here rather than on an import hook because a session can
	raise without importing, and the flag has to be set before the signal or the
	traceback has nothing to walk.  The @env0: prefix is required: this method is
	env 1, and the traceback-building helpers all live in env 0 alongside
	___pushCatchingFrame___, which generated code also reaches with @env0:."
	self @env0:___ensureStackCapture___.
	^ cls ___signalNew___: positional kw: kwargs cause: aCause
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___pyExceptType___: handler
	"Validate an ``except <handler>:'' target before GemStone's ``on:do:'' sends
	it #handles:.  CPython requires a BaseException subclass (or a tuple thereof);
	catching an instance, a str, or a non-exception class raises ``TypeError:
	catching classes that do not inherit from BaseException is not allowed''.

	The operational test is exactly what ``on:do:'' needs: a valid handler (an
	exception class, or a GemStone ExceptionSet from ``except (A, B):'') answers
	#handles:; a non-exception does not.  handler is an ARGUMENT so it can't MNU
	on #handles: inside on:do: (test_baseexception test_catch_*).  Returns the
	handler unchanged when valid."

	(handler @env0:respondsTo: #'handles:') ifTrue: [^ handler].
	^ TypeError ___signal___: 'catching classes that do not inherit from BaseException is not allowed'
%

category: 'Grail-Serialization'
method: BaseException
__setstate__: state
	"CPython BaseException.__setstate__(state): when state is not None it must be
	a mapping, and each (key, value) pair is assigned as an instance attribute
	(setattr).  Returns None.  A snapshot of the items is taken first so a key
	whose __hash__ mutates the dict mid-restore (test_setstate_refcount_no_crash's
	HashThisKeyWillClearTheDict) can't tear the iteration -- and the gh-97591
	refcount crash it guards against cannot arise in Grail (no refcounting)."

	| pairs |
	(state == None or: [state == nil]) ifTrue: [^ None].
	pairs := OrderedCollection @env0:new.
	state @env0:keysAndValuesDo: [:k :v |
		pairs @env0:add: (Array @env0:with: k with: v)].
	pairs @env0:do: [:pair |
		self ___pyAttrStore___: (pair @env0:at: 1) put: (pair @env0:at: 2)].
	^ None
%

category: 'Grail-Private'
method: BaseException
___args___: anArray
	"Store the constructor arguments as a Python tuple.  CPython's
	``BaseException.args'' is ALWAYS a tuple of the positional constructor
	arguments -- ``RuntimeError(42).args == (42,)'', and ``{}[(1,)]'' raises a
	KeyError whose ``args == ((1,),)'' (test_dict test_missing /
	test_tuple_keyerror).  Callers pass a Smalltalk Array of the positionals;
	normalise it to a tuple here so every construction path is consistent and
	every reader (args accessor, __str__, __repr__, __eq__) sees a tuple."

	args := tuple @env0:withAll: anArray
%

category: 'Grail-Exception Chaining'
method: BaseException
__cause__
	"The exception that DIRECTLY caused this one -- CPython's ``raise X from Y''.
	Stored in the ___cause___ dynamic instVar, read with the same absent-tolerant
	probe __context__ uses (an unset dynamic instVar reads back as ABSENT, which
	raises rather than answering nil).  Unset -> None, CPython's default.

	Written by ___setCause___:context___:.  NOTE: the ``raise X from Y'' SYNTAX
	does not set this yet -- RaiseAst parses a ``cause'' but drops it -- so today
	the only writer is PEP 479 generator wrapping."

	^ ([self @env0:dynamicInstVarAt: #'___cause___']
		@env0:on: AbstractException do: [:e | nil]) ifNil: [None]
%

category: 'Grail-Exception Chaining'
method: BaseException
__context__
	"Return the exception context: the exception that was being handled when this
	one was raised.  Set implicitly on every raise inside an ``except'' block
	(___applyImplicitContext___), and explicitly by ``raise X from Y'' and by code
	that constructs a derived exception (e.g. Enum value-lookup when a _missing_
	hook returns a bad value or raises).  Unset -> None (CPython default)."

	^ ([self @env0:dynamicInstVarAt: #'___context___']
		@env0:on: AbstractException do: [:e | nil]) ifNil: [None]
%

! ------------------- equality: CPython uses IDENTITY for exceptions
! BaseException defines no __eq__ in CPython -- ``ValueError('x') ==
! ValueError('x')'' is FALSE -- so exceptions inherit object's identity
! equality and identity hash, and the two agree.
!
! Grail used to define a value-based __eq__ here (same class + same args) with
! no matching __hash__.  That was wrong twice over: it disagreed with CPython,
! and it broke the equality/hash contract, so two exceptions could compare
! equal while hashing differently -- a set could hold both, and a dict could
! fail to find one it held.  Removed rather than papered over with a value
! __hash__, because matching CPython is the point.
!
! __ne__ went with it: it only negated __eq__, which object's default already
! does.


category: 'Grail-Initialization'
method: BaseException
__init__
	"Initialize with no arguments."

	self ___args___: #().
	^ None
%

category: 'Grail-Initialization'
method: BaseException
__init__: a
	"Initialize with ONE positional constructor argument ``a''.  CPython's
	``BaseException.__init__(self, *args)'' sets ``self.args = args'', so a
	single argument yields the 1-tuple ``(a,)'' -- e.g. ``RuntimeError(42).args
	== (42,)''.  (Smalltalk nil, the no-arg sentinel, yields the empty tuple.)"

	a ifNil: [ self ___args___: #() ] ifNotNil: [ self ___args___: { a } ].
	^ None
%

category: 'Grail-Initialization'
method: BaseException
___init__: positional kw: kwargs
	"CPython's ``BaseException.__init__(self, *args)'' -- the VARARGS form, of
	which the two methods above are the 0- and 1-argument specialisations.
	``self.args'' becomes the whole positional tuple, whatever its length.

	This is the selector a GENERATED class constructor probes when the subclass
	defines no __init__ of its own: ClassDefAst's ``ifNil:'' branch sends
	``___init__:kw:'' and swallows MessageNotUnderstood, so that a plain data
	class with no __init__ anywhere in its hierarchy keeps zero-arg ``new''
	semantics.  BaseException never implemented it, so for the commonest way to
	declare an exception --

	    class MyError(Exception):
	        pass

	-- the send MNU'd, the miss was swallowed, and ``MyError('boom').args''
	stayed ``()``.  str(e) was then '' and the message vanished from every
	render: ``raise MyError('boom')'' reported bare ``MyError''.  A subclass
	whose __init__ chains to super() was unaffected, which is why this hid.

	CPython's BaseException takes NO keyword arguments -- ``Exception(x=1)''
	is a TypeError.  A subclass that wants them defines its own __init__, and
	is then dispatched statically without ever reaching here."

	((kwargs @env0:notNil) and: [kwargs @env0:notEmpty]) ifTrue: [
		^ TypeError ___signal___: (self @env0:class @env0:name @env0:asString
			@env0:, '() takes no keyword arguments')].
	self ___args___: (positional isNil ifTrue: [#()] ifFalse: [positional @env0:asArray]).
	^ None
%


category: 'Grail-String Representation'
method: BaseException
__repr__
	"Return a detailed string representation of the exception."
	
	| className argsArray stream |
	className := (self @env0:class) @env0:name.
	argsArray := self args.
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	
	stream @env0:nextPutAll: className.
	stream @env0:nextPut: $(.
	
	((argsArray @env0:size) @env0:> 0) ifTrue: [
		argsArray @env0:doWithIndex: [:arg :idx |
			| argRepr |
			(idx @env0:> 1) ifTrue: [
				stream @env0:nextPutAll: ', '.
			].
			argRepr := arg @env0:asString.
			(arg isKindOf: Unicode7) ifTrue: [
				stream @env0:nextPut: $'.
				stream @env0:nextPutAll: argRepr.
				stream @env0:nextPut: $'.
			] ifFalse: [
				stream @env0:nextPutAll: argRepr.
			].
		].
	].
	
	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Grail-String Representation'
method: BaseException
__str__
	"Return a string representation of the exception.
	If args is empty, return empty string.
	If args has one element, return str of that element.
	Otherwise, return str of the args tuple."
	
	| argsArray size |
	argsArray := self args.
	size := argsArray @env0:size.
	
	size == 0 ifTrue: [ ^ '' ].
	size == 1 ifTrue: [
		| arg |
		arg := argsArray @env0:at: 1.
		"A str arg is the overwhelming majority and is already the answer."
		(arg isKindOf: CharacterCollection) ifTrue: [^ arg @env0:asUnicodeString].
		"CPython's ``str(exc)'' for one arg is ``str(self.args[0])'' -- the
		PYTHON str protocol.  Smalltalk #asString on a non-str arg answers its
		printString instead, so ``raise Exception(None)'' rendered
		``Exception: aNoneType'' rather than ``Exception: None'' -- and likewise
		for any object whose printString differs from its __str__.  The
		multi-arg branch below was already fixed for this same class of bug
		(``atuple''); this is the one-arg half of it."
		^ (builtins instance) str: arg
	].
	"Multiple args: CPython's ``str(exc)'' is ``str(self.args)'', and a tuple has
	no __str__ so str() falls back to its __repr__ -- ``Exception(0,1,2)''
	stringifies to ``(0, 1, 2)''.  The old ``argsArray asString'' sent Smalltalk
	#asString to the tuple and produced garbage (``atuple'')."
	^ argsArray __repr__
%

category: 'Grail-Exception Chaining'
method: BaseException
__suppress_context__
	"Whether a traceback should suppress the implicit context.  CPython sets this
	as a SIDE EFFECT of assigning __cause__ (``raise X from Y''), which is what
	makes the traceback read ``The above exception was the direct cause of...''
	rather than ``During handling of the above exception...''.  Stored separately
	from ___cause___ so ``raise X from None'' -- suppress with NO cause -- is
	representable.  Unset -> false."

	^ ([self @env0:dynamicInstVarAt: #'___suppressContext___']
		@env0:on: AbstractException do: [:e | nil]) == true
%

category: 'Grail-Exception Chaining'
method: BaseException
___applyImplicitContext___
	"CPython's IMPLICIT chaining: an exception raised while another is being
	HANDLED records that other one as its __context__, which is what produces

	    During handling of the above exception, another exception occurred:

	in a rendered traceback.  Unlike __cause__ this needs no syntax -- it happens
	on every raise inside an ``except'' block -- and unlike __cause__ it does NOT
	set __suppress_context__.  ``raise X from Y'' sets BOTH: CPython reports
	cause=Y and context=Y there, with the flag on so only the cause renders.

	The exception being handled is the one TryAst records in
	___currentException___ on handler entry (and restores on exit), so no new
	bookkeeping is needed.

	It must not overwrite a context already set -- an explicit one, or this
	exception being re-raised -- and must not chain an exception to itself.

	Cycles it BREAKS rather than declines, which is what CPython does
	(_PyErr_SetObject): walk the candidate's context chain, and if this exception
	is already in it, clear THAT link's context before chaining.  Declining
	instead leaves the context unset, which is visibly wrong -- test_traceback's
	test_cause_recursive builds exactly this shape and CPython reports
	__context__ as the KeyError, not None -- while doing nothing at all would let
	format() walk the loop forever."

	| current probe next |
	(self ___rawContext___) isNil ifFalse: [^ self].
	current := BaseException @env0:___currentException___.
	current isNil ifTrue: [^ self].
	current == self ifTrue: [^ self].
	probe := current.
	[probe isNil] whileFalse: [
		next := probe ___rawContext___.
		next == self
			ifTrue: [
				probe @env0:dynamicInstVarAt: #'___context___' put: nil.
				probe := nil]
			ifFalse: [probe := next]].
	self @env0:dynamicInstVarAt: #'___context___' put: current.
	"``current'' is being HANDLED -- we are raising from inside its handler -- so
	its traceback is already built and it is no longer propagating.  Release its
	raise-time capture here: that is what keeps a long chain affordable, since
	otherwise every link retains a full-stack capture and the retained total is
	quadratic in the chain's length (see ___releaseCapturedStack___)."
	current @env0:___releaseCapturedStack___.
	^ self
%

category: 'Grail-Exception Chaining'
method: BaseException
___rawContext___
	"The ___context___ slot as STORED -- nil when unset, where __context__
	answers the None singleton.  The chain walks need to tell ``no context'' from
	``a context that happens to be None''."

	^ ([self @env0:dynamicInstVarAt: #'___context___']
		@env0:on: AbstractException do: [:e | nil])
%

category: 'Grail-Exception Chaining'
method: BaseException
___setCause___: aCause context: aContext
	"Chain this exception the way ``raise <self> from aCause'' does: set
	__cause__, set __context__, and set __suppress_context__ -- CPython sets the
	flag as a side effect of setting the cause, so all three move together on
	this path.

	A nil argument is skipped rather than stored: a nil dynamic instVar reads
	back as ABSENT, so storing nil would be indistinguishable from unset and the
	accessors' None/false defaults cover it.  The flag is stored
	unconditionally, because ``raise X from None'' means suppress WITHOUT a
	cause."

	aCause == nil ifFalse: [
		self @env0:dynamicInstVarAt: #'___cause___' put: aCause].
	aContext == nil ifFalse: [
		self @env0:dynamicInstVarAt: #'___context___' put: aContext].
	self @env0:dynamicInstVarAt: #'___suppressContext___' put: true.
	^ self
%

category: 'Grail-Exception Chaining'
method: BaseException
__traceback__
	"Return the traceback object (a PyTraceback linked list) for this
	exception, or None when none has been attached.  ``#'__traceback__''
	is in ___pythonValueAttrs___ so ___pyAttrLoad___ returns THIS value
	rather than BoundMethod-wrapping the selector."

	^ tracebackObj ifNil: [ None ]
%

category: 'Grail-Exception Methods'
method: BaseException
add_note: note
	"PEP 678 (Python 3.11+): attach a str ``note'' to the exception.  Notes are
	surfaced via ``__notes__'' and printed after the message in a traceback.
	Stored in a dynamic instVar (a Python list) so no class-shape change is
	needed; created lazily on the first note.

	The slot is named ``__notes__'' -- the ATTRIBUTE's own name, not a private
	``___pyNotes___'' -- because ___pyAttrLoad___ probes dynamic instVars
	BEFORE the method chain.  That makes __notes__ a genuine writable
	attribute, which is what CPython has and what the stdlib relies on:
	``e.__notes__ = [...]'' stores through the ordinary attribute path and is
	then visible to a read, and ``del e.__notes__'' removes it through
	___pyAttrDelete___ so the next read falls through to the __notes__ method
	below and AttributeErrors again -- CPython's ``absent until add_note''
	state, restored.  Under a private name both of those were invisible: the
	accessor kept answering the old list."

	| notes |
	(note isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'add_note() argument must be a str, not '
			@env0:, note @env0:class @env0:name @env0:asString].
	notes := self @env0:dynamicInstVarAt: #'__notes__'.
	notes isNil ifTrue: [
		notes := list ___new___.
		self @env0:dynamicInstVarAt: #'__notes__' put: notes].
	notes append: note.
	^ None
%

category: 'Grail-Exception Methods'
method: BaseException
__notes__
	"PEP 678 list of notes attached via add_note.  CPython leaves ``__notes__''
	ABSENT until the first add_note (accessing it raises AttributeError), so
	mirror that rather than fabricating an empty list.

	Reached only when the dynamic-instVar slot is unset, since ___pyAttrLoad___
	probes that first -- so this is exactly the ``no notes'' case."

	| notes |
	notes := self @env0:dynamicInstVarAt: #'__notes__'.
	notes isNil ifFalse: [^ notes].
	"No notes.  CPython has no __notes__ descriptor at all, so the read is an
	ordinary attribute MISS and goes through __getattribute__ -> __getattr__
	before raising.  Existing as a real method here short-circuits that, so an
	exception class with a __getattr__ never saw the lookup: replicate the
	miss path (the same guard as object>>___pyAttrLoad___) before raising.
	Whatever __getattr__ answers -- including None, and including an exception
	OTHER than AttributeError -- is then CPython's answer too."
	((self @env0:class @env0:whichClassIncludesSelector: #'__getattr__:' environmentId: 1) notNil
		and: [(self @env0:class @env0:whichClassIncludesSelector: #'__getattr__:' environmentId: 1)
			@env0:~~ object])
		ifTrue: [^ self __getattr__: '__notes__'].
	^ AttributeError ___signal___: '''' @env0:, self @env0:class @env0:name @env0:asString
		@env0:, ''' object has no attribute ''__notes__'''
%

category: 'Grail-Attribute Access'
method: BaseException
args
	"Return the tuple of arguments passed to the exception (CPython
	``BaseException.args'', always a tuple)."

	^ args ifNil: [ tuple @env0:withAll: #() ]
%

set compile_env: 0
category: 'Grail-Python Attribute Hook'
classmethod: BaseException
___pythonValueAttrs___
	"``e.args'' is the args TUPLE (a value attribute), not a callable -- so
	``___pyAttrLoad___'' invokes the accessor and returns the tuple rather than
	wrapping it as a BoundMethod (test_dict test_tuple_keyerror / test_missing
	check ``exc.args == (key,)'').  ``e.__notes__'' (PEP 678) is likewise the
	notes list, not a method.  ``e.__traceback__'' is the PyTraceback object
	(or None) -- a value, not a callable -- so a read returns it instead of a
	BoundMethod-wrapped selector.

	``e.__context__'' / ``e.__cause__'' / ``e.__suppress_context__'' are the
	PEP 3134 exception-chaining attributes: getset descriptors in CPython
	(None / None / False by default), so a read returns the VALUE.  Without
	this a read wrapped the accessor as a BoundMethod, so ``exc.__context__
	is None'' was false (test_enum test_default_missing_with_wrong_type_value
	asserts the raised ValueError has no context).  The accessors return the
	default today (chaining is not yet tracked); registering them here keeps
	the Python-visible read a value, matching every other reader."

	^ IdentitySet new
		add: #'args';
		add: #'__notes__';
		add: #'__traceback__';
		add: #'__context__';
		add: #'__cause__';
		add: #'__suppress_context__';
		yourself
%
set compile_env: 1

category: 'Grail-Exception Methods'
method: BaseException
with_traceback: tb
	"Set the traceback for this exception and return self -- the CPython
	idiom ``raise X().with_traceback(tb)''.  ``tb'' is a PyTraceback (or
	None to clear).  Stores into the ``tracebackObj'' slot that
	``__traceback__'' reads back."

	tracebackObj := tb.
	^ self
%

set compile_env: 0

category: 'Grail-Traceback Building'
method: BaseException
___pushTracebackFrame___: aCode lineno: ln colno: co endLineno: el endColno: ec line: src
	"Prepend a PyTraceback node (one frame at one PEP 657 position) as this
	exception unwinds -- CPython's incremental-unwind model, so the head is the
	shallowest frame and extract_tb(tb)[0] is where the exception surfaced.
	Called from generated code (env-0 send) at a raise-prone site (currently a
	comprehension's iterator-protocol clause).

	No-op for Grail's control-flow signals and StopIteration: those are not real
	Python exceptions and must not grow a traceback -- the caller re-raises them
	unchanged."

	| frame tb |
	((self isKindOf: PythonReturn)
		or: [(self isKindOf: PythonBreak)
		or: [(self isKindOf: PythonContinue)
		or: [self isKindOf: StopIteration]]]) ifTrue: [^ self].
	frame := PyFrame code: aCode lineno: ln back: None globals: None.
	"Store the None singleton for any absent field: a nil dynamic instVar reads
	back as ABSENT (AttributeError on tb_line/tb_colno/...), so line-level frames
	(no columns / source line) must carry None, not nil."
	tb := PyTraceback frame: frame lineno: ln next: (tracebackObj ifNil: [None])
		endLineno: (el ifNil: [None]) colno: (co ifNil: [None])
		endColno: (ec ifNil: [None]) line: (src ifNil: [None]).
	tracebackObj := tb.
	^ self
%

category: 'Grail-Traceback Building'
method: BaseException
___pushFrameFromPos___: aCode pos: pos
	"Prepend a frame for aCode at the enclosing function's ___curPos___,
	snapshotted as an exception unwinds THROUGH the function.  ___curPos___ is a
	bare SmallInteger beginLine at statement granularity (columns / source line
	unknown -- CPython reports them for the raising instruction, which we don't
	track outside a comprehension).  A nil pos (no statement ran yet) is a no-op,
	as are control-flow / StopIteration (via ___pushTracebackFrame___).  The
	Array branch is defensive legacy: an older 5-tuple
	{ beginLine. beginColumn. endLine. endColumn. sourceLine } still works."

	pos isNil ifTrue: [^ self].
	"``isKindOf: Integer'' -- NOT ``isInteger'': 3.7.x SmallInteger does not
	implement isInteger (DNU), though 4.0 does; isKindOf: is universal."
	(pos isKindOf: Integer) ifTrue: [
		^ self ___pushTracebackFrame___: aCode
			lineno: pos colno: nil endLineno: pos endColno: nil line: nil ].
	^ self ___pushTracebackFrame___: aCode
		lineno: (pos at: 1)
		colno: (pos at: 2)
		endLineno: ((pos at: 3) ifNil: [pos at: 1])
		endColno: (pos at: 4)
		line: (pos at: 5)
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___ensureStackCapture___
	"Turn on the VM's raise-time stack capture, once per session.

	``#GemExceptionSignalCapturesStack'' makes primitive 2022 fill
	``AbstractException >> _gsStack'' with a SmallInteger followed by triples of
	(GsNMethod, ipOffset, receiver) whenever _gsStack is nil on entry to
	_signal.  Measured cost is ~1.3 ns per Smalltalk frame per raise and NOTHING
	per call (§9.2), which is what makes multi-frame tracebacks affordable at
	all -- the alternative was a per-call body wrapper at +14 ns on every Python
	call.

	It is a GEM configuration, so it is per-session and must be re-set rather
	than stored; memoised in SessionTemps so the repeated calls cost a
	dictionary probe.  Grail's own control-flow signals pre-stamp _gsStack to
	opt out (PythonReturn / PythonBreak / PythonContinue class >> ___signal___),
	so the flag does not tax an #exception-mode function's every return."

	| st |
	st := SessionTemps current.
	(st at: #'GrailStackCaptureOn' otherwise: nil) == true ifTrue: [^ self].
	st at: #'GrailStackCaptureOn' put: true.
	[System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: true]
		on: Error do: [:ex |
			"An image that does not offer the flag keeps today's single-frame
			tracebacks rather than failing -- the walk below simply finds no
			captured stack."
			ex return: nil].
	^ self
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___pythonFrameNameFor___: aSelector
	"The Python function name a generated selector came from, or nil when the
	selector is not one.

	A ``def spam'' compiles to a fixed-arity selector (``spam'', ``spam:'', ...)
	whose base is the name, and ALSO to a varargs ``_spam:kw:'' whose base reads
	as ``_spam'' -- the same pair Object >> ___pyAttrDelete___ matches on.  Take
	everything before the first colon and drop one leading underscore from the
	varargs form."

	| s idx base |
	aSelector isNil ifTrue: [^ nil].
	s := aSelector @env0:asString.
	idx := s @env0:indexOf: $:.
	base := (idx @env0:= 0) ifTrue: [s] ifFalse: [s @env0:copyFrom: 1 to: idx @env0:- 1].
	base @env0:isEmpty ifTrue: [^ nil].
	"``_spam:kw:'' -> ``spam''.  Only when a colon was present: a plain unary
	``_spam'' is a genuine Python name beginning with an underscore."
	((idx @env0:> 0) and: [(base @env0:at: 1) @env0:= $_]) ifTrue: [
		((s @env0:endsWith: ':kw:') and: [base @env0:size @env0:> 1])
			ifTrue: [base := base @env0:copyFrom: 2 to: base @env0:size]].
	^ base
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___pythonLineForMethod___: aMethod ip: anIp
	"The PYTHON line a generated method was executing at ``anIp''.

	§9.4 assumed this needed a compile-time ip -> line map.  It does not: the
	generated Smalltalk source carries the Python line as a literal, because
	codegen emits ``___curPos___ := N'' before every statement, and
	``GsNMethod >> _sourceAtIp:'' answers that source with a caret marking the
	exact ip.  So the answer is the last ``___curPos___ := N'' at or above the
	caret line.  (§9.4's premise -- that another frame's TEMPS are unreachable
	-- is true and irrelevant: this reads the source literal, not the temp.)

	Cached per (method, ip) in SessionTemps: the derivation is pure, formatting
	the report costs ~100 us, and a traceback revisits the same sites
	constantly."

	| cache key |
	cache := SessionTemps current at: #'GrailIpLineCache' otherwise: nil.
	cache isNil ifTrue: [
		cache := KeyValueDictionary new.
		SessionTemps current at: #'GrailIpLineCache' put: cache].
	key := { aMethod @env0:asOop. anIp }.
	^ cache @env0:at: key ifAbsent: [
		| line |
		line := self ___derivePythonLineForMethod___: aMethod ip: anIp.
		cache @env0:at: key put: line.
		line]
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___derivePythonLineForMethod___: aMethod ip: anIp
	"Uncached worker for ___pythonLineForMethod___:ip: -- see its comment."

	| report lines caretIdx result |
	report := [aMethod @env0:_sourceAtIp: anIp] on: Error do: [:ex | ex return: nil].
	report isNil ifTrue: [^ nil].
	lines := report @env0:subStrings: (String @env0:with: Character lf).
	"_sourceAtIp: marks the ip with a caret on a line whose first non-blank
	character is ``*''.  Everything at or above it is what has been reached.

	No caret means FAIL CLOSED -- answer nil, which drops the frame and leaves
	the single-frame fallback.  Defaulting to the whole method instead (the
	obvious reading of ``everything above'') answers the LAST ___curPos___ in
	it: a wrong line that is never nil, so it also passes the is-this-a-Python-
	frame test.  A missing frame is recoverable; a confidently wrong line
	number is not."
	caretIdx := 0.
	1 to: lines @env0:size do: [:i |
		(((lines @env0:at: i) @env0:trimSeparators) @env0:beginsWith: '*')
			ifTrue: [caretIdx @env0:= 0 ifTrue: [caretIdx := i]]].
	caretIdx @env0:= 0 ifTrue: [^ nil].
	result := nil.
	1 to: (caretIdx @env0:min: lines @env0:size) do: [:i |
		| rest p |
		rest := lines @env0:at: i.
		"Read only the digits IMMEDIATELY following the assignment, and take the
		LAST assignment on the line.  Collecting every digit to end-of-line instead
		concatenated the line number with any other numeric literal the statement
		carried -- a for-loop over a generator derived ``37133718'' from
		``___curPos___ := 37.'' followed by more generated code on the same line --
		and a whole statement does land on one line, so this is the common case, not
		an exotic one."
		[p := rest @env0:indexOfSubCollection: '___curPos___ := '.
		 p @env0:> 0] whileTrue: [
			| digits k |
			digits := WriteStream @env0:on: String @env0:new.
			k := p @env0:+ 16.
			[(k @env0:<= rest @env0:size) and: [(rest @env0:at: k) @env0:isDigit]]
				whileTrue: [
					digits @env0:nextPut: (rest @env0:at: k).
					k := k @env0:+ 1].
			digits @env0:contents @env0:isEmpty
				ifFalse: [result := digits @env0:contents @env0:asNumber].
			rest := rest @env0:copyFrom: (p @env0:+ 16) to: rest @env0:size]].
	^ result
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___stashGeneratorStack___: anException
	"Remember the frames captured INSIDE a generator's forked process, and clear
	_gsStack so that re-signalling on the consumer captures the CONSUMER's frames.

	A generator body runs in its own GsProcess, so the stack captured when it
	raises holds the body and the fork plumbing and NOTHING of the consumer
	(§9.9).  PythonGenerator stows such an exception and re-signals it on the
	consumer -- and primitive 2022 fills _gsStack only when it is nil on entry, so
	without this clear the consumer's half is never captured and the whole
	traceback collapses to the catch-site frame.  The halves are spliced in
	___walkableStack___.

	ONE ENTRY PER LEVEL, appended in the order the levels unwind, because
	``yield from'' nests forked processes: inner_gen raises, its stash is taken,
	it is re-signalled on OUTER_GEN's process, and outer's handler stashes in turn.
	Overwriting instead of appending lost the inner generator's frame entirely
	(``consume_delegated@15 outer_gen@10'' for CPython's
	``consume_delegated@15 outer_gen@10 inner_gen@6'').  Innermost level first,
	which is also the order the walk wants.

	Session-local and keyed by IDENTITY, so one generator consuming another keeps
	its own levels.  Not stored on the exception itself: a dynamic instVar there
	would be readable as a Python attribute."

	| st reg levels |
	st := anException _gsStack.
	st isNil ifTrue: [^ self].
	reg := SessionTemps current at: #'GrailGeneratorStacks' otherwise: nil.
	reg isNil ifTrue: [
		reg := IdentityKeyValueDictionary new.
		SessionTemps current at: #'GrailGeneratorStacks' put: reg].
	levels := reg at: anException otherwise: nil.
	levels isNil ifTrue: [levels := OrderedCollection new].
	levels add: (self ___trimCapturedStack___: st).
	reg at: anException put: levels.
	anException _gsStack: nil.
	^ self
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___moveGeneratorStack___: oldException to: newException
	"Follow the stash when PythonGenerator has to re-signal a COPY (an exception
	that was passed on its way out keeps live handler frames and cannot be
	signalled again -- PythonGenerator >> _resignalable:).  Also clears the copy's
	_gsStack, which `copy' brought along with the other named instVars."

	| reg st |
	reg := SessionTemps current at: #'GrailGeneratorStacks' otherwise: nil.
	reg isNil ifTrue: [^ self].
	oldException == newException ifTrue: [^ self].
	st := reg at: oldException otherwise: nil.
	st isNil ifTrue: [^ self].
	reg removeKey: oldException ifAbsent: [].
	reg at: newException put: st.
	newException _gsStack: nil.
	^ self
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___generatorStackFor___: anException
	"The stashed generator-side capture for anException, or nil."

	| reg |
	reg := SessionTemps current at: #'GrailGeneratorStacks' otherwise: nil.
	reg isNil ifTrue: [^ nil].
	^ reg at: anException otherwise: nil
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___trimCapturedStack___: st
	"The (method, ip, receiver) triples of a captured stack, without its header
	element and without the trailing nils it is over-allocated with."

	| out |
	st isNil ifTrue: [^ #()].
	out := OrderedCollection new.
	2 to: st size by: 3 do: [:i |
		(st at: i) isNil ifTrue: [^ out asArray].
		out add: (st at: i); add: (st at: i + 1); add: (st at: i + 2)].
	^ out asArray
%

category: 'Grail-Traceback Building'
method: BaseException
___walkableStack___
	"Answer { stackToWalk. boundaryIndicesOrNil }.

	Normally just _gsStack with no boundaries.  For an exception that escaped one
	or more generator bodies, every stashed level is concatenated ahead of the
	consumer's own capture -- innermost level first -- into a single array with the
	header-then-triples layout the walk expects.

	A boundary is recorded where each section ENDS.  The walk flushes its pending
	block there, which is what finally reports a generator's own frame: the body is
	a BLOCK whose home METHOD frame is not on the forked stack at all, so nothing
	else ever would."

	| levels sections combined boundaries |
	levels := BaseException ___generatorStackFor___: self.
	levels isNil ifTrue: [^ { self _gsStack. nil }].
	sections := OrderedCollection new.
	levels do: [:each | sections add: each].
	sections add: (BaseException ___trimCapturedStack___: self _gsStack).
	combined := OrderedCollection new.
	combined add: 0.
	boundaries := OrderedCollection new.
	sections do: [:section |
		"Where the NEXT section starts -- 1-based, so one past what we have."
		combined isEmpty ifFalse: [boundaries add: combined size + 1].
		section do: [:slot | combined add: slot]].
	"The first boundary is the start of section 1, which is not a boundary at all."
	boundaries isEmpty ifFalse: [boundaries removeFirst].
	^ { combined asArray. boundaries asArray }
%

category: 'Grail-Traceback Building'
method: BaseException
___buildFramesFromCapturedStack___: aCode pos: posArray
	"Build the WHOLE propagation path from the VM's captured stack, newest frame
	innermost, and answer true when it produced at least one frame.

	``_gsStack'' is a SmallInteger followed by (method, ip, receiver) triples,
	INNERMOST first, over-allocated with trailing nils (so the frame count comes
	from scanning for nil, not from the array size).  A frame belongs in a Python
	traceback when its method is env 1 on a generated Python class and its
	selector decodes to a Python name; block frames carry a NIL selector and
	belong to the enclosing method, so they are skipped rather than reported --
	CPython has no frame for a comprehension body or an except block.

	The walk stops after the frame for the CATCHING function (``aCode name''),
	because a traceback records the propagation path from raise to catch, not the
	whole stack -- without the trim it would run on into the caller chain and,
	under a test runner, into unittest's own frames.

	Pushing innermost-first leaves the head at the outermost frame, which is what
	___pushTracebackFrame___ prepending gives us and what CPython's ``most recent
	call last'' ordering means.

	Generators are a known gap: a generator body runs in a forked GsProcess, so
	its captured stack does not contain the consumer's frames at all (§9.9).
	Such a raise yields only the frames inside the generator, and the single-frame
	fallback still applies when that leaves nothing."

	| st catchName pushed pendingHome pendingLine walkable boundary |
	walkable := self ___walkableStack___.
	st := walkable @env0:at: 1.
	"Indices where a generator level ends; nil when no generator is involved."
	boundary := walkable @env0:at: 2.
	st isNil ifTrue: [^ false].
	"PyCode keeps its fields in DYNAMIC INSTVARS with no accessor methods (a
	Python read resolves them through ___pyAttrLoad___'s dynamic probe), so this
	has to read the slot -- ``aCode co_name'' is a MessageNotUnderstood, and
	catching it silently left catchName nil, which disabled the trim and let the
	traceback run on past the catching function into its caller."
	catchName := aCode isNil
		ifTrue: [nil]
		ifFalse: [aCode @env0:dynamicInstVarAt: #'co_name'].
	pushed := 0.
	2 to: st @env0:size by: 3 do: [:i |
		| meth ip name home |
		"The generator/consumer boundary: everything before it ran in the
		generator's forked process.  Flush its pending block as a frame -- the
		generator body is a BLOCK whose home method frame is not on that stack, so
		this is the only place its own frame can come from -- and start the
		consumer's half with nothing pending, or the first consumer frame would
		read as an already-unwound one (§9.11)."
		(boundary notNil and: [boundary @env0:includes: i]) ifTrue: [
			pendingHome notNil ifTrue: [
				| gname |
				gname := BaseException ___pythonFrameNameFor___: pendingHome @env0:selector.
				((gname notNil) and: [pendingLine notNil]) ifTrue: [
					self ___pushTracebackFrame___:
							(self ___codeForMethod___: pendingHome name: gname ip: 0
								aCode: aCode)
						lineno: pendingLine
						colno: nil endLineno: nil endColno: nil line: nil.
					pushed := pushed @env0:+ 1].
				pendingHome := nil.
				pendingLine := nil]].
		meth := st @env0:at: i.
		"Trailing nils pad the array -- the real frames end here."
		meth isNil ifTrue: [^ pushed @env0:> 0].
		ip := st @env0:at: i @env0:+ 1.
		"Which METHOD a frame belongs to: a block answers its home, a method
		answers itself.  CPython has no frame of its own for a block (a
		comprehension body, a try body, an except handler), so blocks are merged
		into their home rather than reported."
		home := (meth @env0:environmentId @env0:= 1)
			ifTrue: [[meth @env0:homeMethod] on: Error do: [:ex | ex return: meth]]
			ifFalse: [nil].
		home isNil ifTrue: [home := meth].
		((meth @env0:environmentId @env0:= 1) and: [meth @env0:selector isNil])
			ifTrue: [
				"A BLOCK frame supplies the LINE for its home method, and it is the
				only reliable source of it.  The block is parked at the statement in
				flight; the home METHOD frame is parked at whatever construct is
				running that block -- for a ``try'' body or an ``except'' handler,
				the on:do: -- and such an ip does not resolve back to the statement
				(§9.10: under native code it reads as the function's LAST
				___curPos___, which is how a re-raising frame came out at its
				``raise'' instead of at the call the exception entered on).
				Innermost block wins: a later one for the same home is an enclosing
				block, hence a less precise position."
				pendingHome @env0:~~ home ifTrue: [
					pendingHome := home.
					pendingLine := BaseException ___pythonLineForMethod___: meth ip: ip]].
		((meth @env0:environmentId @env0:= 1) and: [meth @env0:selector notNil])
			ifTrue: [
				| pyLine |
				"A frame Python has ALREADY UNWOUND.  Reaching a method frame that is
				not the pending block's home means we are inside a handler that is
				running ABOVE the frames which signalled: Smalltalk unwinds nothing
				before invoking on:do:, so the whole propagation path of the exception
				being HANDLED is still on the stack below us.  Python's model has
				dropped those frames -- an exception raised in an except block gets
				its own traceback, and the handled one is reachable only through
				__context__ -- so skip everything until the pending home's own frame.

				This is §9.10's item 7.  Without it a wrapping raise reported the
				frames of the exception it was wrapping (``catch@35 wrap_bare@14
				leaf@5'' where CPython says ``catch@35 wrap_bare@16''), and it also
				kept the pending line from reaching wrap_bare, because these frames
				reset it -- one skip fixes both the extra frame and the wrong line."
				(pendingHome notNil and: [pendingHome @env0:~~ home])
					ifTrue: [name := nil]
					ifFalse: [
						name := BaseException ___pythonFrameNameFor___: meth @env0:selector].
				"A non-nil derived line is what IDENTIFIES a Python frame, and it
				is self-validating: only codegen emits ``___curPos___ := N'', so
				Grail's own hand-written env-1 plumbing (``Object >>
				___signal___:'', ``BaseException class >> ___pyRaiseNew___:'')
				answers nil here and is skipped without needing a marker or a
				class/category allow-list.  A method category is NOT usable for
				this: importlib and ShimSreModule are hand-written yet also use
				codegen's 'Grail-Methods'."
				pyLine := name isNil
					ifTrue: [nil]
					ifFalse: [(pendingHome @env0:== home and: [pendingLine notNil])
						ifTrue: [pendingLine]
						ifFalse: [BaseException ___pythonLineForMethod___: meth ip: ip]].
				"A skipped frame must NOT clear the pending line -- it belongs to the
				handler's home, which we have not reached yet."
				(pendingHome isNil or: [pendingHome @env0:== home]) ifTrue: [
					pendingHome := nil.
					pendingLine := nil].
				pyLine notNil ifTrue: [
					| isCatcher frameCode |
					isCatcher := catchName notNil and: [name @env0:= catchName].
					frameCode := self ___codeForMethod___: meth name: name ip: ip
						aCode: aCode.
					"The CATCHING frame takes the position CODEGEN recorded, never the one
					derived from the ip.  ___pushFrameFromPos___ already handles both shapes
					pos comes in: the bare ___curPos___ SmallInteger of an ordinary statement,
					and the 5-tuple { beginLine. beginColumn. endLine. endColumn. sourceLine }
					of a comprehension / for-loop iterator clause, whose PEP 657 columns
					test_dictcomps / test_setcomps assert on.

					Codegen's position is not merely the more precise one here, it is the only
					one that holds everywhere.  This frame is suspended INSIDE the on:do:
					protected block, and resolving such an ip back to the statement in flight
					depends on the GEM: with native code enabled (GemNativeCodeEnabled=2, the
					CI gem on Linux x86_64) _sourceAtIp: answers a report whose caret sits past
					the whole block, so the scan below returns the function's LAST ___curPos___
					-- frame_depth's catcher reports 34, ``return None'', for a call on line 31.
					An interpreted gem (macOS/arm64, where native code is unavailable) answers
					the call site and derives 31.  Honouring pos ONLY when it was an Array left
					every ordinary try/except -- codegen passes the bare integer there -- on the
					derived line, which is why the first cut passed on every local gem and
					failed in CI.  Frames BELOW the catcher are suspended at a CALL site, which
					resolves correctly in both modes (CI derives leaf/middle/outer as 18/22/26).
					"
					(isCatcher and: [posArray notNil])
						ifTrue: [self ___pushFrameFromPos___: frameCode pos: posArray]
						ifFalse: [
							self ___pushTracebackFrame___: frameCode
								lineno: pyLine
								colno: nil endLineno: nil endColno: nil line: nil].
					pushed := pushed @env0:+ 1.
					"Reached the function holding the except clause: the traceback
					ends here."
					isCatcher ifTrue: [^ true]]]].
	^ pushed @env0:> 0
%

category: 'Grail-Traceback Building'
method: BaseException
___codeForMethod___: aMethod name: aName ip: anIp aCode: catchCode
	"A PyCode for one captured frame.  Reuses the catching function's PyCode
	when the frame IS that function (it already carries the right filename and
	first line); otherwise builds one, taking the filename from the catching
	code so every frame in a traceback names the module it came from."

	| filename |
	filename := '<grail>'.
	catchCode isNil ifFalse: [
		"Dynamic instVars, no accessors -- see ___buildFramesFromCapturedStack___."
		filename := (catchCode @env0:dynamicInstVarAt: #'co_filename')
			ifNil: ['<grail>'].
		(catchCode @env0:dynamicInstVarAt: #'co_name') @env0:= aName
			ifTrue: [^ catchCode]].
	^ PyCode @env0:name: aName filename: filename firstlineno: 0
%

category: 'Grail-Traceback Building'
method: BaseException
___pushCatchingFrame___: aCode pos: posArray
	"Add the frames for an exception arriving at this except handler (TryAst emits
	this there).  Three cases, distinguished by what -- if anything -- is already
	on the exception:

	1. NO traceback yet: build the whole propagation path from the VM's captured
	   stack (§9.9), falling back to the single catch-site frame when there is no
	   capture (no flag, a generator raise whose captured frames all sat outside
	   Python code, or an exception that pre-stamped _gsStack to opt out).

	2. A traceback whose head names THIS function: a body wrapper (nested/complex
	   functions) or the comprehension iterator wrapper already located the
	   exception inside us, and more precisely than we can -- it has PEP 657
	   columns.  Leave it alone.  Rebuilding here is what broke
	   testForLoopExceptionPositions (init_span).

	3. A traceback whose head names ANOTHER function: the exception was caught
	   somewhere deeper, RE-RAISED (bare ``raise''), and has now propagated up
	   into us.  CPython adds a frame for every function it unwinds through, each
	   at the line where the exception ENTERED that function -- not at the
	   ``raise'' -- and each function appears once:

	       two_levels@21 passthrough@16 mid@10 leaf@5

	   Rebuilding from the live captured stack answers exactly that, because
	   Smalltalk has not unwound anything: a handler runs ON TOP of the frames
	   that signalled, so the stack still holds the original chain (leaf, mid)
	   below the re-raise, with the newly entered frames (passthrough,
	   two_levels) above it -- all parked at their call sites, which is the
	   position CPython reports.  So the correct splice is to discard the partial
	   chain and walk again; prepending the catch-site frame instead would report
	   only the catcher and drop every pass-through frame.

	Same-name recursion is the one case case 3 cannot see: an exception re-raised
	in f and caught again in f reads as case 2 and keeps the deeper chain."

	| headName saved |
	tracebackObj isNil ifTrue: [
		(self ___buildFramesFromCapturedStack___: aCode pos: posArray)
			ifTrue: [^ self].
		^ self ___pushFrameFromPos___: aCode pos: posArray].

	headName := self ___headFrameName___.
	((headName isNil or: [aCode isNil])
		or: [headName @env0:= (aCode @env0:dynamicInstVarAt: #'co_name')])
			ifTrue: [^ self].

	"Case 3.  Keep the old chain in hand: if the walk cannot produce frames (no
	capture in this session) the partial traceback is still better than none, and
	the catch-site frame is then prepended to it as before."
	saved := tracebackObj.
	tracebackObj := nil.
	(self ___buildFramesFromCapturedStack___: aCode pos: posArray)
		ifTrue: [^ self].
	tracebackObj := saved.
	^ self ___pushFrameFromPos___: aCode pos: posArray
%

category: 'Grail-Traceback Building'
method: BaseException
___releaseCapturedStack___
	"Drop the VM's raise-time capture.  The frames it held are already in
	``tracebackObj''; the capture itself is only the raw material.

	This is what keeps a long exception chain affordable.  Primitive 2022 captures
	the WHOLE Smalltalk stack at every raise, so a recursion that raises once per
	level captures O(depth) triples at level 1, at level 2, ... -- and when the
	exceptions stay reachable, as a __context__ chain makes them, the RETAINED
	total is O(depth^2).  Measured on the classic runaway at 6645 levels (~16
	Smalltalk frames per level) that is ~350 million triples: it exhausts a gem's
	temporary object memory outright, and tripling GEM_TEMPOBJ_CACHE_SIZE does not
	help.

	Called only from ___applyImplicitContext___, deliberately -- NOT when the
	traceback is first built.  An exception's capture has to outlive its first
	catch, because a bare re-raise rebuilds the traceback by walking that same
	capture again with a wider trim: the pass-through frames §9.10 splices in are
	in the ORIGINAL capture (they were on the stack when the raise happened), and
	`pass' does not refill _gsStack.  Releasing at catch time broke exactly that
	(TracebackTestCase>>testBareReraiseSplicesFrames).  By the time an exception
	becomes another one's __context__ it is being handled and is no longer
	propagating, so the capture is spent."

	self _gsStack: nil.
	^ self
%

category: 'Grail-Traceback Building'
method: BaseException
___headFrameName___
	"co_name of the frame at the head of this exception's traceback, or nil when
	it has none.  PyTraceback / PyFrame / PyCode all keep their fields in DYNAMIC
	instVars with no accessors (a Python read resolves them through
	___pyAttrLoad___), so this reads the slots."

	| frame code |
	tracebackObj isNil ifTrue: [^ nil].
	frame := tracebackObj @env0:dynamicInstVarAt: #'tb_frame'.
	frame isNil ifTrue: [^ nil].
	code := frame @env0:dynamicInstVarAt: #'f_code'.
	code isNil ifTrue: [^ nil].
	^ code @env0:dynamicInstVarAt: #'co_name'
%

category: 'Grail-Current Exception'
classmethod: BaseException
___currentException___
	"The exception currently being HANDLED in this session -- what CPython
	sys.exc_info() / sys.exception() report -- or nil outside any active except
	block.  Session-local via SessionTemps (never committed).  TryAst codegen
	sets it on except-handler entry and restores the prior value on exit, so
	nested handlers stack correctly."

	^ (SessionTemps current) at: #'GrailCurrentException' ifAbsent: [nil]
%

category: 'Grail-Current Exception'
classmethod: BaseException
___setCurrentException___: anExceptionOrNil
	"Set (nil clears) the session's currently-handled exception.  Clearing
	REMOVES the key rather than storing nil, so ___currentException___'s
	ifAbsent: nil default is the single source of ``no active exception''."

	anExceptionOrNil isNil
		ifTrue: [ (SessionTemps current) removeKey: #'GrailCurrentException' ifAbsent: [] ]
		ifFalse: [ (SessionTemps current) at: #'GrailCurrentException' put: anExceptionOrNil ].
	^ anExceptionOrNil
%

category: 'Grail-Current Exception'
classmethod: BaseException
___ensureFinally___: protectedBlock finally: finallyBlock
	"Run protectedBlock, then finallyBlock unconditionally (Python try/finally
	semantics == GemStone ensure:), BUT when a Python exception is PROPAGATING
	out of protectedBlock, install it as this session's current exception for the
	duration of finallyBlock -- so sys.exc_info() / sys.exception() inside a
	``finally'' report the in-flight exception, matching CPython -- then restore
	the prior value and let the exception keep propagating.

	Only real Python exceptions (BaseException) are installed: Grail's
	control-flow signals (PythonReturn/PythonBreak/PythonContinue) and
	StopIteration subclass the kernel Exception directly, NOT this BaseException,
	so a return / break / continue / normal exit through the finally leaves
	exc_info untouched (correct -- CPython shows the ENCLOSING handled exception
	there, not a fresh one).

	TryAst emits this in place of a bare ``ensure:'' ONLY in non-generator
	scopes: the ``ex pass'' re-raise below is unsafe inside a forked generator
	process (``exception has already been signalled''), so a try/finally inside a
	generator keeps the plain ensure: and this one exc_info gap."

	| propExc |
	propExc := nil.
	^ [ [protectedBlock value]
			on: BaseException do: [:ex | propExc := ex. ex pass] ]
		ensure: [
			propExc isNil
				ifTrue: [finallyBlock value]
				ifFalse: [ | sav |
					sav := self ___currentException___.
					self ___setCurrentException___: propExc.
					[finallyBlock value]
						ensure: [self ___setCurrentException___: sav] ] ]
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameChain___
	"The CALLER's live Python stack as a chain of PyFrames, innermost first,
	linked by f_back.  Answers nil when no frame could be built.

	This is what sys._getframe stands on, and it gets the stack the only way a
	running gem can: by RAISING.  GsProcess>>_frameContentsAt: reads a SUSPENDED
	process -- ``GsProcess current'' inside running code answers stackDepth 0 and
	no frames at all -- while the VM's raise-time capture
	(#GemExceptionSignalCapturesStack) fills _gsStack with (method, ip, receiver)
	triples for the whole live stack.  So a throwaway Error is signalled and
	immediately caught, purely for its capture.  CPython's _getframe is free;
	this one costs a raise, which the traceback machinery already measures at
	~1.3 ns per frame.

	Deliberately NOT ___buildFramesFromCapturedStack___: that walk answers a
	TRACEBACK -- the path from raise to catch -- so it trims at the catching
	function, which is precisely the frame a live stack walk wants to continue
	past.  It also merges block frames into their home method, which is right for
	both uses, and that rule is repeated here rather than shared, because the two
	walks agree on almost nothing else.

	The chain is built OUTERMOST-first so each frame can be handed its caller as
	f_back; the innermost frame, returned here, is therefore the last one built."

	| probe st pairs prev frame done |
	self ___ensureStackCapture___.
	"Signal and catch in one breath.  ``ex return:'' unwinds without letting the
	Error reach any outer handler -- notably not a Python ``except''."
	probe := [Error @env0:new @env0:signal: 'grail live-frame probe']
		@env0:on: Error do: [:ex | ex @env0:return: ex].
	st := [probe @env0:_gsStack] @env0:on: Error do: [:ex | ex @env0:return: nil].
	st isNil ifTrue: [^ nil].
	"(method, ip) for every frame that is a Python FUNCTION, innermost first.
	A block frame carries a nil selector and belongs to its home method, so it is
	skipped -- CPython has no frame for a comprehension body or an except block."
	pairs := OrderedCollection @env0:new.
	"``done'' rather than leaving the loop early: the index of a to:do: is a block
	PARAMETER and not assignable, so there is nothing to advance past the end."
	done := false.
	2 to: st @env0:size by: 3 do: [:i |
		| meth |
		done ifFalse: [
			meth := st @env0:at: i.
			"Trailing nils pad the array; the real frames end at the first one."
			meth isNil
				ifTrue: [done := true]
				ifFalse: [
					((meth @env0:environmentId @env0:= 1) and: [meth @env0:selector notNil])
						ifTrue: [
							"Env 1 plus a decodable selector is not enough to mean ``Python frame'':
							Grail compiles its own runtime helpers into env 1 too, and they decode to
							perfectly plausible names -- ``perform'' and ``value'' duly appeared at the
							innermost end of every walk.

							The test is whether the method IS generated Python code, asked of its
							SOURCE and so independent of the ip.  The first version asked instead
							whether a Python LINE could be derived at this ip, which conflated two
							different questions and broke under native code: §9.10 records that ip ->
							line derivation fails closed for a frame suspended inside a protected
							block, and native ips differ from bytecode ips, so on CI (native code on,
							unavailable on macOS/arm64) legitimate frames were silently DROPPED from
							the walk rather than merely losing their line number."
							(((self ___pythonFrameNameFor___: meth @env0:selector) notNil)
								and: [self ___isGeneratedPythonMethod___: meth]) ifTrue: [
									pairs @env0:add: { meth. st @env0:at: i @env0:+ 1 }]]]]].
	pairs @env0:isEmpty ifTrue: [^ nil].
	prev := None.
	pairs @env0:size @env0:to: 1 by: -1 do: [:k |
		| pair meth ip name line code |
		pair := pairs @env0:at: k.
		meth := pair @env0:at: 1.
		ip := pair @env0:at: 2.
		"A nil line is not a reason to drop the frame -- see the filter above -- so it
		becomes 0, the same ``position unknown'' a traceback frame uses."
		line := self ___pythonLineForMethod___: meth ip: ip.
		name := self ___pythonFrameNameFor___: meth @env0:selector.
		code := PyCode @env0:name: name
			filename: (self ___liveFrameFilenameFor___: meth)
			firstlineno: 0.
		frame := PyFrame @env0:code: code lineno: (line ifNil: [0]) back: prev globals: None.
		prev := frame].
	^ frame
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameFilenameFor___: aMethod
	"The ``co_filename'' for a live frame's method.

	A traceback takes ONE filename for every frame, from the catching function's
	PyCode -- fine there, because a traceback is usually within one module, and
	wrong in general.  A live stack walk crosses modules routinely (the test
	runner calls the test calls the library), so the filename is derived per
	frame instead.

	A generated Python function's defining class IS its module: ``meth inClass
	name'' answers the module name, so the module's own ``__file__'' is one
	sys.modules lookup away.  Falls back to ``<grail>'', which is what a frame
	with no locatable module has always reported."

	| clsName mod file |
	clsName := [aMethod @env0:inClass @env0:name @env0:asString]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	clsName isNil ifTrue: [^ '<grail>'].
	mod := [(importlib @env1:modules) @env0:at: clsName @env0:asSymbol otherwise: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	mod isNil ifTrue: [^ '<grail>'].
	file := [mod @env0:dynamicInstVarAt: #'__file__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	((file isNil) or: [(file isKindOf: CharacterCollection) @env0:not])
		ifTrue: [^ '<grail>'].
	^ file @env0:asString
%

category: 'Grail-Live Frames'
classmethod: BaseException
___isGeneratedPythonMethod___: aMethod
	"Whether ``aMethod'' is compiled Python rather than part of Grail's runtime.

	Asked of the method SOURCE, not of an ip: codegen emits ``___curPos___ := N''
	before every Python statement, so the literal is present in any generated
	body and absent from every hand-written Smalltalk one.  That makes this
	answer independent of where the frame is suspended, which the ip -> line
	derivation is not (§9.10).

	Cached per method in SessionTemps, like the ip -> line cache and for the same
	reason: the answer is fixed for the life of the method, and a stack walk
	revisits the same methods constantly."

	| cache key |
	cache := SessionTemps @env0:current @env0:at: #'GrailPyMethodCache' otherwise: nil.
	cache isNil ifTrue: [
		cache := KeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #'GrailPyMethodCache' put: cache].
	key := aMethod @env0:asOop.
	^ cache @env0:at: key ifAbsent: [
		| answer |
		answer := [(aMethod @env0:sourceString) @env0:includesString: '___curPos___']
			@env0:on: Error do: [:ex | ex @env0:return: false].
		cache @env0:at: key put: answer.
		answer]
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___handlerDepth___
	"How many ``except'' handler BODIES are currently running in this session.

	Used to keep an exception raised in one handler from being caught by a LATER
	handler of the same try.  Python's except clauses are alternatives for the try
	BODY only, but they compile to nested protected blocks -- so the later
	handlers' on:do: enclose the earlier handlers' bodies and would catch what
	they raise.

	A selector records this depth when it is INSTALLED and refuses to handle
	anything once the depth has risen above it (PyLazyExceptSelector
	>>on:shieldedAbove:).  Recording the depth rather than a flag is what makes
	nesting work: a try INSIDE a handler installs its own selectors at the raised
	depth, so its own handlers still catch from its own body, while the outer
	try's later handlers stay shielded."

	^ (SessionTemps @env0:current @env0:at: #'GrailHandlerDepth' otherwise: 0)
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___enterHandler___
	"Called as an ``except'' handler body starts."

	SessionTemps @env0:current
		@env0:at: #'GrailHandlerDepth'
		put: self ___handlerDepth___ @env0:+ 1.
	^ self
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___exitHandler___
	"Called as an ``except'' handler body finishes, however it finishes -- the
	caller pairs this with the enter through ensure:, so a return / break /
	continue or a re-raise still unwinds the count."

	| d |
	d := self ___handlerDepth___.
	SessionTemps @env0:current
		@env0:at: #'GrailHandlerDepth'
		put: (d @env0:> 0 ifTrue: [d @env0:- 1] ifFalse: [0]).
	^ self
%
