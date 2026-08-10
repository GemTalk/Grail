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
		aCause == nil ifTrue: [^ excValue @env0:signal].
		^ excValue ___signalNew___: (Array @env0:new) kw: nil cause: aCause].
	(excValue @env0:isKindOf: BaseException) ifTrue: [
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
	(``str(e)'' / ``e.args'') as well as GemStone's messageText."

	^ aBlock @env0:on: AlmostOutOfStack do: [:ex | | re |
		re := RecursionError ___new___.
		re ___args___: { 'maximum recursion depth exceeded' }.
		re @env0:messageText: 'maximum recursion depth exceeded'.
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
	"Return the exception context (the exception that was being handled
	when this exception was raised).  Full implicit chaining (auto-setting
	the context from the currently-handled exception on every raise) is
	still unimplemented, but an EXPLICITLY chained context -- stored in the
	___context___ dynamic instVar by code that constructs a derived
	exception (e.g. Enum value-lookup when a _missing_ hook returns a bad
	value or raises) -- is honored here.  Unset -> None (CPython default)."

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
method: BaseException
___pushCatchingFrame___: aCode pos: posArray
	"Add a frame for the function CATCHING this exception (TryAst emits this at
	the except handler), but ONLY when no traceback exists yet.  A body wrapper
	(nested/complex functions) or the comprehension iterator wrapper already
	locates the exception more precisely; adding the catch-site frame on top
	would duplicate it (and, for the comprehension, replace the exact-column
	frame the test checks).  So this is the universal FALLBACK -- it fires for
	an exception raised in a wrapper-less function (a plain module-level def or
	method) and caught here, which would otherwise carry no traceback at all."

	tracebackObj isNil ifTrue: [^ self ___pushFrameFromPos___: aCode pos: posArray].
	^ self
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
