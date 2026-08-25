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
___classForArgs___: positional
	"Which class to instantiate for these constructor arguments -- normally
	SELF, and overridden only where Python says a class hands construction to
	a different one.

	PEP 654 makes BaseExceptionGroup do exactly that: ``BaseExceptionGroup(msg,
	excs)'' answers an EXCEPTIONGROUP when every contained exception is an
	Exception, so ``except ExceptionGroup'' catches it.  See
	BaseExceptionGroup class >> ___classForArgs___:.

	A hook rather than a special case inside the construction paths, because
	there are three of them (the literal-arity __new__: forms, ___signalNew___:
	and the ___pyRaiseNew___: that funnels into it) and a rule applied to only
	some of them is worse than no rule -- the class would depend on whether the
	group was built as an expression or raised directly."

	^ self
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
	"``ExceptionClass(a, b)`` as an expression.

	Through ___classForArgs___:, so ``BaseExceptionGroup('m', [ValueError()])''
	answers an ExceptionGroup here just as it does when raised."

	| instance args |
	args := { arg1. arg2 }.
	instance := (self ___classForArgs___: args) ___new___.
	instance ___args___: args.
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

category: 'Grail-Argument Binding'
classmethod: BaseException
___missingArgumentsText___: names kind: kind qualifiedName: qname
	"CPython's format_missing() text, for the argument names in ``names''.

		f() missing 1 required positional argument: ''c''
		f() missing 2 required positional arguments: ''b'' and ''c''
		f() missing 3 required positional arguments: ''a'', ''b'', and ''c''

	Note the Oxford comma at three or more and the bare ``and'' at exactly two
	-- test_positional_only_arg matches all three shapes as regexes, so the
	joining is not cosmetic.  ``kind'' is ''positional'' or ''keyword-only'';
	``qname'' is the __qualname__, which is what CPython names here (``C.m()'',
	``outer.<locals>.inner()''), not the bare function name."

	| text n |
	n := names @env0:size.
	text := qname @env0:, '() missing ' @env0:, (n @env0:printString)
		@env0:, ' required ' @env0:, kind @env0:, ' argument'
		@env0:, ((n @env0:= 1) ifTrue: [''] ifFalse: ['s']) @env0:, ': '.
	names @env0:doWithIndex: [:each :i |
		(i @env0:> 1) ifTrue: [
			text := text @env0:, ((n @env0:> 2) ifTrue: [', '] ifFalse: [' ']).
			(i @env0:= n) ifTrue: [text := text @env0:, 'and ']].
		text := text @env0:, '''' @env0:, (each @env0:asString) @env0:, ''''].
	^ text
%

category: 'Grail-Argument Binding'
classmethod: BaseException
___signalMissingArguments___: names kind: kind qualifiedName: qname
	"Raise the missing-argument TypeError for an already-determined list of
	names.  The per-parameter binding fallbacks emitted by FunctionDefAst and
	LambdaAst come here with a single name, so a call that somehow reaches one
	of them still reports CPython's wording rather than a second, older one."

	^ TypeError ___signal___:
		(self ___missingArgumentsText___: names kind: kind qualifiedName: qname)
%

category: 'Grail-Argument Binding'
classmethod: BaseException
___checkMissingPositional___: positional kwargs: kwargs names: names posonly: posonlyCount qualifiedName: qname
	"Raise if any REQUIRED positional parameter is unfilled, naming them ALL.

	Grail used to raise from inside the binding loop, so whichever parameter it
	reached first was the whole report: ``f(a, b, c)'' called ``f()'' said
	``missing required argument: a'' where CPython says all three.  Collecting
	them cannot be done during binding, hence this pre-pass.

	``names'' is the required parameters in order, occupying parameter
	positions 1..names size -- they are always a prefix, since Python forbids a
	parameter without a default after one with a default.  The first
	``posonlyCount'' of them are positional-only and so are NOT fillable by
	keyword (PEP 570); a keyword of that name belongs to **kwargs instead."

	| missing |
	missing := OrderedCollection @env0:new.
	names @env0:doWithIndex: [:each :i |
		((positional @env0:size) @env0:>= i) ifFalse: [
			((i @env0:> posonlyCount)
				and: [(kwargs @env0:notNil)
					and: [kwargs @env0:includesKey: each]])
				ifFalse: [missing @env0:add: each]]].
	(missing @env0:isEmpty) ifTrue: [^ self].
	^ self ___signalMissingArguments___: (missing @env0:asArray)
		kind: 'positional' qualifiedName: qname
%

category: 'Grail-Argument Binding'
classmethod: BaseException
___checkMissingKeywordOnly___: kwargs defaults: defaults names: names qualifiedName: qname
	"As ___checkMissingPositional___, for keyword-only parameters: a name is
	filled by the call's kwargs, or by a default, and is missing otherwise.
	CPython reports these separately from the positional ones and only once the
	positional set is complete, which is why this runs after that check.

	``defaults'' is the def's __kwdefaults__ dict, or nil.  It is consulted at
	RUNTIME rather than baked in, because __kwdefaults__ is writable: deleting
	an entry makes an apparently-defaulted parameter required, and CPython then
	reports it here."

	| missing |
	missing := OrderedCollection @env0:new.
	names @env0:do: [:each |
		(((kwargs @env0:notNil) and: [kwargs @env0:includesKey: each])
			or: [(defaults @env0:notNil) and: [defaults @env0:includesKey: each]])
			ifFalse: [missing @env0:add: each]].
	(missing @env0:isEmpty) ifTrue: [^ self].
	^ self ___signalMissingArguments___: (missing @env0:asArray)
		kind: 'keyword-only' qualifiedName: qname
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

category: 'Grail-Initialization'
classmethod: BaseException
___hasUserNew___
	"True if this class defines its OWN Python __new__ (any arity) somewhere
	below BaseException.  The companion of ___hasUserInit___, and it exists for
	the same reason: a raise has to know whether CALLING the class differs from
	ALLOCATING it.

	It differs in a way __init__ does not.  A user __init__ can only fail, and
	the failure is an exception either way; a user __new__ can SUCCEED and hand
	back something that is not an exception at all -- CPython's own test raises
	a class whose __new__ answers ``[''mortal value'']'' -- and then the raise
	owes a TypeError rather than the class it was given.  Allocating directly,
	which is what ___signalNew___ does, cannot see any of that."

	| c |
	c := self.
	[c notNil and: [c ~~ BaseException]] whileTrue: [
		| md |
		md := c methodDictForEnv: 1.
		((md includesKey: #'__new__')
			or: [(md includesKey: #'__new__:')
			or: [(md includesKey: #'__new__:_:')
			or: [(md includesKey: #'__new__:_:_:')
			or: [md includesKey: #'___new__:kw:']]]])
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

	| instance cls |
	"___classForArgs___: may hand construction to a DIFFERENT class (PEP 654's
	BaseExceptionGroup -> ExceptionGroup narrowing).  __init__ is then looked
	up on that class too -- asking ``self'' would consult the class that was
	named rather than the one being built."
	cls := self ___classForArgs___: positional.
	instance := cls ___new___.
	instance ___args___: positional.
	(cls @env0:___hasUserInit___) ifTrue: [
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
		"A user __new__ has to be RUN, and only calling the class runs it: it can
		answer something that is not an exception, which CPython reports as a
		TypeError naming both classes.  Neither branch below would notice --
		___signalNew___ allocates directly and the fast path does not even do
		that -- so this is decided first (test_raise
		test_new_returns_invalid_instance)."
		(excValue @env0:___hasUserNew___) ifTrue: [
			^ self ___pyRaise___: (self ___exceptionFromClass___: excValue)
				cause: aCause].
		"A bare class has no instance to hang __cause__ on, so ``raise Cls from
		C'' has to build one; without a cause keep the cheaper direct signal."
		aCause == nil ifTrue: [
			"...and neither does it for the IMPLICIT context, so when there is an
			exception being handled, build the instance rather than signalling the
			class directly.  ``raise KeyError'' inside an ``except'' must record the
			handled exception as __context__ exactly as ``raise KeyError()'' does
			(test_traceback's PyExcReportingTests test_context).  With nothing being
			handled -- the common case -- keep the cheaper direct signal.

			A user __init__ disqualifies the fast path whatever is being handled:
			``raise Cls'' is ``raise Cls()'', so an __init__ that RAISES must
			surface its own exception rather than the class it was called on.
			Grail signalled the class, so the raise reported the exception the user
			was trying to construct instead of the one construction actually threw
			-- and only when nothing happened to be in flight, which is why it
			survived so long (test_raise test_erroneous_exception)."
			((BaseException @env0:___currentException___) isNil
				and: [(excValue @env0:___hasUserInit___) not])
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
		"In flight -- its handler is running, so the object is a live anchor and
		cannot be signalled again.  A CARRIER re-raises it without re-signalling
		it, which keeps CPython's identity AND gets a fresh handler search; #pass
		kept the identity but resumed outside the active on:do:, skipping any
		handler established inside the except body.  See ___signalCarrying___:."
		(self ___isInFlight___: excValue) ifTrue: [^ self @env0:___signalCarrying___: excValue].
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

	"ENSURE THE FLAVOUR HERE TOO, not only on the import path.  GemStone offers no
	 login hook -- there is no such selector on System or GsSession and no
	 configuration parameter for one -- so ``once per login'' has to be a memoised
	 one-shot at whatever runs first, which is what
	 importlib class>>___ensureStackErrorFlavour___ is.  Calling it from the guard as
	 well makes the pairing self-enforcing: the code that converts the signal is the
	 code that asks for the flavour it converts, so a session that reaches a guard
	 by some path the import hooks do not cover is still correct.  Memoised, so the
	 cost is one SessionTemps probe per guarded boundary -- and guards sit at
	 boundaries (module init, one per test), never in a hot loop."
	importlib @env0:___ensureStackErrorFlavour___.
	^ aBlock @env0:on: (AlmostOutOfStack @env0:, AlmostOutOfStackError) do: [:ex | | re |
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
	Smalltalk error.

	THIRD FALLBACK, when ``pass'' fails too.  ``pass'' needs the original
	raise's HANDLER FRAME to still be on this process's stack.  Re-raising an
	exception captured from a GENERATOR or COROUTINE breaks that assumption
	completely: the body ran on its own forked GsProcess (PythonGenerator >>
	_forkBody), so the frame ``pass'' wants is on a different stack, and often a
	finished one.  It surfaced as an UNCATCHABLE ``ImproperOperation: cannot
	find handler frame for exception'', which is how the ordinary asyncio
	pattern died:

	    fut.set_exception(exc)      # captured inside a coroutine
	    ...
	    raise self._exception       # asyncio.Future.result(), later, elsewhere

	-- 24 tests of CPython''s test_asyncgen, all reported as that one Smalltalk
	error rather than as anything Python could see.  Storing an exception and
	re-raising it later is not exotic; it is how every future, task and
	``except ... as e: ... raise e'' works.

	A COPY is signalled in that case.  It carries the class, args, dynamic
	instVars and __traceback__ (measured: a shallow copy preserves all four), so
	everything Python reads off the exception is intact -- what changes is
	OBJECT IDENTITY, so ``except E as c: c is e'' answers false on this path
	alone.  CPython keeps identity.  That is a real deviation and it is the
	right trade: it fires only when the original raise context is gone, where
	the alternative is not identity but an uncatchable VM error.  The two paths
	above still preserve identity, and they are the common case."

	^ [excValue @env0:signal]
		@env0:on: (Globals @env0:at: #UncontinuableError)
		do: [:u |
			u @env0:return:
				([excValue @env0:pass]
					@env0:on: (Globals @env0:at: #ImproperOperation)
					do: [:i | i @env0:return: (excValue @env0:copy @env0:signal)])]
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___applyCause___: aCause to: anException
	"Wire up ``raise anException from aCause''.  CPython sets __cause__, and
	sets __suppress_context__ as a side effect either way -- ``from None''
	suppresses the implicit context while recording NO cause, which
	___setCause___:context: expresses as a nil cause.  A cause that is neither
	None nor a BaseException is a TypeError.

	A CLASS cause is INSTANTIATED, exactly as the raised operand is: ``raise
	IndexError from KeyError'' leaves __cause__ holding a KeyError instance, not
	the KeyError class.  Grail stored the class, so every consumer downstream --
	``isinstance(e.__cause__, KeyError)'', a traceback's ``The above exception
	was the direct cause'' rendering, contextlib's identity test -- was handed a
	type where it expected an exception, and none of them said so at the point
	the ``from'' was written (test_raise test_class_cause).  Instantiating also
	means a cause class whose __init__ raises reports THAT, and one whose __new__
	answers a non-exception is a TypeError (test_erroneous_cause,
	test_class_cause_nonexception_result)."

	| c |
	c := (aCause == None) ifTrue: [nil] ifFalse: [aCause].
	((c @env0:notNil) and: [(c @env0:isKindOf: Behavior)
		and: [(c == BaseException) or: [c @env0:inheritsFrom: BaseException]]])
			ifTrue: [c := self ___exceptionFromClass___: c].
	(c == nil or: [c @env0:isKindOf: BaseException])
		ifFalse: [^ TypeError ___signal___:
			'exception causes must derive from BaseException'].
	^ anException ___setCause___: c context: nil
%

category: 'Grail-Raise Validation'
classmethod: BaseException
___exceptionFromClass___: cls
	"CPython's do_raise on a CLASS operand: the class is CALLED with no
	arguments, and what comes back has to be a BaseException instance.

	Calling rather than allocating is the whole point.  ``raise Cls'' is defined
	as ``raise Cls()'', so a user __init__ runs (and its exception, not Cls,
	is what propagates) and a user __new__ runs (and can answer anything at
	all).  Grail's ___signalNew___ allocates and then optionally runs __init__,
	which covers the first and cannot cover the second.

	The message is CPython's own, and it names both classes because either one
	can be the surprise -- the class that was called and the class it wrongly
	answered."

	| inst b |
	inst := cls @env1:value: (Array @env0:new) value: nil.
	(inst @env0:isKindOf: BaseException) ifTrue: [^ inst].
	b := (Python @env0:at: #builtins) instance.
	^ TypeError ___signal___: 'calling ' @env0:,
		((b repr: cls) @env0:asString) @env0:,
		' should have returned an instance of BaseException, not ' @env0:,
		((b repr: (b type: inst)) @env0:asString)
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

	"NOT an exception class -- so this is not a construct-and-signal at all.
	``raise f(x)'' where f is an ordinary callable is legal Python: the call is
	EVALUATED and its result is raised, and it is the RESULT that must be an
	exception.  RaiseAst routes every bare-name callee here because a bare name
	is usually a class, but ``raise next(iter([]))'' -- CPython's own idiom in
	test_with, where next() raises StopIteration before returning anything -- is
	the counter-example.  Rejecting the callee outright reported ``exceptions
	must derive from BaseException'' about a perfectly good call that had not
	been made yet.

	Evaluating and re-routing keeps the guard that motivated this branch:
	``raise NewStyleClass()'' still constructs an instance, and ___pyRaise___:
	still finds it is not a BaseException and answers the same TypeError
	(test_baseexception test_raise_new_style_non_exception).  What changes is
	that the diagnosis now comes from the VALUE rather than from the callee."
	((cls @env0:isKindOf: Behavior)
		and: [(cls == BaseException) or: [cls @env0:inheritsFrom: BaseException]])
			ifFalse: [
				^ self ___pyRaise___: (cls @env1:value: positional value: kwargs)
					cause: aCause].
	"Every Python ``raise'' funnels through here, and this runs BEFORE the signal,
	so arming the VM's stack capture here covers even the session's first raise.
	Memoised in SessionTemps, so after the first raise it is one dictionary
	probe.  Placed here rather than on an import hook because a session can
	raise without importing, and the flag has to be set before the signal or the
	traceback has nothing to walk.  The @env0: prefix is required: this method is
	env 1, and the traceback-building helpers all live in env 0 alongside
	___pushCatchingFrame___, which generated code also reaches with @env0:."
	self @env0:___ensureStackCapture___.
	"A user __new__ makes construction observable in a way allocation is not, so
	``raise Cls(...)'' has to be a real CALL -- see ___hasUserNew___.  The result
	goes back through ___pyRaise___:, which is where a __new__ that answered a
	non-exception becomes ``exceptions must derive from BaseException'' -- the
	message CPython gives for the CALL form, as against the ``should have
	returned an instance of'' one it gives for a bare class."
	(cls @env0:___hasUserNew___) ifTrue: [
		^ self ___pyRaise___: (cls @env1:value: positional value: kwargs)
			cause: aCause].
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
			(idx @env0:> 1) ifTrue: [
				stream @env0:nextPutAll: ', '.
			].
			"Each argument is rendered with Python repr(), which is what CPython's
			BaseException_repr does (it formats self->args, a tuple, with %R).
			Smalltalk ``asString'' was standing in for it, and only agreed with
			Python on the types whose printString happens to look Pythonic --
			integers, and strings once quotes were added by hand.  Everything else
			leaked Smalltalk: None printed ``aNoneType'', a tuple ``atuple'', and a
			nested exception the VM's ``a StopIteration occurred (error 2702)''.
			test_yield_from's test_next_and_return_with_value compares
			``%r'' % (e,) against ``StopIteration((2,))'' and
			``StopIteration(StopIteration(3))'', both of which need real repr.
			Quoting is no longer applied here: repr() of a str already returns it
			quoted, and doing both gave ``''''spam''''''."
			stream @env0:nextPutAll:
				((builtins instance) repr: arg) @env0:asString.
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
		"``str __new__:'' rather than the removed ``builtins>>str:'' fast path --
		str is a class now, so this is ordinary instantiation."
		^ str __new__: arg
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
___signal___: message
	"Signal this exception, chaining it to whatever is being handled first.

	The implicit context used to be applied only on the paths a Python ``raise''
	STATEMENT takes -- ___pyRaise___: and ___signalNew___.  CPython does not
	care who raised: any exception raised while another is being handled records
	it, including one the runtime raises on the user's behalf.  Grail's did not,
	so

	    try:  1/0
	    except ZeroDivisionError:  xyzzy

	produced a NameError with __context__ None, and the traceback lost the
	``During handling of the above exception'' half entirely -- the one thing
	that says WHY the second exception happened (test_raise
	test_c_exception_raise, test_context_manager).  Every hand-built raise in
	the runtime had the same hole: NameError >> ___signalUndefined___:,
	AttributeError >> ___signalMissing___:, and any other that builds its
	instance to carry an attribute.

	Here rather than in ``object >> ___signal___:'', which every Grail object
	inherits and most receivers of are not exceptions at all.  Idempotent:
	___applyImplicitContext___ returns immediately once a context is set, so the
	paths that already applied it pay only the guard below.

	The guard is the cheap half of ___applyImplicitContext___'s own first test,
	hoisted: with nothing being handled -- which is the common case for the
	common raise -- there is no context to apply, and this answers that from one
	SessionTemps read instead of the handler install ___rawContext___ costs.

	No control-flow screen is needed, and that is worth stating because getting
	it wrong would be quiet: chaining a PythonReturn would put it in
	sys.exc_info(), and ___applyImplicitContext___ RELEASES the handled
	exception's stack capture, so a ``break'' out of an except block would
	silently shorten that exception's traceback.  It cannot happen -- PythonReturn
	overrides this selector, and PythonBreak / PythonContinue are signalled
	through the argument-less ___signal___ -- so the screen would cost every
	raise a send to defend against a path that does not exist."

	"ARMED HERE, not only on the ``raise'' statement's path.  The capture flag
	was set in ___pyRaiseNew___:args:kw:cause:, whose comment claims it ``covers
	even the session's first raise'' -- true of an EXPLICIT raise, and false of
	every exception the runtime raises on the user's behalf, which never reaches
	that method.  So the first ZeroDivisionError / TypeError / AttributeError /
	KeyError of a session was signalled with capture still off and got a
	ONE-FRAME traceback, losing every caller; the next one, and everything after
	an explicit raise, was fine.  Measured in a fresh session: ``1/0'' inside a
	nested function reported ['probe_implicit'] where CPython reports
	['probe_implicit', 'inner'], and the same call after any explicit raise
	reported both.

	That made the whole traceback depth of a session depend on WHICH KIND of
	exception happened to come first, which is not a property any program
	controls.  It also made the frame-shape tests order-dependent: they pass in
	the full SUnit suite, where something raises explicitly long before they run,
	and failed 25/25 in a fresh session -- and on CI, where shard composition
	decides the order, that is the intermittent
	TracebackTestCase>>testLiveFramesAndGetframe failure.

	This is the SAME correction the implicit-context fix above made, for the same
	reason: CPython does not care who raised.  So it belongs at the same funnel,
	which is the one every hand-built runtime raise already comes through.
	Idempotent and memoised in SessionTemps, so after the first exception it is
	one dictionary probe on a path that already does one."
	BaseException @env0:___ensureStackCapture___.
	(BaseException @env0:___currentException___) isNil ifFalse: [
		self ___applyImplicitContext___].
	self ___captureFrameLocalsIfSuggestible___.
	^ self @env0:signal: message
%

category: 'Grail-Live Frames'
method: BaseException
___captureFrameLocalsIfSuggestible___
	"Snapshot the innermost Python frame's locals, but ONLY for the three
	exception types whose message can carry a ``Did you mean'' suggestion.

	WHY AT RAISE TIME.  traceback.py's _compute_suggestion_error offers a
	misspelled name's nearest match, and its candidates for a NameError are the
	frame's locals, globals and builtins.  Globals it can derive after the fact
	(PyFrame>>f_globals resolves them from co_filename) and builtins are a class,
	but LOCALS exist only while the frame is on the stack: a traceback is
	rendered after unwinding, from captured (method, ip, receiver) triples that
	hold no temporaries.  So either they are taken here or they are not available
	at all.

	WHY ONLY THREE TYPES.  Reading and filtering one frame measures ~1us, and
	Python raises for CONTROL FLOW -- StopIteration on every exhausted iterator --
	so paying it on every raise would tax the hot path to serve a courtesy
	message.  CPython computes suggestions for exactly AttributeError, NameError
	and ImportError (_compute_suggestion_error asserts as much), and all three are
	genuine errors already on their way to being formatted.  Subclasses included,
	via inheritance, because CPython's own test is an isinstance.

	Failure is silent by design: a suggestion is a courtesy and must never turn a
	clean exception into a Smalltalk error on the way out of a raise.  Stored as a
	dynamic instVar so ___pyAttrLoad___ hands it back by value; absent when
	nothing was found, which every consumer already tolerates.

	NAMES only, not values, WITH ONE EXCEPTION.  The NameError candidate list is a
	list of names, and holding the values would keep every local of a failed frame
	alive on the exception for as long as it is reachable -- a retention hazard for
	a courtesy message.  The RECEIVER is the exception, stored as
	``___frameSelf___'', because two CPython behaviours need the object and not
	just its name: ``self.<name>'' for an undefined bare name that is an attribute
	of the instance, and un-hiding underscored candidates when a failed attribute
	access came from inside the object's own method (which compares the receiver
	with the AttributeError's ``obj'' by identity).  It costs one reference, not a
	frame's worth: the VM's raise-time capture already holds the receiver of every
	frame -- _gsStack is (method, ip, RECEIVER) triples -- so nothing is kept alive
	here that the exception was not keeping alive already, and after
	___releaseCapturedStack___ drops that capture this single slot is bounded where
	a full locals snapshot would not be.

	The receiver's DECLARED name goes into the name list beside the temporaries, so
	that a consumer asking CPython's question -- is there a ``self'' in this
	frame's locals? -- gets the right answer for a method and the right answer for
	a module-level function, which has a Smalltalk receiver but declared no name
	for it.  PyFrame>>___receiverNameForFrameMethod___: is what draws that line."

	"THE THREE-TYPE GATE NOW GUARDS THE SUGGESTION HALF ONLY.  The snapshot below is
	taken for EVERY exception, because f_locals on a traceback frame is not a
	courtesy the way a ``Did you mean'' is: CPython's traceback holds its frames,
	and holding them is exactly what makes tb_frame.f_locals readable after the
	stack has unwound (MiscTracebackCases.test_clear).  There is nowhere later to
	take it from -- the VM's capture records (method, ip, receiver) and no
	temporaries -- so it is raise time or never.

	ONLY THE INNERMOST FRAME, which is what makes this affordable.  The snapshot is
	O(1) per raise (~1 us), where capturing every frame would be O(depth) per raise
	and O(depth squared) retained -- the pathology ___releaseCapturedStack___
	exists to prevent, measured at ~350 million triples on the classic runaway.

	AND YES, THIS RETAINS VALUES.  The suggestion half deliberately keeps NAMES
	only, to avoid pinning a failed frame's objects on a courtesy message.  For
	f_locals that reasoning inverts: CPython pins them too, which is precisely why
	frame.clear() and traceback.clear_frames() exist, and Grail now offers both."
	"EVERY send below is @env0:-annotated, PyFrame's included.  This method is
	 compiled in env 1 and PyFrame's finder is an env-0 class method, so an
	 unannotated send resolves in the wrong environment -- which is how the first
	 version failed: silently, because the whole body is inside the guard block
	 below, so the MessageNotUnderstood was caught and discarded and the snapshot
	 simply never appeared."
	"NOT ON A STACK THAT IS ALREADY DEEP.  The walk below is the only part of a
	 raise that is not O(1) in frames, and this method now runs for EVERY
	 exception rather than for the three suggestible types, so it executes at the
	 top of a runaway recursion -- where ZeroDivisionError.gs's comment on
	 ___checkDivisor___: describes what extra frames under ___signal___: do.  A
	 raise that is already this deep gets no f_locals, which is the same
	 fail-closed answer a misaligned level gets and which
	 ``getattr(frame, 'f_locals', None)'' already tolerates.

	 512 is FAR above what a real traceback needs and FAR below where the gem
	 warns.  A Python frame costs several Smalltalk frames, so 512 still covers
	 tens of Python frames -- deeper than any traceback a person reads -- while
	 the soft AlmostOutOfStack here fires at 3072 (GEM_MAX_SMALLTALK_STACK_DEPTH
	 1000, GEM_SMALLTALK_STACK_ERROR_PERCENT 25), leaving the walk unable to be
	 the thing that trips it.  An absolute number rather than a fraction of the
	 configured maximum because the mapping between the two is not documented and
	 measured 1000 -> 3072 here; a low fixed line needs no such mapping to be
	 safe.  System stackDepth is a primitive on the RUNNING process -- unlike
	 GsProcess current stackDepth, which answers 0 -- and costs one send.
	 (System stackDepthHighwater, the neighbouring selector, COREDUMPS the gem on
	 4.0; it is not used here.)"
	System @env0:stackDepth @env0:> 512 ifTrue: [^ self].
	[ | snapshot locals rcvrName names |
	  snapshot := PyFrame @env0:___innermostPythonFrameSnapshot___.
	  snapshot @env0:notNil ifTrue: [
		locals := snapshot @env0:at: 1.
		rcvrName := snapshot @env0:at: 2.
		"f_locals for the innermost TRACEBACK frame, stored for every exception.
		 A PyDict because the consumer is Python code asking len() and iterating;
		 ___pushTracebackFrame___ hands it to the first frame it builds, which is
		 the innermost one."
		(locals @env0:notNil and: [(snapshot @env0:at: 4) @env0:notNil]) ifTrue: [
			self @env0:dynamicInstVarAt: #'___frameLocals___'
				put: (PyFrame @env0:___pyDictFrom___: locals).
			"The NAME of the frame these locals came from, so the push can refuse to
			 hand them to a different frame."
			self @env0:dynamicInstVarAt: #'___frameLocalsName___'
				put: (snapshot @env0:at: 4)].
		"Everything below is the SUGGESTION half, and only the three exception
		 types whose message can carry a ``Did you mean'' need it."
		((self @env0:isKindOf: NameError)
			or: [(self @env0:isKindOf: AttributeError)
				or: [self @env0:isKindOf: ImportError]]) ifTrue: [
		"An OrderedCollection, because that IS Grail's Python ``list'' -- the
		 consumer is Python code doing ``list(...)'' over it.  The first version
		 stored the Smalltalk Dictionary itself, which Python could see (getattr
		 answered ``<Dictionary object at 0x...>'') but could not ITERATE, so
		 traceback.py's guarded ``d.extend(list(snapshot))'' raised and was
		 swallowed by its own except-pass.  Nothing failed and nothing worked:
		 the whole cluster stayed exactly as red as before the change.
		 Converting here rather than there keeps the Python side free of any
		 Smalltalk-shaped special case."
		names := OrderedCollection @env0:new.
		locals @env0:notNil ifTrue: [locals @env0:keysDo: [:k | names @env0:add: k]].
		"The receiver is reported even when the frame has no temporaries at all --
		 ``def m(self): self.typo'' has none -- so this must not sit inside a guard
		 on the locals being non-empty, which is what the name list used to be."
		rcvrName @env0:notNil ifTrue: [
			names @env0:add: rcvrName @env0:asString.
			self @env0:dynamicInstVarAt: #'___frameSelf___'
				put: (snapshot @env0:at: 3)].
		(names @env0:isEmpty) @env0:not ifTrue: [
			self @env0:dynamicInstVarAt: #'___frameLocalNames___' put: names]]] ]
		"CATCH BROADLY, BUT PASS AlmostOutOfStack.  Both halves are load-bearing.
		 Broadly, because failure here is silent by design and Grail's Python
		 exceptions hang off Exception rather than Error, so an Error handler would
		 let one escape a raise it was only decorating.  But AlmostOutOfStack is a
		 NOTIFICATION under Exception, and it is the signal ___recursionGuard___
		 converts into a catchable RecursionError -- swallowing it consumes the
		 VM's one warning WITHOUT reducing depth, so the next overflow lands in the
		 Red Zone as an uncatchable ERROR 2502 and takes the whole test shard with
		 it.  That is not hypothetical: it is how this method's first version
		 failed, on CI only, where native code puts the trip point somewhere the
		 local gem does not.  PyFrame class>>___liveFrameContentsByLevel___ and
		 BaseException class>>___liveFrameLevelOffset___:levels: record the same
		 hazard; they can use a plain ``on: Error'' because what they guard cannot
		 raise a Python exception, and this cannot.
		 ``pass'' rather than ``return:'', deliberately: returning across the
		 primitive frame the walk is sitting on is its own documented failure
		 (UncontinuableError), and passing is what would have happened had no
		 handler been installed at all."
		@env0:on: Exception do: [:ex |
			(ex @env0:isKindOf: AlmostOutOfStack)
				ifTrue: [ex @env0:pass]
				ifFalse: [ex @env0:return: nil]].
	^ self
%

category: 'Grail-Chaining'
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
	``__traceback__'' reads back.

	None is stored as nil, not as the None singleton.  Everything that asks
	whether there is a traceback yet asks ``tracebackObj isNil'', and a stored
	None answered that question wrong -- ``with_traceback(None)'' left the
	exception looking like it already had a chain, so the next raise took the
	re-raise path and never built one.

	The MARK is what makes the raise that follows behave: a chain the user
	attached is not a partial unwind record, and ___pushCatchingFrame___ must
	prepend to it rather than discard it.  See there."

	tracebackObj := (tb == None) ifTrue: [nil] ifFalse: [tb].
	self @env0:dynamicInstVarAt: #'___tbUserAttached___' put: (tracebackObj notNil).
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

	| frame tb payload |
	((self isKindOf: PythonReturn)
		or: [(self isKindOf: PythonBreak)
		or: [(self isKindOf: PythonContinue)
		or: [self isKindOf: StopIteration]]]) ifTrue: [^ self].
	"A CARRIER is the object propagating, but the PAYLOAD is the one Python
	holds -- so a frame recorded while a carrier is unwinding has to land on the
	payload or it is discarded with the carrier.  That is what dropped the
	catch-site frame from a bare re-raise: the frames recorded BEFORE the
	re-raise were on the payload and survived, and the one added on top of them
	was not.  See ___signalCarrying___:."
	payload := BaseException ___payloadOf___: self.
	payload == self ifFalse: [
		^ payload ___pushTracebackFrame___: aCode lineno: ln colno: co
			endLineno: el endColno: ec line: src].
	frame := PyFrame code: aCode lineno: ln back: None globals: None.
	"THE INNERMOST frame gets the raise-time locals snapshot, and only it.  Frames
	are pushed innermost-first (this method PREPENDS), so the first push of a given
	traceback is the innermost one -- which is where the snapshot came from.  A
	later push must not receive it or every frame would report the innermost
	frame's variables as its own, which nothing downstream could detect."
	(tracebackObj isNil
		and: [(self @env0:dynamicInstVarAt: #'___frameLocals___') @env0:notNil
		and: [(self @env0:dynamicInstVarAt: #'___frameLocalsName___')
			@env0:= (aCode @env0:dynamicInstVarAt: #'co_name')]]) ifTrue: [
				frame @env0:dynamicInstVarAt: #'f_locals'
					put: (self @env0:dynamicInstVarAt: #'___frameLocals___')].
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

	| st armed |
	st := SessionTemps current.
	(st at: #'GrailStackCaptureOn' otherwise: nil) == true ifTrue: [^ self].
	"Set the flag, then READ IT BACK, and memoise only a CONFIRMED arming.

	The memo used to be written BEFORE the attempt, and the attempt swallowed
	every Error -- so a set that failed was remembered as having succeeded and
	nothing ever retried it.  The cost of that combination is not a failing
	call here: it is every traceback in the session silently losing its frames,
	reported by whatever reads the walk as a fact about ITS OWN request (a
	shortfall from sys._getframe, a one-frame stack from extract_tb) with
	nothing pointing back to the arming.

	Read back rather than trusting the set to raise on refusal: the contract of
	interest is `is the capture on', and only reading answers that."
	armed := [System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: true.
		(System gemConfigurationAt: #'GemExceptionSignalCapturesStack') == true]
			on: Error do: [:ex |
				"An image that does not offer the flag keeps today's single-frame
				tracebacks rather than failing -- the walk below simply finds no
				captured stack."
				ex return: false].
	"Only a confirmed arming is memoised.  Leaving the memo unset when it failed
	means the next raise tries again, so a TRANSIENT failure heals itself; the
	repeated cost falls only on an image that cannot arm at all, which is the
	case that has no working capture either way."
	armed ifTrue: [st at: #'GrailStackCaptureOn' put: true].
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
___pythonSpanForMethod___: aMethod ip: anIp
	"The 5-element PEP 657 span of the statement in flight at anIp, or nil.

	The COMPANION of ___pythonLineForMethod___:ip:, and the reason a non-catcher
	frame can carry columns at all.  That method answers a bare line, and the
	frame push had ``colno: nil'' hardcoded for every frame but the catching one
	-- so the RAISING frame, which is exactly the one a caret line attaches to,
	could never have columns however good codegen's spans were.  §9.39 traced
	the flow; this closes it.

	Cached on (method, ip) like the line scan, and for the same reason: the
	underlying _sourceAtIp: report costs ~100us and a traceback revisits the
	same sites constantly."

	| cache key |
	cache := SessionTemps current at: #'GrailIpSpanCache' otherwise: nil.
	cache isNil ifTrue: [
		cache := KeyValueDictionary new.
		SessionTemps current at: #'GrailIpSpanCache' put: cache].
	key := { aMethod @env0:asOop. anIp }.
	^ cache @env0:at: key ifAbsent: [
		| span |
		span := self ___derivePythonSpanForMethod___: aMethod ip: anIp.
		cache @env0:at: key put: span.
		span]
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___nestedFunctionNameFor___: aMethod line: aLine
	"The Python name of the nested ``def'' whose body contains aLine, within
	aMethod's source -- or nil if aLine is in no nested def.

	A nested def compiles to a BLOCK, so it has no selector to decode a name
	from (___pythonFrameNameFor___ works off the selector, which is nil for a
	block).  But codegen stamps every nested def's identity into the ENCLOSING
	method's source:

	    ___curPos___ := #(4 12 4 17 '            1 / 0').   <- inside b
	    ]) ... ___pyCode___: (PyCode @env0:name: 'b' ... firstlineno: 3).
	    ___curPos___ := #(5 8 5 11 '        b()').          <- inside a
	    ]) ... ___pyCode___: (PyCode @env0:name: 'a' ... firstlineno: 2).

	so the name is recoverable by finding the def whose LINE RANGE contains
	aLine, innermost (greatest firstlineno) winning.

	``firstlineno'' gives each range's start.  Its END comes free from the scan
	order: codegen emits a def's stamp immediately AFTER the block it names has
	closed, so at the moment the scan reaches that stamp, the greatest Python
	line it has passed IS that def's last body line.  Source order is line
	order, so a preceding sibling's lines are always lower and cannot inflate
	it.

	TWO EARLIER CUTS GOT THIS WRONG, in opposite directions, and the difference
	between them is worth keeping.

	The first took the greatest ``firstlineno'' not exceeding aLine, reasoning
	that an inner def is stamped higher than the def enclosing it so the
	innermost enclosing one wins.  That holds only when aLine is inside the last
	def OPENED before it.  In

	    def two_deep():
	        def a():
	            def b():
	                1 / 0
	            b()          # line 5
	        a()

	the frame for ``a'' sits at line 5, and ``b'' (firstlineno 3) both precedes
	line 5 and does not contain it -- reported as ['two_deep', 'b', 'b'] where
	CPython says ['two_deep', 'a', 'b'].  A start line alone cannot express
	containment; that is what the range is for.

	The second scanned the generated source FORWARD from ``_sourceAtIp:'''s
	caret, taking the first stamp after it -- exact, since blocks nest, and it
	passed everywhere locally.  It fails in CI.  ``_sourceAtIp:'' is
	GEM-DEPENDENT: with native code enabled (GemNativeCodeEnabled=2, the CI gem
	on Linux x86_64) the caret for a block frame sits PAST THE WHOLE BLOCK, and
	so past that block's own stamp, making the scan find the next stamp OUT --
	['two_deep', 'a', 'a'], every name one level too shallow.  An interpreted
	gem (macOS/arm64) answers the call site and the same code is correct.  This
	is the trap §9.10 records for the catching frame's position, which also
	passed on every local gem and failed in CI.

	Hence deriving containment from the PYTHON LINE, which both gem modes agree
	on -- the CI run that exposed the caret bug reported every line correctly
	while every name was wrong -- and touching ``_sourceAtIp:'' not at all.

	Answers nil rather than guessing when nothing matches, and the caller treats
	nil as ``merge this block into its home'' -- the pre-existing behaviour.

	Cached per (method, line): the scan is pure and reads the whole method
	source, and a deep or repeated traceback revisits the same sites
	constantly."

	| cache key |
	aLine isNil ifTrue: [^ nil].
	cache := SessionTemps current at: #'GrailFnNameCache' otherwise: nil.
	cache isNil ifTrue: [
		cache := KeyValueDictionary new.
		SessionTemps current at: #'GrailFnNameCache' put: cache].
	key := { aMethod @env0:asOop. aLine }.
	^ cache @env0:at: key ifAbsent: [
		| name |
		name := self ___deriveNestedFunctionNameFor___: aMethod line: aLine.
		cache @env0:at: key put: name.
		name]
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___deriveNestedFunctionNameFor___: aMethod line: aLine
	"Uncached worker for ___nestedFunctionNameFor___:line:.

	One linear pass over the generated source, taking ``___curPos___ :='' stores
	and ``PyCode @env0:name:'' stamps in the order they appear.  A store raises
	the running maximum Python line; a stamp closes a def, whose range is then
	its own firstlineno up to that maximum."

	| src lines best bestF maxLine rest pc ps |
	src := [aMethod @env0:sourceString]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	src isNil ifTrue: [^ nil].
	lines := src @env0:subStrings: (String @env0:with: Character lf).
	best := nil.
	bestF := 0.
	maxLine := 0.
	1 to: lines @env0:size do: [:li |
		rest := lines @env0:at: li.
		"``pc''/``ps'' are METHOD temps, not condition-block ones: the body below
		reads them, and a temp declared inside a whileTrue: condition is out of
		scope there."
		[ pc := rest @env0:indexOfSubCollection: '___curPos___ := '.
		  ps := rest @env0:indexOfSubCollection: 'PyCode @env0:name: '''.
		  (pc @env0:> 0) or: [ps @env0:> 0] ] @env0:whileTrue: [
			(pc @env0:> 0 and: [(ps @env0:= 0) or: [pc @env0:< ps]])
				ifTrue: [
					| n |
					n := self ___lineNumberAfterStore___: rest from: (pc @env0:+ 16).
					(n notNil and: [n @env0:> maxLine]) ifTrue: [maxLine := n].
					rest := rest @env0:copyFrom: (pc @env0:+ 16) to: rest @env0:size]
				ifFalse: [
					| k nm fl |
					k := ps @env0:+ 20.
					nm := WriteStream @env0:on: String @env0:new.
					[(k @env0:<= rest @env0:size) and: [(rest @env0:at: k) @env0:~= $']]
						whileTrue: [
							nm @env0:nextPut: (rest @env0:at: k).
							k := k @env0:+ 1].
					fl := self ___firstlinenoAfter___: rest from: k.
					((fl notNil) and: [
						(fl @env0:<= aLine) and: [
							(aLine @env0:<= maxLine) and: [fl @env0:> bestF]]])
						ifTrue: [
							bestF := fl.
							best := nm @env0:contents].
					rest := rest @env0:copyFrom: (ps @env0:+ 20) to: rest @env0:size]]].
	^ best
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___soleNestedFunctionNameIn___: aMethod
	"The name of aMethod's ONLY nested ``def'', or nil when it has none or more
	than one.

	An IP-INDEPENDENT fallback for ___nestedFunctionNameFor___:line:, which needs
	a Python line to decide containment and answers nil without one.  The line is
	derived from ``_sourceAtIp:'' and can legitimately come back nil --
	___derivePythonLineForMethod___:ip: fails closed when the report carries no
	caret, deliberately, because ``a missing frame is recoverable; a confidently
	wrong line number is not''.  That trade is right for the LINE and wrong for
	the frame's EXISTENCE, which is what the caller used to make depend on it.

	When the enclosing method contains exactly one nested def there is nothing to
	decide: containment is the only possibility, so the name is knowable with no
	line at all.  That covers the common shape -- one helper inside a function --
	and leaves only genuinely ambiguous methods to the placeholder.

	Counts ``PyCode @env0:name: '' stamps the same way
	___deriveNestedFunctionNameFor___ reads them, so the two agree by construction
	about what a nested def IS; this one just ignores the ranges.  Cached per
	method, like both scans beside it."

	| cache key |
	cache := SessionTemps current at: #'GrailSoleFnNameCache' otherwise: nil.
	cache isNil ifTrue: [
		cache := KeyValueDictionary new.
		SessionTemps current at: #'GrailSoleFnNameCache' put: cache].
	key := aMethod asOop.
	^ cache at: key ifAbsent: [
		| name |
		name := self ___deriveSoleNestedFunctionNameIn___: aMethod.
		cache at: key put: name.
		name]
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___deriveSoleNestedFunctionNameIn___: aMethod
	"Uncached worker for ___soleNestedFunctionNameIn___:.  One pass, counting
	stamps and remembering the first; answers nil the moment a second appears, so
	an ambiguous method costs no more than an unambiguous one."

	| src lines found n rest ps |
	src := [aMethod @env0:sourceString]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	src isNil ifTrue: [^ nil].
	lines := src @env0:subStrings: (String @env0:with: Character lf).
	found := nil.
	n := 0.
	1 to: lines @env0:size do: [:li |
		rest := lines @env0:at: li.
		[ ps := rest @env0:indexOfSubCollection: 'PyCode @env0:name: '''.
		  ps @env0:> 0 ] @env0:whileTrue: [
			| k nm |
			k := ps @env0:+ 20.
			nm := WriteStream @env0:on: String @env0:new.
			[(k @env0:<= rest @env0:size) and: [(rest @env0:at: k) @env0:~= $']]
				whileTrue: [
					nm @env0:nextPut: (rest @env0:at: k).
					k := k @env0:+ 1].
			n := n @env0:+ 1.
			n @env0:= 1 ifTrue: [found := nm @env0:contents].
			rest := rest @env0:copyFrom: (ps @env0:+ 20) to: rest @env0:size]].
	n @env0:= 1 ifTrue: [^ found].
	^ nil
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___nestedFrameNameFor___: aMethod line: aLine
	"The name to give a nested ``def'''s frame: the containing def's name when the
	line resolves it, else the sole nested def's name, else ``<nested>''.

	NEVER NIL, and that is the whole point.  Both callers -- the traceback walk
	and the live walk -- used to push the frame only when a name came back, so a
	line that failed to derive did not cost the frame its NAME, it cost the frame
	its EXISTENCE.  The method branch beside them was hardened against exactly
	that (its comment records legitimate frames ``silently DROPPED from the walk
	rather than merely losing their line number''), and the design note states
	the resulting rule: a nil line costs a frame its line number, not its
	existence.  This branch was written afterwards and did not inherit it.

	Dropping is worse than a placeholder for a reason that is not aesthetic.
	Rendering a traceback, a missing frame is a missing line of output.  But
	``sys._getframe(n)'' COUNTS POSITIONS in this same chain, so a frame that
	silently disappears does not shorten the answer, it SHIFTS it: every depth
	past the gap names the wrong function, and nothing downstream can tell.  A
	placeholder keeps the count honest and makes the gap visible.

	``<nested>'' follows CPython's own convention for a frame whose name is not a
	Python identifier -- ``<module>'', ``<lambda>'', ``<listcomp>'' -- so it reads
	as a name rather than as an error string, and it cannot collide with a real
	def name."

	| byLine |
	byLine := self ___nestedFunctionNameFor___: aMethod line: aLine.
	byLine notNil ifTrue: [^ byLine].
	^ (self ___soleNestedFunctionNameIn___: aMethod) ifNil: ['<nested>']
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___lineNumberAfterStore___: aString from: anIndex
	"The Python line a ``___curPos___ :='' store records.  Codegen emits BOTH
	shapes -- the bare SmallInteger of an ordinary statement and the 5-element
	PEP 657 literal array -- and the line is the first number in either."

	| k digits |
	k := anIndex.
	[(k @env0:<= aString @env0:size)
		and: [(aString @env0:at: k) @env0:= $ ]] whileTrue: [k := k @env0:+ 1].
	(k @env0:<= aString @env0:size and: [(aString @env0:at: k) @env0:= $#])
		ifTrue: [k := k @env0:+ 1].
	(k @env0:<= aString @env0:size and: [(aString @env0:at: k) @env0:= $(])
		ifTrue: [k := k @env0:+ 1].
	digits := WriteStream @env0:on: String @env0:new.
	[(k @env0:<= aString @env0:size)
		and: [(aString @env0:at: k) @env0:isDigit]] whileTrue: [
			digits @env0:nextPut: (aString @env0:at: k).
			k := k @env0:+ 1].
	digits @env0:contents @env0:isEmpty ifTrue: [^ nil].
	^ digits @env0:contents @env0:asNumber
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___firstlinenoAfter___: aString from: anIndex
	"The ``firstlineno:'' of the PyCode literal starting at anIndex, or nil."

	| q j digits |
	q := (aString @env0:copyFrom: anIndex to: aString @env0:size)
		@env0:indexOfSubCollection: 'firstlineno: '.
	q @env0:= 0 ifTrue: [^ nil].
	j := anIndex @env0:+ q @env0:+ 12.
	digits := WriteStream @env0:on: String @env0:new.
	[(j @env0:<= aString @env0:size)
		and: [(aString @env0:at: j) @env0:isDigit]] whileTrue: [
			digits @env0:nextPut: (aString @env0:at: j).
			j := j @env0:+ 1].
	digits @env0:contents @env0:isEmpty ifTrue: [^ nil].
	^ digits @env0:contents @env0:asNumber
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___isCaretLine___: aLine
	"Is this line _sourceAtIp:'s IP MARKER, rather than source that merely looks
	like one?

	The marker is an asterisk, then the caret and the ip, then padding:

	    * ^1                                                            *******

	Both derivations used to test ``trimSeparators beginsWith: $*'' alone, and
	that is not sufficient: a Python DOCSTRING is emitted as a multi-line
	Smalltalk string literal, so its own lines appear in the report verbatim, and
	a docstring bullet list is indistinguishable from the marker --

	    'Summary line.

	        * first bullet
	        * second bullet
	        '.

	Since the scan takes the FIRST match, a bullet ABOVE the real marker wins,
	and the caret is then located too early.  Measured on a four-line function
	with a bulleted docstring: Grail reported line 5 (the docstring's own
	___curPos___) where CPython reports 15.  When the misplaced caret lands above
	EVERY ___curPos___ the scan answers nil instead, and a nil drops the frame --
	which surfaces as sys._getframe raising ``call stack is not deep enough''.
	One cause, both symptoms, and the reason this family looked like two
	unrelated intermittent bugs.

	Requiring ``^'' followed by a digit is what separates them: the marker always
	carries the ip, and a prose bullet does not begin with a caret and a number.
	Grail's own Smalltalk method comments use the same bullet style (11 of 1060
	probed methods have such a line), so this is not exotic input."

	| t rest |
	aLine isNil ifTrue: [^ false].
	t := aLine @env0:trimSeparators.
	(t @env0:beginsWith: '*') ifFalse: [^ false].
	rest := (t @env0:copyFrom: 2 to: t @env0:size) @env0:trimSeparators.
	(rest @env0:beginsWith: '^') ifFalse: [^ false].
	rest @env0:size @env0:< 2 ifTrue: [^ false].
	^ (rest @env0:at: 2) @env0:isDigit
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___derivePythonSpanForMethod___: aMethod ip: anIp
	"Uncached worker for ___pythonSpanForMethod___:ip:.

	Same scan as ___derivePythonLineForMethod___:ip: -- last ``___curPos___ :=''
	at or above the ip's caret -- but keeps the SPAN form only.  A bare-integer
	store answers nil here, so a statement codegen gave no span to is left
	exactly as it was rather than guessed at."

	| report lines caretIdx result |
	report := [aMethod @env0:_sourceAtIp: anIp] on: Error do: [:ex | ex return: nil].
	report isNil ifTrue: [^ nil].
	lines := report @env0:subStrings: (String @env0:with: Character lf).
	caretIdx := 0.
	1 to: lines @env0:size do: [:i |
		(self ___isCaretLine___: (lines @env0:at: i))
			ifTrue: [caretIdx @env0:= 0 ifTrue: [caretIdx := i]]].
	caretIdx @env0:= 0 ifTrue: [^ nil].
	result := nil.
	1 to: (caretIdx @env0:min: lines @env0:size) do: [:i |
		| rest p |
		rest := lines @env0:at: i.
		[p := rest @env0:indexOfSubCollection: '___curPos___ := #('.
		 p @env0:> 0] whileTrue: [
			| parsed |
			parsed := self ___parsePositionLiteral___: rest from: (p @env0:+ 18).
			parsed notNil ifTrue: [result := parsed].
			rest := rest @env0:copyFrom: (p @env0:+ 18) to: rest @env0:size]].
	^ result
%

category: 'Grail-Traceback Building'
classmethod: BaseException
___parsePositionLiteral___: aString from: anIndex
	"Parse ``line col endLine endCol 'src')'' -- the body of the literal array
	___pyPositionLiteralArray emits -- into a 5-element Array, or nil.

	Read from the generated SOURCE rather than from the method's literal frame:
	the frame holds every literal the method has and nothing says which store
	an ip belongs to, whereas the source scan already located the right one."

	| nums k n src |
	nums := Array @env0:new: 4.
	k := anIndex.
	1 to: 4 do: [:i |
		| digits |
		[(k @env0:<= aString @env0:size)
			and: [(aString @env0:at: k) @env0:= $ ]] whileTrue: [k := k @env0:+ 1].
		digits := WriteStream @env0:on: String @env0:new.
		[(k @env0:<= aString @env0:size)
			and: [(aString @env0:at: k) @env0:isDigit]] whileTrue: [
				digits @env0:nextPut: (aString @env0:at: k).
				k := k @env0:+ 1].
		digits @env0:contents @env0:isEmpty ifTrue: [^ nil].
		nums @env0:at: i put: digits @env0:contents @env0:asNumber].
	[(k @env0:<= aString @env0:size)
		and: [(aString @env0:at: k) @env0:= $ ]] whileTrue: [k := k @env0:+ 1].
	src := nil.
	(k @env0:<= aString @env0:size and: [(aString @env0:at: k) @env0:= $'])
		ifTrue: [
			| out done |
			out := WriteStream @env0:on: String @env0:new.
			k := k @env0:+ 1.
			done := false.
			[done @env0:not and: [k @env0:<= aString @env0:size]] whileTrue: [
				| ch |
				ch := aString @env0:at: k.
				ch @env0:= $'
					ifTrue: [
						"A doubled quote is one literal quote, not the end."
						((k @env0:< aString @env0:size)
							and: [(aString @env0:at: (k @env0:+ 1)) @env0:= $'])
							ifTrue: [out @env0:nextPut: $'. k := k @env0:+ 2]
							ifFalse: [done := true. k := k @env0:+ 1]]
					ifFalse: [out @env0:nextPut: ch. k := k @env0:+ 1]].
			done ifTrue: [src := out @env0:contents]].
	n := Array @env0:new: 5.
	n @env0:at: 1 put: (nums @env0:at: 1).
	n @env0:at: 2 put: (nums @env0:at: 2).
	n @env0:at: 3 put: (nums @env0:at: 3).
	n @env0:at: 4 put: (nums @env0:at: 4).
	n @env0:at: 5 put: src.
	^ n
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
		(self ___isCaretLine___: (lines @env0:at: i))
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
			"A PEP 657 span store -- ``___curPos___ := #(line col endLine endCol
			 src)'' -- carries the line as the array's FIRST element.  Stepping
			 over the ``#('' finds it in the same place the bare-integer form
			 puts it.  This is load-bearing beyond the line number: a frame is
			 IDENTIFIED as Python by this scan answering non-nil, so a store
			 shape it cannot read makes the whole frame vanish from the
			 traceback rather than merely lose its columns (§9.39)."
			((k @env0:< rest @env0:size)
				and: [((rest @env0:at: k) @env0:= $#)
					and: [(rest @env0:at: (k @env0:+ 1)) @env0:= $(]])
				ifTrue: [k := k @env0:+ 2].
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

	| st catchName pushed pendingHome pendingLine walkable boundary nArgs blockLine |
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
			ifTrue: [[meth @env0:homeMethod] on: Error do: [:ex |
				(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
				ex return: meth]]
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
				block, hence a less precise position.

				EXCEPT when the block IS a Python function.  A nested ``def''
				compiles to a block (it must: only a block can close over the
				enclosing function's locals, only a block has no class to live in,
				and only a fresh block copy per execution gives CPython's distinct
				function object per ``def''), so merging every block into its home
				erased nested functions from every traceback -- ``def outer(): def
				inner(): raise'' reported ONE frame where CPython reports two, and
				three levels still reported one.

				Told apart by ARGUMENT COUNT.  Codegen calls a Python function block
				as ``[:___positional___ :___kwargs___ | ...]'', and nothing else in
				env 1 emits a two-argument block: comprehension bodies, ``try''
				bodies, ``except'' handlers and the generator machinery are all
				zero-argument (measured across all of them).  The ``___pyNamed___''
				/ ``___pyCode___'' stamps would be the obvious test and are NOT
				usable -- they live on the block OBJECT, while this walk sees only
				compiled methods."
				nArgs := [meth @env0:numArgs] @env0:on: Error do: [:ex |
					(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
					ex @env0:return: 0].
				blockLine := BaseException ___pythonLineForMethod___: meth ip: ip.
				(nArgs @env0:= 2)
					ifTrue: [
						| fnLine fnName isCatcher frameCode |
						"The nested function's frame is parked where its BODY is --
						which the inner zero-argument blocks already resolved into
						pendingLine.  Fall back to this block's own position when
						there were none (a body that raises without an intervening
						block)."
						fnLine := pendingLine isNil ifTrue: [blockLine] ifFalse: [pendingLine].
						"___nestedFrameNameFor___ rather than ___nestedFunctionNameFor___,
						and the gate is now the IDENTITY test rather than the name.  Both
						the name and the line used to be required, which made a line that
						failed to derive cost this frame its EXISTENCE -- see
						___nestedFrameNameFor___ for why that is worse than a placeholder,
						and why the method branch below was already fixed the same way.

						``___isGeneratedPythonMethod___'' is what replaces them, and it is
						the same test the method branch settled on: it asks the method's
						SOURCE whether codegen wrote it, so no ip can affect the answer.
						It is also stricter than what was here before -- the old gate would
						accept any two-argument env-1 block that happened to resolve a name
						-- so this narrows the branch while making it ip-independent.

						The line still falls back to 0 rather than being invented: a frame
						with no line renders as line 0, which is visibly unknown, where a
						guessed line would be confidently wrong."
						fnName := BaseException ___nestedFrameNameFor___: home line: fnLine.
						fnLine isNil ifTrue: [fnLine := 0].
						(BaseException ___isGeneratedPythonMethod___: home) ifTrue: [
							isCatcher := catchName notNil and: [fnName @env0:= catchName].
							frameCode := self ___codeForMethod___: home name: fnName ip: 0
								aCode: aCode.
							"A nested function that CATCHES gets codegen's recorded span,
							exactly as the method branch below does -- pendingLine can only
							ever answer a LINE, so without this a nested ``def'' reported
							colno nil where the identical code at module scope reported the
							PEP 657 columns (test_with's testExceptionLocation asserts the
							span of the failing context manager, and its functions are
							nested inside the test method).

							Deliberately narrower than the method branch: taken only when
							pos arrived as a span AND that span's line already agrees with
							the derived one.  This can therefore only ADD columns, never
							move a line -- an ordinary nested try/except, where codegen
							passes the bare integer, keeps the line the walk derives for it
							(test_long_context_chain and friends depend on that line), and a
							disagreement means the two readings did not find the same store,
							which §9.10 says must lose the columns rather than draw a
							confident caret under the wrong code."
							((isCatcher and: [posArray @env0:isKindOf: Array])
								and: [(posArray @env0:at: 1) @env0:= fnLine])
								ifTrue: [self ___pushFrameFromPos___: frameCode pos: posArray]
								ifFalse: [
									self ___pushTracebackFrame___: frameCode
										lineno: fnLine
										colno: nil endLineno: nil endColno: nil line: nil].
							pushed := pushed @env0:+ 1.
							"Consumed: the home method's own frame must not reuse this
							line, or ``outer'' would report the line inside ``inner''."
							pendingHome := nil.
							pendingLine := nil.
							"A nested function can be the CATCHER too, and the trim below
							never sees it -- that test lives in the method branch, and a
							nested ``def'' has no method frame of its own.  Without this
							the walk runs past the except clause into the caller chain,
							which for a function that recurses out of its own handler
							(test_long_context_chain: ``except ZeroDivisionError: f()'')
							means frame N of the recursion materialises N frames instead
							of the 1 CPython reports.  That is quadratic in the recursion
							depth across the __context__ chain, and it exhausted the
							session's temporary object memory."
							isCatcher ifTrue: [^ true]]]
					ifFalse: [
						pendingHome @env0:~~ home ifTrue: [
							pendingHome := home.
							pendingLine := blockLine]]].
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
					"A non-catcher frame -- the RAISING frame among them -- takes the
					span codegen recorded when there is one.  Guarded on the line
					agreeing with the derived one: the scan can only be trusted to
					have found the right store when both readings of it match, and a
					wrong span draws a confident caret under the wrong code (§9.10),
					which is worse than the columns being absent."
					(isCatcher and: [posArray notNil])
						ifTrue: [self ___pushFrameFromPos___: frameCode pos: posArray]
						ifFalse: [
							| span |
							span := BaseException ___pythonSpanForMethod___: meth ip: ip.
							(span notNil and: [(span @env0:at: 1) @env0:= pyLine])
								ifTrue: [self ___pushFrameFromPos___: frameCode pos: span]
								ifFalse: [
									self ___pushTracebackFrame___: frameCode
										lineno: pyLine
										colno: nil endLineno: nil endColno: nil line: nil]].
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

	"A chain the USER attached with with_traceback() is not a partial unwind
	record, and neither of the cases below applies to it.  CPython always
	PREPENDS the frames of the new raise onto whatever __traceback__ holds --
	that is the whole point of the idiom, and test_raise's test_accepts_traceback
	asserts exactly the link: the new head is not the attached node, and its
	tb_next is.  Grail read the attached chain as a partial one, found its head
	frame named a different function than the catcher, and took case 3 -- which
	DISCARDS it -- so the tb the caller had deliberately attached vanished at the
	raise that was supposed to use it.

	The mark is consumed here, so a later re-raise of the same exception is back
	under the ordinary rules."
	(self ___tbUserAttached___) ifTrue: [
		self @env0:dynamicInstVarAt: #'___tbUserAttached___' put: false.
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
___tbUserAttached___
	"Was this exception's current traceback put there by with_traceback()?

	Guarded, because the slot is absent on every exception that never went
	through with_traceback() -- which is nearly all of them -- and an absent
	dynamic instVar raises rather than answering nil."

	^ ([self @env0:dynamicInstVarAt: #'___tbUserAttached___']
		@env0:on: AbstractException do: [:e | e @env0:return: false]) == true
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

category: 'Grail-Carrier'
classmethod: BaseException
___signalCarrying___: payload
	"Raise payload WITHOUT signalling payload itself.

	WHY THIS EXISTS.  GemStone LIFTS a handler onto the signalling frame rather
	than UNWINDING to it, so a signalled exception is not inert data -- it is
	the live anchor joining a still-running signal point to its handler.  Those
	are the frames the VM appends as indexed slots: _basicSize is 5 inside the
	handler and 0 the moment it returns, that return being the deferred unwind.
	One object cannot anchor two live signals at once, which is exactly the
	UncontinuableError 6011 (``Exception has already been signaled'') that
	``except E as e: raise e'' walks into.

	Python's model is the opposite.  ``raise'' UNWINDS, so by the time an
	``except'' body runs the original propagation is already over and the
	exception is ordinary data that may be raised again freely -- and CPython
	requires the re-raised object to BE the caught one, because ``is''
	comparisons are built on it (contextlib's _GeneratorContextManager.__exit__
	is literally ``if exc is not value: raise'').

	So stop asking one object to be both.  Signal a fresh throwaway CARRIER of
	the payload's own class that references the payload; the handler unwraps.
	The payload is never signalled, so it never acquires frames and stays
	raisable for ever.

	SAME CLASS, deliberately: ``on: ValueError do:'' selects on the object
	actually signalled, so the carrier has to match whatever the payload would
	have matched -- including a user-defined ``class MyError(ValueError)''.
	Allocated with env-0 #new rather than any Python constructor: nothing runs
	__init__ on a carrier, and nothing reads it as a Python object.

	WHAT IT REPLACES.  #pass preserved identity but continued the ORIGINAL
	search, resuming OUTSIDE the currently-active on:do: -- so a handler
	established INSIDE the except body was skipped entirely:

	    except RuntimeError as outer:
	        try:
	            raise outer
	        except BaseException:      ""never ran -- the exception left the function""
	            ...

	A carrier is an ordinary #signal from the raise point, which is precisely
	CPython's fresh handler search.

	messageText is carried across so an UNCAUGHT re-raise still reports
	something at the Smalltalk level, where no Grail handler is present to
	unwrap it.

	A LAST RESORT, not the default.  When the payload has no live frames it can
	simply be signalled, and then identity is free and nothing needs unwrapping
	-- which matters because not every catcher unwraps: Grail's own Smalltalk
	handlers, and any Python code holding the object across the raise, see
	whatever was signalled.  Wrapping unconditionally is what broke
	test_yield_from's ``gen.throw(exc) is exc'' assertions on StopIteration and
	lost an exception's __notes__ in test_dict.  This is #_basicSize > 0, the
	same test the old #copy path used -- carriers appear exactly where a plain
	#signal was impossible, and nowhere else."

	| carrier |
	((payload @env0:isKindOf: AbstractException)
		@env0:and: [payload @env0:_basicSize @env0:> 0]) @env0:ifFalse: [
			^ payload @env0:signal].
	carrier := payload @env0:class @env0:new.
	carrier @env0:dynamicInstVarAt: #'___grailPayload___' put: payload.
	[carrier @env0:messageText: payload @env0:messageText]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ carrier @env0:signal
%

category: 'Grail-Carrier'
classmethod: BaseException
___payloadOf___: anException
	"The Python exception anException stands for: itself, unless it is a
	CARRIER, in which case the object it was raised to deliver.

	THE ONE SANCTIONED CROSSING.  Every path that hands a caught exception back
	to Python goes through here -- the ``except X as e'' binding, the
	sys.exc_info() current-exception record, and a bare ``raise''.  Leaking a
	carrier to Python instead of its payload reintroduces the identity bug this
	removes, but rarer and much harder to find, so there is deliberately ONE
	way across rather than an unwrap open-coded at each site.

	Answers anException unchanged for everything that is not a carrier, which is
	every exception raised for the first time and every exception GemStone
	itself signals."

	| payload |
	(anException @env0:isKindOf: AbstractException) @env0:ifFalse: [^ anException].
	payload := [anException @env0:dynamicInstVarAt: #'___grailPayload___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ payload == nil ifTrue: [anException] ifFalse: [payload]
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
	generator keeps the plain ensure: and this one exc_info gap.

	WHEN the finally runs matters as much as that it runs.  It used to run from
	the ensure: block for every exit, including the exceptional one -- but an
	ensure: fires while the stack UNWINDS, and by then ``ex pass'' has already
	delivered the exception to the enclosing handler.  So for

	    try:      raise ValueError()
	    finally:  raise KeyError()

	the caller's ``except'' ran TWICE: once for the ValueError that pass had
	already handed it, and then again for the KeyError, arriving as a second,
	unrelated propagation.  Python has one exception leave a try/finally, and it
	is the finally's: a raise there REPLACES the in-flight exception (chaining
	to it through __context__).

	So the exceptional path now runs the finally INSIDE the handler, before
	``ex pass'' lets anything see it.  A finally that raises simply propagates
	from there, replacing ex and never reaching the pass; a finally that
	completes falls through to pass, which propagates ex as before.  The
	ensure: is still what covers the other exits -- normal completion and the
	control-flow signals (PythonReturn / PythonBreak / PythonContinue), none of
	which are BaseException -- with ``ranFinally'' keeping the two paths from
	both firing."

	| ranFinally propExc result |
	ranFinally := false.
	propExc := nil.
	result := [ [protectedBlock value]
			on: BaseException
			do: [:ex |
				ranFinally := true.
				"A ``return'' / ``break'' / ``continue'' passing through the
				try is NOT an exception being handled, so it must not become
				the session's current one -- CPython reports the ENCLOSING
				handled exception inside such a finally, not a fresh thing.
				This method's comment used to claim the distinction came for
				free because the control-flow signals ``subclass the kernel
				Exception directly, NOT this BaseException''.  They do not:
				PythonReturn's chain runs through Grail's BaseException, so
				``on: BaseException'' catches it like anything else, and
				installing it leaked a PythonReturn into sys.exc_info() and
				into the __context__ of anything the finally raised."
				(self ___isControlFlowSignal___: ex)
					ifTrue: [finallyBlock value]
					ifFalse: [self ___runFinally___: finallyBlock during: ex].
				propExc := ex.
				"RETURN from the handler rather than ``pass'', then re-signal
				below.  Both keep the exception propagating, but an exception
				that was passed retains a handler frame, and the VM refuses to
				signal one of those again -- so every later re-raise has to
				work on a COPY (PythonGenerator >> _resignalable:), and the
				object's IDENTITY is lost.  Returning pops the frames, so the
				re-signal below is the same object the raise site created.
				That matters wherever Python compares exceptions by identity:
				a generator whose ``finally'' yields suspends mid-propagation,
				and test_close_and_throw_yield asserts the exception coming
				back out of the resuming next() ``is'' the one thrown."
				ex return: nil] ]
		ensure: [
			ranFinally ifFalse: [finallyBlock value]].
	propExc isNil ifFalse: [^ (self ___resignalable___: propExc) @env0:signal].
	^ result
%

category: 'Grail-Current Exception'
classmethod: BaseException
___resignalable___: anException
	"``anException'' if it can be signalled again, else a clean copy of it.

	An exception carries its live handler frames in INDEXED slots appended to
	its named ones, and the VM refuses -- uncontinuably, error 6011
	``Exception has already been signaled'' -- to signal one that still has
	them.  Returning normally from a handler pops them, which is why
	___ensureFinally___ returns rather than passing, and why the common case
	re-signals the SAME object and keeps its identity.

	It is not enough on its own: an exception that was already PASSED further
	in (Grail compiles a bare ``raise'' inside an ``except'' to ``___ex
	pass'') keeps one frame's worth even after our handler returns, and
	signalling that one is the 6011 -- which is what TracebackTestCase's
	testAHandlerRaiseLeavesTheTry and testFinallyDuringPropagation raise.
	``copy'' answers an instance of the same class with the named and dynamic
	instance variables (messageText, args, __cause__, __context__, ...) but
	none of the stale frames, so it signals cleanly and still matches the same
	``except'' clauses.

	A last resort, not the default -- Python propagates the identical object,
	and the frame test keeps the copy to the cases that cannot avoid it.  This
	is PythonGenerator >> _resignalable:'s rule, applied at the other site that
	re-raises a caught exception."

	^ ((anException @env0:isKindOf: AbstractException)
		@env0:and: [anException @env0:_basicSize @env0:> 0])
			ifTrue: [anException @env0:copy]
			ifFalse: [anException]
%

category: 'Grail-Current Exception'
classmethod: BaseException
___whileHandling___: anException do: aBlock
	"Evaluate aBlock with anException installed as the session's current
	exception, then restore whatever was current before, and answer aBlock's
	value.

	``Currently handling'' is what sys.exc_info() reports and what implicit
	chaining reads, so every construct that runs user code ON BEHALF of an
	in-flight exception owes this: a ``finally'' body, and a context manager's
	__exit__.  The second was missing -- an exception raised inside __exit__ got
	__context__ None, where CPython chains it to the exception __exit__ was
	called about (test_raise test_context_manager).

	The restore is an ensure:, so a raise from inside aBlock -- the interesting
	case -- unwinds the stack correctly rather than leaving a stale exception
	installed for everything that follows."

	| saved |
	saved := self ___currentException___.
	self ___setCurrentException___: anException.
	^ [aBlock value] ensure: [self ___setCurrentException___: saved]
%

category: 'Grail-Current Exception'
classmethod: BaseException
___reRaise___: lexicalException
	"A bare ``raise''.  ``lexicalException'' is the ___ex of the textually
	enclosing except handler, or nil when the raise is not inside one.

	CPython's rule is a RUNTIME one: a bare raise re-raises whatever
	sys.exc_info() points at, and RuntimeError('No active exception to
	re-raise') only when that is empty.  Grail decided it at COMPILE time from
	the AST, and the two differ in both directions:

	    def inner():  raise            # not lexically in a handler...
	    try:  raise TypeError('foo')
	    except TypeError:  inner()     # ...but there IS an active exception

	answered ``No active exception to re-raise'' where CPython re-raises the
	TypeError, because handling is a property of the thread and not of the text
	(test_raise test_nested_reraise); and

	    except TypeError:
	        try:  raise KeyError('caught')
	        finally:  raise            # lexically the TypeError handler...

	re-raised the TypeError, where CPython re-raises the KEYERROR that is in
	flight through the finally -- ___runFinally___:during: installs it as the
	current exception for exactly this reason (test_finally_reraise).

	So the session's current exception decides, and the lexical one is the
	fallback for the case it cannot see: an except handler whose body left the
	current-exception stack in some state this does not model.  Preferring the
	runtime answer and keeping the compiled one in reserve is strictly more
	correct than either alone."

	| cur |
	cur := self ___currentException___.
	cur isNil ifTrue: [cur := lexicalException].
	cur isNil ifTrue: [
		"CPython spells it ``reraise'', unhyphenated.  Grail had ``re-raise'',
		which test_raise's own check does not notice (it matches only the
		``No active exception'' prefix) but anything comparing the whole message
		does."
		^ RuntimeError @env1:___signal___: 'No active exception to reraise'].
	^ self ___signalCarrying___: (self ___payloadOf___: cur)
%

category: 'Grail-Current Exception'
classmethod: BaseException
___isControlFlowSignal___: anException
	"True for Grail's internal ``return'' / ``break'' / ``continue'' carriers.

	They are signalled like exceptions so they can unwind through ensure: and
	ifCurtailed:, but they are not exceptions in Python's sense: nothing is
	being handled, so they must never appear in sys.exc_info(), become an
	exception's __context__, or be reported to user code.  The same three are
	screened by TryAst's per-handler control-flow guard, which re-raises them
	rather than letting an ``except Exception'' swallow a pending return."

	^ (anException @env0:isKindOf: PythonReturn)
		or: [(anException @env0:isKindOf: PythonBreak)
		or: [anException @env0:isKindOf: PythonContinue]]
%

category: 'Grail-Current Exception'
classmethod: BaseException
___runFinally___: finallyBlock during: anException
	"Run a ``finally'' body while anException is the session's current
	exception, then restore whatever was current before.

	Installing it is what makes sys.exc_info() / sys.exception() inside the
	finally report the in-flight exception, as CPython does, and it is also
	what gives an exception RAISED by the finally its __context__ -- the
	implicit chaining reads the same slot.

	Only real Python exceptions reach here: the caller screens out the
	control-flow signals with ___isControlFlowSignal___: first, so a return /
	break / continue through a finally leaves exc_info untouched -- correct,
	since CPython shows the ENCLOSING handled exception there rather than a
	fresh one."

	| saved |
	saved := self ___currentException___.
	self ___setCurrentException___: anException.
	^ [finallyBlock value]
		ensure: [self ___setCurrentException___: saved]
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
	f_back; the innermost frame, returned here, is therefore the last one built.

	A GENERATOR body runs on its own forked GsProcess, so its capture ends at the
	fork and contains nothing of the consumer that resumed it -- the same process
	boundary the traceback walk crosses by stashing (___stashGeneratorStack___:).
	The live walk cannot stash, because nothing raised; instead it follows the
	link the other way and READS the consumer, which is legitimately suspended
	(blocked on consumerSem) and so is exactly the case _frameContentsAt: serves.
	___liveFrameSections___: follows that chain; the walk runs once per section
	and the sections concatenate innermost-first."

	| probe st trimmed levels offset sections pairs isFirstSection |
	self ___ensureStackCapture___.
	"Signal and catch in one breath.  ``ex return:'' unwinds without letting the
	Error reach any outer handler -- notably not a Python ``except''."
	probe := [Error @env0:new @env0:signal: 'grail live-frame probe']
		@env0:on: Error do: [:ex | ex @env0:return: ex].
	st := [probe @env0:_gsStack] @env0:on: Error do: [:ex | ex @env0:return: nil].
	st isNil ifTrue: [^ nil].
	trimmed := self ___trimCapturedStack___: st.
	"LOCALS.  The capture above answers (method, ip, receiver) and no temporaries
	ever, so f_locals has to come from the OTHER live-stack reader --
	GsProcess class>>_frameContentsAt:, which does answer names and values but is
	addressed by LEVEL rather than by frame.  Collected here, at the same point of
	this method as the capture, so that a triple index and a level differ by one
	constant offset for the whole walk; ___liveFrameLevelOffset___:levels: finds
	that offset by identity rather than assuming it.

	Only the FIRST section gets them.  A later section is a suspended CONSUMER
	process, and _frameContentsAt: on the class side reads the process that is
	RUNNING, so its levels would describe this stack rather than that one -- the
	same frames, silently mislabelled.  Nil levels means no f_locals, which every
	consumer already treats as ``not available''."
	levels := PyFrame @env0:___liveFrameContentsByLevel___.
	offset := self ___liveFrameLevelOffset___: trimmed levels: levels.
	sections := self ___liveFrameSections___: trimmed.
	pairs := OrderedCollection @env0:new.
	isFirstSection := true.
	sections @env0:do: [:section |
		(self ___liveFramePairsFrom___: (section @env0:at: 1)
			generatorBody: (section @env0:at: 2)
			levels: (isFirstSection ifTrue: [levels] ifFalse: [nil])
			offset: offset)
				@env0:do: [:each | pairs @env0:add: each].
		isFirstSection := false].
	^ self ___liveFrameChainFromPairs___: pairs
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameLevelOffset___: st levels: levels
	"How much to ADD to a triple index in ``st'' to get the _frameContentsAt:
	level of the same physical frame.  Nil when the two cannot be aligned, which
	means no f_locals rather than a wrong one.

	Both sequences enumerate the SAME live stack, innermost first, one entry per
	frame -- so they differ by a single constant, and the only question is what it
	is.  It cannot be hardcoded: a level is counted from the sender of whichever
	method called the primitive, so the constant depends on how deep the collector
	ran, and it changes if either method gains or loses a block around the call.
	Measured at +2 for the current arrangement, which is exactly the kind of number
	that is right until someone edits a line near it.

	So it is DERIVED, from a frame that is certain to be in both: this method's own
	caller, ___liveFrameChain___.  Found by selector in the levels and then by
	OBJECT IDENTITY in the triples, taking the innermost occurrence on each side so
	that a nested sys._getframe (one live walk inside another) still aligns.
	Matching on identity rather than on the selector a second time matters because
	the blocks INSIDE ___liveFrameChain___ have frames of their own, whose method
	answers a nil selector and whose homeMethod is the method being looked for --
	identity distinguishes them, a home comparison would not."

	| chainMethod levelIndex tripleIndex |
	(st isNil or: [levels isNil]) ifTrue: [^ nil].
	levelIndex := nil.
	1 to: levels size do: [:i |
		levelIndex isNil ifTrue: [
			| meth |
			meth := (levels at: i) atOrNil: 1.
			"Error, NOT AbstractException: AlmostOutOfStack is a Notification, and
			 swallowing it here would defeat ___recursionGuard___ -- see
			 PyFrame class>>___liveFrameContentsByLevel___, which shares the hazard."
			(meth notNil
				and: [([meth selector] on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError)
				ifTrue: [e pass] ifFalse: [e return: nil]])
					== #'___liveFrameChain___'])
						ifTrue: [
							chainMethod := meth.
							levelIndex := i]]].
	chainMethod isNil ifTrue: [^ nil].
	tripleIndex := nil.
	1 to: st size by: 3 do: [:i |
		(tripleIndex isNil and: [(st at: i) == chainMethod])
			ifTrue: [tripleIndex := (i + 2) // 3]].
	tripleIndex isNil ifTrue: [^ nil].
	^ levelIndex - tripleIndex
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameContentsFor___: aMethod at: tripleIndex in: levels offset: offset
	"The frame contents for one triple of the capture, or nil when they cannot be
	had.

	VALIDATED BY IDENTITY, not trusted.  The offset says which level a triple
	should be at; this checks that the frame there is running the method the triple
	names, and answers nil when it is not.  That guard is the whole reason locals
	can be attached at all without the risk ___tempsFromFrameContents___ describes:
	a misaligned read does not fail, it reports a DIFFERENT frame's variables under
	this frame's name, and nothing downstream could tell.  Failing closed costs a
	missing f_locals, which is a shape traceback.py already handles."

	| fc lvl |
	(levels isNil or: [offset isNil]) ifTrue: [^ nil].
	"Bounds-checked BEFORE atOrNil:, which is documented for an index past the end
	and not for one below the start.  A negative offset is reachable in principle --
	it only takes the level walk bottoming out shallower than the capture -- and
	this is code every sys._getframe runs."
	lvl := tripleIndex + offset.
	(lvl < 1 or: [lvl > levels size]) ifTrue: [^ nil].
	fc := levels atOrNil: lvl.
	fc isNil ifTrue: [^ nil].
	(fc atOrNil: 1) == aMethod ifFalse: [^ nil].
	^ fc
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFramePairsFrom___: st generatorBody: isGeneratorBody levels: levels offset: offset
	"{ method. ip. name. lineOrNil. frameContentsOrNil } for every frame of ONE section of a live
	stack, innermost first.  ``st'' is a headerless run of (method, ip, receiver)
	triples -- the shape ___trimCapturedStack___: answers and the shape
	___framesOfSuspendedProcess___: builds.

	``isGeneratorBody'' says this section is a generator's forked process, which
	changes one thing: what is left PENDING at the end of the section is flushed
	as a frame instead of discarded.  See the flush at the bottom for why that is
	the only way a generator's own frame can appear at all."

	"``levels''/``offset'' are the f_locals half, and they are OPTIONAL: nil for
	either means the pairs come back with a nil contents slot and the frames report
	no locals.  See ___liveFrameLevelOffset___:levels: for how a triple index turns
	into a level, and PyFrame class>>___pyLocalsFromFrameContentsList___: for why a
	single Python frame hands over a LIST of Smalltalk frames rather than one."
	| pairs done pendingHome pendingLine pendingContents |
	"{ method. ip. name. lineOrNil } for every frame that is a Python FUNCTION,
	innermost first.  A block frame carries a nil selector and normally belongs to
	its home method, so it is skipped -- CPython has no frame for a comprehension
	body or an except block.

	EXCEPT when the block IS a Python function.  A nested ``def'' compiles to a
	block (only a block closes over the enclosing function's locals, only a block
	has no class to live in, and only a fresh copy per execution gives CPython's
	distinct function object per ``def''), so skipping every block erased nested
	functions from the live stack exactly as it did from tracebacks -- 9.45.  From
	inside ``def outer(): def inner(): traceback.extract_stack()'' CPython answers
	['<module>', 'outer', 'inner'] and this walk answered ['outer'].

	Told apart by ARGUMENT COUNT, the same discriminator 9.45 established for the
	traceback walk: codegen calls a Python function block as
	``[:___positional___ :___kwargs___ | ...]'' and nothing else in env 1 emits a
	two-argument block.  The NAME comes from ___nestedFunctionNameFor___:line:,
	which is shared with the traceback walk and derives containment from the
	Python line rather than from _sourceAtIp: -- see there for why that matters in
	a native-code gem."
	pairs := OrderedCollection @env0:new.
	"``done'' rather than leaving the loop early: the index of a to:do: is a block
	PARAMETER and not assignable, so there is nothing to advance past the end."
	done := false.
	pendingHome := nil.
	pendingLine := nil.
	pendingContents := nil.
	1 to: st @env0:size by: 3 do: [:i |
		| meth ip home contents |
		done ifFalse: [
			meth := st @env0:at: i.
			"Trailing nils pad the array; the real frames end at the first one."
			meth isNil
				ifTrue: [done := true]
				ifFalse: [
					ip := st @env0:at: i @env0:+ 1.
					contents := self ___liveFrameContentsFor___: meth
						at: (i @env0:+ 2) @env0:// 3
						in: levels
						offset: offset.
					home := (meth @env0:environmentId @env0:= 1)
						ifTrue: [[meth @env0:homeMethod]
							@env0:on: Error do: [:ex |
								(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
								ex @env0:return: meth]]
						ifFalse: [nil].
					home isNil ifTrue: [home := meth].
					((meth @env0:environmentId @env0:= 1) and: [meth @env0:selector isNil])
						ifTrue: [
							| nArgs blockLine |
							nArgs := [meth @env0:numArgs]
								@env0:on: Error do: [:ex |
									(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
									ex @env0:return: 0].
							blockLine := self ___pythonLineForMethod___: meth ip: ip.
							(nArgs @env0:= 2)
								ifTrue: [
									| fnLine fnName |
									"The nested function is parked where its BODY is, which the
									inner zero-argument blocks already resolved into pendingLine.
									Fall back to this block's own position when there were none."
									fnLine := pendingLine isNil
										ifTrue: [blockLine]
										ifFalse: [pendingLine].
									"See the traceback walk's twin, and
									___nestedFrameNameFor___: the NAME no longer gates the
									frame, only ``is this generated Python code'' does -- the
									one test here that no ip can affect.  This walk is the
									one sys._getframe counts through, so it is the one where
									a silently dropped frame does not shorten the answer but
									SHIFTS it."
									fnName := self ___nestedFrameNameFor___: home line: fnLine.
									(self ___isGeneratedPythonMethod___: home) ifTrue: [
											pairs @env0:add: { home. ip. fnName. (fnLine ifNil: [0]).
												(self ___liveFrameContentsList___: contents
													pending: pendingContents
													forHome: home
													pendingHome: pendingHome) }.
											"Consumed: the home method's own frame must not reuse
											this line, or ``outer'' would report the line inside
											``inner''."
											pendingHome := nil.
											pendingLine := nil.
											pendingContents := nil]]
								ifFalse: [
									pendingHome @env0:~~ home ifTrue: [
										pendingHome := home.
										pendingLine := blockLine.
										"A FRESH list per home, where the LINE is kept from the
										innermost block only.  The line wants one frame -- the one
										executing -- but the locals want them ALL: a method's
										arguments and its body block's variables are different
										halves of one Python frame."
										pendingContents := OrderedCollection @env0:new].
									"Guarded on BOTH, not just on contents.  Every path that clears
									pendingContents also clears pendingHome, and home is never nil,
									so the reset above always fires first and this cannot see a nil
									list -- but a doesNotUnderstand here would land in every
									sys._getframe, and so in every warning and every import, which
									is a wide enough blast radius to spend two words defending."
									(contents notNil and: [pendingContents @env0:notNil]) ifTrue: [
										pendingContents @env0:add: contents]]].
					((meth @env0:environmentId @env0:= 1) and: [meth @env0:selector notNil])
						ifTrue: [
							| frameLine |
							"The line a 0-argument block already resolved for THIS home wins over
							the one this method's own ip derives -- the rule the traceback walk
							states as ``pendingHome == home and: [pendingLine notNil]'' and this
							walk was missing.

							It is not a refinement.  A class-body def whose body contains a
							nested def compiles with the body inside a block, so the METHOD's ip
							sits at the end of that block and ___pythonLineForMethod___ answers
							the method's LAST statement for every such frame -- measured as
							``line 21, in nested_assign_last'' where the call was on line 20, and
							as ``line 2162, in test_format_stack'' (the assertEqual) where
							test_format_stack called fmt() on line 2160.  The enclosing block
							frame, one hop innermost of the method, carries the call site
							exactly; the method branch simply threw it away.

							Read BEFORE the reset below, which is why this is a temp and not an
							expression in the push."
							frameLine := (pendingHome @env0:== home and: [pendingLine notNil])
								ifTrue: [pendingLine]
								ifFalse: [nil].
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
							"A MODULE BODY'S frame.  Module-init codegen emits plain
							attr-store statements with no ``___curPos___'' markers, so the
							generated-Python probe honestly answers false and the walk
							dropped the frame -- which is the real origin of ``module-level
							code has no Python frame''.  The init IS the module body, and
							CPython calls that frame ``<module>''.  Recognised by what it
							is rather than by the marker it lacks: the receiver is a module
							instance and the selector is #initialize.  What this repairs is
							everything ABOVE the body being reachable at all --
							``warnings.warn(..., stacklevel=2)'' at module level during an
							import walked one hop from the wrong frame and blamed the
							importer's CALLER (unittest) instead of the importer.  The line
							is 0: with no markers none is derivable, and CPython's walkers
							only need it to be an int."
							((meth @env0:selector == #'initialize')
								and: [(st @env0:at: i @env0:+ 2) @env0:isKindOf: module])
								ifTrue: [
									pairs @env0:add: { meth. ip. '<module>'.
										(frameLine ifNil: [0]).
										(self ___liveFrameContentsList___: contents
											pending: pendingContents
											forHome: home
											pendingHome: pendingHome) }]
								ifFalse: [
							(((self ___pythonFrameNameFor___: meth @env0:selector) notNil)
								and: [self ___isGeneratedPythonMethod___: meth]) ifTrue: [
									pairs @env0:add: { meth. ip.
										(self ___pythonFrameNameFor___: meth @env0:selector).
										frameLine.
										(self ___liveFrameContentsList___: contents
											pending: pendingContents
											forHome: home
											pendingHome: pendingHome) }]].
							"A real method frame ends any pending block line: whether it took
							the line above or not, no frame further out can be this home's."
							pendingHome := nil.
							pendingLine := nil.
							pendingContents := nil]]]].
	"THE GENERATOR'S OWN FRAME.  A generator body is a BLOCK -- codegen emits
	``PythonGenerator withBlock: [:___gen___ | ...]'' -- and the frame for the
	``def'' that contains it is not on this process at all: the def RETURNED, on
	the consumer's process, as soon as it built the generator.  So the block's
	home never arrives to consume the pending line the way an ordinary call does,
	and without this flush a stack walked from inside ``def gen(): yield f()''
	reported ['f'] where CPython reports ['f', 'gen', ...].

	The name comes from the pending LINE, which is inside the def: a nested def
	resolves through ___nestedFunctionNameFor___:line: exactly as the 2-argument
	block branch above does, and a module-level def is a real Smalltalk method
	whose own selector already decodes to the Python name."
	(isGeneratorBody and: [pendingHome @env0:notNil]) ifTrue: [
		| fnName |
		fnName := self ___nestedFunctionNameFor___: pendingHome line: pendingLine.
		fnName isNil ifTrue: [
			fnName := self ___pythonFrameNameFor___: pendingHome @env0:selector].
		((fnName notNil) and: [self ___isGeneratedPythonMethod___: pendingHome]) ifTrue: [
			pairs @env0:add: { pendingHome. 0. fnName. (pendingLine ifNil: [0]).
				pendingContents }]].
	^ pairs
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameContentsList___: contents pending: pendingContents forHome: home pendingHome: pendingHome
	"Every Smalltalk frame whose temporaries belong to the ONE Python frame about
	to be pushed, innermost first, or nil when there are none.

	Two sources, and both are needed.  ``contents'' is the frame the pair itself
	names.  ``pendingContents'' is the body blocks already walked past for the same
	home method -- which is where a class-body def keeps ALL of its locals, the
	method frame having none -- and they are included only when ``pendingHome''
	still matches, the same guard the line number uses one branch over.

	Innermost first, so that PyFrame class>>___pyLocalsFromFrameContentsList___:
	resolving collisions first-wins gives the executing frame's value for a name
	that appears in both."

	| out |
	out := OrderedCollection @env0:new.
	(pendingHome @env0:== home and: [pendingContents @env0:notNil])
		ifTrue: [pendingContents @env0:do: [:each | out @env0:add: each]].
	contents isNil ifFalse: [out @env0:add: contents].
	out @env0:isEmpty ifTrue: [^ nil].
	^ out
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameChainFromPairs___: pairs
	"Turn the { method. ip. name. lineOrNil } quadruples of a whole live stack --
	all its sections, innermost first -- into a chain of PyFrames linked by
	f_back, and answer the INNERMOST.  Nil when there is nothing to report.

	Built outermost-first so each frame can be handed its caller as f_back; the
	innermost frame, returned here, is therefore the last one built."

	| prev frame |
	pairs @env0:isEmpty ifTrue: [^ nil].
	prev := None.
	pairs @env0:size @env0:to: 1 by: -1 do: [:k |
		| pair meth ip name line code locals |
		pair := pairs @env0:at: k.
		meth := pair @env0:at: 1.
		ip := pair @env0:at: 2.
		name := pair @env0:at: 3.
		"A nil line is not a reason to drop the frame -- see the filter above -- so it
		becomes 0, the same ``position unknown'' a traceback frame uses.  A nested
		function carries its line already, resolved from the block that supplied it;
		a method frame derives it from its own ip."
		line := (pair @env0:at: 4)
			ifNil: [self ___pythonLineForMethod___: meth ip: ip].
		code := PyCode @env0:name: name
			filename: (self ___liveFrameFilenameFor___: meth)
			firstlineno: 0.
		frame := PyFrame @env0:code: code lineno: (line ifNil: [0]) back: prev globals: None.
		"f_locals.  STORED ONLY WHEN THERE ARE SOME: traceback.py reads it as
		``getattr(frame, ''f_locals'', None)'', so an absent dynamic instVar already
		means ``this frame cannot say'' -- the honest answer for a frame whose levels
		could not be aligned, for a suspended consumer process, and for a gem where the
		temporaries were not readable at all.  Storing an empty dict instead would have
		the frame assert, positively, that it has no variables.

		EVERY frame gets one, and THE COST IS REAL: this roughly DOUBLES sys._getframe.
		Measured on a ~10-frame stack, 3000 calls, repeatable to the digit -- 3.33
		us/call before, 6.33 us/call after.  An earlier draft of this comment claimed
		410 us/call before, which made the addition look like rounding error; that
		figure was wrong, and it is mentioned only because the argument it supported --
		``too cheap to bother bounding'' -- is not the argument that survives.

		What survives is that the ORDER is unchanged.  This walk was already O(depth) in
		allocations: a PyFrame and a PyCode per frame, before this change.  One locals
		dictionary per frame keeps both the order and the lifetime, and CPython's frames
		carry their locals too.  Bounding attachment to the innermost N was tried and
		rejected -- at any stack shallow enough to measure it saves nothing (6.33 us/call
		at N=8 and unbounded alike, because the bound never binds), and on a deep stack
		it buys that saving by silently dropping the outer frames' locals."
		locals := PyFrame @env0:___pyLocalsFromFrameContentsList___: (pair @env0:atOrNil: 5).
		locals isNil ifFalse: [
			frame @env0:dynamicInstVarAt: #'f_locals' put: locals].
		prev := frame].
	^ frame
%

category: 'Grail-Live Frames'
classmethod: BaseException
___liveFrameSections___: triples
	"The live stack in SECTIONS, innermost first: { tripleRun. isGeneratorBody }
	for the current process, then for each consumer process out through the
	generator delegation chain.

	One section per GsProcess, because that is the unit a stack capture covers.
	A generator body runs forked, so ``for x in spam(gen()): ...'' has THREE
	processes live at the moment gen's body runs -- gen's, spam's, and the
	caller's -- and only the first is in the capture.  CPython has one stack with
	all three functions on it, and a debugger is entitled to see them: that is
	what test_yield_from's test_delegator_is_visible_to_debugger checks.

	The links are read off the stack itself rather than out of a registry.  Every
	generator body has PythonGenerator>>_forkBody frames beneath it running with
	the generator as self (___generatorOwningStack___: recovers it), and the
	generator remembers the process that last resumed it.  Nothing has to be
	registered, so nothing has to be unregistered -- an abandoned generator would
	otherwise pin a dead GsProcess in a session-lifetime dictionary for as long as
	the session lived.

	The consumer is genuinely suspended (blocked on consumerSem inside send: /
	throw: / close), which is the precondition _frameContentsAt: needs and which
	the CURRENT process can never satisfy for itself.

	Bounded and loop-guarded: a chain deeper than 64 delegations, or one that
	revisits a process, stops rather than walks forever."

	| sections cur gen next seen hops |
	sections := OrderedCollection new.
	cur := triples.
	seen := IdentitySet new.
	hops := 0.
	[(cur notNil) and: [hops < 64]] whileTrue: [
		gen := self ___generatorOwningStack___: cur.
		sections add: { cur. gen notNil }.
		next := gen isNil
			ifTrue: [nil]
			ifFalse: [[gen ___consumerProcess___]
				on: Error do: [:ex | ex return: nil]].
		((next isNil)
			or: [(seen includes: next) or: [next == GsProcess current]])
				ifTrue: [cur := nil]
				ifFalse: [
					seen add: next.
					cur := self ___framesOfSuspendedProcess___: next].
		hops := hops + 1].
	^ sections
%

category: 'Grail-Live Frames'
classmethod: BaseException
___generatorOwningStack___: triples
	"The PythonGenerator whose body is running on the stack ``triples'' belongs
	to, or nil when that stack is not a generator body.

	Read off the frames themselves: _forkBody's blocks run with the generator as
	self, so the generator is reachable from any frame whose home method is
	_forkBody.  Scanned from the innermost end, because the first such frame out
	from here is this process's own -- a process runs exactly one generator body.

	Through ``selfValue'', NOT the triple's third slot.  A captured triple holds
	(method, ip, RECEIVER), and the receiver of a BLOCK frame is the ExecBlock
	itself, not the self it closes over -- so the obvious read answers an
	ExecBlock for every frame here and the generator is never found."

	| i |
	triples isNil ifTrue: [^ nil].
	i := 1.
	[i + 2 <= triples size] whileTrue: [
		| meth home rcvr cand |
		meth := triples at: i.
		home := meth isNil
			ifTrue: [nil]
			ifFalse: [[meth homeMethod] on: Error do: [:ex |
				(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
				ex return: meth]].
		(home notNil and: [home selector == #'_forkBody']) ifTrue: [
			rcvr := triples at: i + 2.
			cand := (rcvr isKindOf: PythonGenerator)
				ifTrue: [rcvr]
				ifFalse: [[rcvr selfValue] on: Error do: [:ex | ex return: nil]].
			(cand isKindOf: PythonGenerator) ifTrue: [^ cand]].
		i := i + 3].
	^ nil
%

category: 'Grail-Live Frames'
classmethod: BaseException
___unreadableFrame___: anIndex of: aDepth in: aProcess why: aReason
	"A process that just claimed aDepth frames would not hand over frame
	anIndex.  RAISE; do NOT answer a short list.

	WHY RAISING BEATS DROPPING.  The walk is POSITIONAL -- it answers
	(method, ip, receiver) triples innermost-first -- so dropping one frame
	shifts every frame outside it one place inwards, and the caller gets a
	plausible stack that is WRONG.  That cost real time twice, as flaky CI
	failures whose message pointed anywhere but here:
	  * GeneratorStackFrameTestCase, ``list.index(x): x not in list'', because
	    the dropped frame was the one the fixture looked for; and
	  * TracebackTestCase>>testLiveFramesAndGetframe, where depth 1 answered
	    the function that belongs at depth 2.
	For a debugger API, no answer is better than a confidently wrong one.

	WHY IT IS SAFE TO RAISE HERE.  Of the callers of ___liveFrameChain___, the
	three that merely WANT a frame already guard it and degrade to nil --
	warnings.gs twice (`on: Error do: [nil]') and importlib.gs
	(`on: AbstractException do: [nil]') -- so a warning loses its origin
	rather than failing.  sys._getframe does NOT guard it, and that is exactly
	the caller for which a wrong stack is worse than an error.

	WHY THE ANOMALY IS NOT YET EXPLAINED, and what the message therefore
	carries.  A genuinely parked process reads every frame it claims: measured
	17 of 17 on a process waiting on a Semaphore, and 0 nils through
	GsProcess>>gtAllFrames.  Native-code stacks are not the cause either --
	`GsProcess usingNativeCode' is false in this configuration.  So the status,
	the stack kind, and the depth RE-SAMPLED at failure time are all reported:
	a depth that has changed says the process ran while we walked it, which is
	the hypothesis this replaces guessing about.

	Note GsProcess>>_isSuspended is deliberately NOT asserted anywhere: a
	consumer blocked on consumerSem answers false for it (`suspended' means
	explicitly suspend'ed), so the obvious precondition check would reject
	every healthy consumer.  _statusString is the informative one."

	| status kind depthNow |
	status := [aProcess _statusString] on: Error do: [:ex | ex return: '?'].
	kind := [aProcess _stackKind] on: Error do: [:ex | ex return: '?'].
	depthNow := [aProcess stackDepth] on: Error do: [:ex | ex return: '?'].
	^ Error signal:
		'Grail live-frame walk: process claimed ' , aDepth printString ,
		' frames but would not hand over frame ' , anIndex printString ,
		' (' , aReason , ').  status ' , status printString ,
		', stackKind ' , kind printString ,
		', depth re-sampled ' , depthNow printString ,
		'.  A dropped frame would have shifted every frame outside it, so this'
		, ' raises instead; see BaseException class>>___unreadableFrame___:of:in:why:.'
%

category: 'Grail-Live Frames'
classmethod: BaseException
___framesOfSuspendedProcess___: aProcess
	"The frames of a SUSPENDED process as (method, ip, receiver) triples,
	innermost first -- the same shape ___trimCapturedStack___: answers for a
	raise-time capture, so the one walk serves both.

	``_frameContentsAt:'' answers an Array whose first slot is the GsNMethod and
	whose SECOND is the ip in the ``_sourceAtIp:'' convention -- the same ip
	_gsStack records, so line derivation needs no translation.  (Not the ip in
	``_frameDescrAt:'', which is a different number for the same frame.)

	Answers nil rather than an empty array when the process cannot be read: a
	terminated or running process has no readable frames, and a caller
	distinguishing ``no frames'' from ``no more sections'' would be reading a
	distinction that does not exist."

	| out d |
	aProcess isNil ifTrue: [^ nil].
	d := [aProcess stackDepth] on: Error do: [:ex | ex return: 0].
	((d isNil) or: [d <= 0]) ifTrue: [^ nil].
	out := OrderedCollection new.
	1 to: d do: [:i |
		| fc meth |
		fc := [aProcess _frameContentsAt: i] on: Error do: [:ex | ex return: nil].
		fc isNil ifTrue: [
			^ self ___unreadableFrame___: i of: d in: aProcess why: 'frame contents'].
		meth := [aProcess _methodInFrameContents: fc]
			on: Error do: [:ex | ex return: nil].
		meth isNil ifTrue: [
			^ self ___unreadableFrame___: i of: d in: aProcess why: 'method in frame contents'].
		"The RECEIVER stays tolerant on purpose: a missing receiver leaves the
		 triple in place, so it costs one slot and shifts nothing.  It is the
		 METHOD that carries position."
		out add: meth;
			add: (fc at: 2);
			add: ([aProcess _receiverInFrameContents: fc]
				on: Error do: [:ex | ex return: nil])].
	out isEmpty ifTrue: [^ nil].
	^ out asArray
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

	Two routes, because there are two def shapes and only one of them names a
	module.

	A MODULE-LEVEL def's defining class IS its module: ``meth inClass name''
	answers the module name, so the module's own ``__file__'' is one sys.modules
	lookup away.  That was the only route here, and it silently failed for the
	other shape.

	A CLASS-BODY def compiles to a Smalltalk method whose ``inClass'' is the
	PYTHON CLASS, not the module -- ``T'', not ``stackprobe'' -- so the
	sys.modules lookup missed and EVERY live frame for a method reported
	``<grail>''.  Exception tracebacks were unaffected (they take the filename
	from the catching function's PyCode), which is why code_filename.py passed
	throughout while test_format_stack / test_print_stack / test_extract_stack
	did not.  The class-side ``___methodCodeTable___'' holds the very PyCode that
	backs ``__code__'', so its co_filename is exactly the path code_filename.py
	already pins -- consult it FIRST, and the two paths cannot disagree.

	Falls back to ``<grail>'', which is what a frame with no locatable module has
	always reported."

	| cls clsName mod file pyName code |
	cls := [aMethod @env0:inClass] @env0:on: Error do: [:ex | ex @env0:return: nil].
	cls isNil ifTrue: [^ '<grail>'].
	"Route 1: a class-body def's code table.  Searched along the whole lookup
	 chain (superclasses, then the C3 MRO) rather than just aMethod's inClass,
	 because a MIXIN's methods are RECOMPILED onto the subclass by
	 ___mergeSecondaryBases___ while their PyCode stays in the mixin's own table:
	 for ``class TestTracebackFormat(unittest.TestCase, TracebackFormatMixin)''
	 inClass is TestTracebackFormat, whose own class side has no table at all, so
	 the probe found unittest.TestCase's inherited one, missed, and every mixin
	 method's frame reported ``<grail>'' -- while the bound method's __code__ for
	 the same method, which already walked the MRO, reported the real path."
	"NOT ``name'': this is a CLASSMETHOD, so self is the class and GemStone's
	 Class instVar ``name'' is already in scope -- CompileError 1030."
	pyName := [self ___pythonFrameNameFor___: aMethod @env0:selector]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	pyName isNil ifFalse: [
		code := self ___liveFrameCodeFor___: cls name: pyName.
		code isNil ifFalse: [
			file := [code @env0:dynamicInstVarAt: #'co_filename']
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
			((file isKindOf: CharacterCollection)
				and: [(file @env0:asString @env0:= '<grail>') @env0:not])
					ifTrue: [^ file @env0:asString]]].
	"Route 2: inClass names a module (a module-level def)."
	clsName := [cls @env0:name @env0:asString]
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
___liveFrameCodeFor___: aClass name: aName
	"First ___methodCodeTable___ entry named aName along aClass's lookup chain,
	or nil.  The Python-visible counterpart of
	BoundMethod>>___methodCodeForClass___:name:, over the same chain
	(importlib ___methodLookupChainFor___:) and for the same reason -- a mixin's
	method is recompiled onto the subclass but its PyCode is not.

	Each hop is guarded: this runs while a stack is being formatted, often while
	an exception is already being reported, so a class whose table accessor
	refuses must cost this frame its filename and nothing more."

	| chain |
	aClass isNil ifTrue: [^ nil].
	chain := [importlib @env0:___methodLookupChainFor___: aClass]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	chain isNil ifTrue: [chain := { aClass }].
	chain @env0:do: [:c |
		| tbl code |
		"The table is compiled in environment 1, so an env-0 probe would never
		 see it -- same reason BoundMethod passes environmentId: 1 here."
		((c @env0:class @env0:whichClassIncludesSelector: #'___methodCodeTable___'
			environmentId: 1) ~~ nil) ifTrue: [
				tbl := [c @env1:___methodCodeTable___]
					@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
				tbl isNil ifFalse: [
					code := [tbl @env0:at: aName otherwise: nil]
						@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
					code isNil ifFalse: [^ code]]]].
	^ nil
%

category: 'Grail-Live Frames'
classmethod: BaseException
___isGeneratedPythonMethod___: aMethod
	"Whether ``aMethod'' is compiled Python rather than part of Grail's runtime.

	Asked of the method rather than of an ip: codegen emits ``___curPos___ :=
	N'' before every Python statement, so the marker is present in any
	generated body and absent from every hand-written Smalltalk one, and the
	answer is independent of where the frame is suspended (§9.10).

	TWO PROBES, ordered by what they touch.  The method's own debugInfo lists
	its temps (argsAndTemps decodes it from the method object, already in
	memory off the stack triple), and a module-level def declares
	___curPos___ there -- conclusive, and untouchable by a repository
	hiccup.  But a def whose body compiles into an inner BLOCK declares the
	temp in the block, where method-level debugInfo cannot see it
	(_py_warnings: 11 of 46 methods), so a temps miss falls through to the
	SOURCE probe -- and the source string is the one read here that goes back
	to the repository, which under four concurrent shard workers can fault.

	A TRANSIENT fault used to drop the frame from THIS walk only: the walk
	answered false, the chain came up short (``ValueError: call stack is not
	deep enough''), and the next walk re-probed fine -- a one-off failure in
	whatever frame-sensitive test was running, clean on every re-run.  Three
	sightings in one week (WarningLocation, FrameEquality, Traceback), never
	reproducible.  So the source probe now RETRIES once -- a faulting page
	read that just failed is the likeliest read to succeed a moment later --
	and a double failure leaves a breadcrumb in SessionTemps
	(#GrailPyProbeFailures) so a run that still flakes says why.  Failures
	stay UNCACHED either way: a real false is a property of the method, a
	failed probe is a property of the moment.

	#GrailPyProbeFailCount is a TEST SEAM: the resilience test sets it to
	simulate that many consecutive transient faults, because a real page
	fault cannot be scheduled.  One proves the retry absorbs a single fault;
	two prove a double fault answers false for this walk only, leaves the
	breadcrumb, and stays uncached.  Each injected fault decrements it, and
	it costs one dictionary probe per source-probe attempt.

	Cached per method in SessionTemps, like the ip -> line cache and for the
	same reason: the answer is fixed for the life of the method, and a stack
	walk revisits the same methods constantly."

	| cache key |
	cache := SessionTemps @env0:current @env0:at: #'GrailPyMethodCache' otherwise: nil.
	cache isNil ifTrue: [
		cache := KeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #'GrailPyMethodCache' put: cache].
	key := aMethod @env0:asOop.
	^ cache @env0:at: key ifAbsent: [
		| answer attempt |
		"Fast path: the marker as a METHOD temp, read from in-memory debugInfo."
		answer := [(aMethod @env0:argsAndTemps @env0:ifNil: [#()])
				@env0:includes: #'___curPos___']
			@env0:on: Error do: [:ex |
				(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
				ex @env0:return: false].
		answer ifTrue: [
			cache @env0:at: key put: true.
			^ true].
		"Source probe, twice.  attempt = 1 is allowed to fail quietly; a second
		failure is recorded and answered as ``not Python'' for this walk only."
		answer := nil.
		attempt := 1.
		[answer isNil and: [attempt @env0:<= 2]] whileTrue: [
			answer := [
				| seam |
				seam := SessionTemps @env0:current
					@env0:at: #'GrailPyProbeFailCount' otherwise: 0.
				seam @env0:> 0 ifTrue: [
					SessionTemps @env0:current
						@env0:at: #'GrailPyProbeFailCount' put: seam @env0:- 1.
					Error @env0:new @env0:signal: 'grail probe test seam'].
				(aMethod @env0:sourceString) @env0:includesString: '___curPos___']
				@env0:on: Error do: [:ex |
					(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
					ex @env0:return: nil].
			attempt := attempt @env0:+ 1].
		answer isNil ifTrue: [
			SessionTemps @env0:current
				@env0:at: #'GrailPyProbeFailures'
				put: ((SessionTemps @env0:current
					@env0:at: #'GrailPyProbeFailures' otherwise: 0) @env0:+ 1).
			^ false].
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

	^ self ___enterHandler___: nil
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___enterHandler___: aTokenOrNil
	"Called as an ``except'' handler body starts, naming the TRY ACTIVATION the
	handler belongs to.

	The token is what tells a later clause of the SAME try apart from a handler
	somewhere else that happens to be running.  A depth counter cannot: it rises
	for any handler at all, including one inside a function the try body CALLED,
	and shielding on that caught exceptions the try should have handled.  See
	___handlerTokenActive___:.

	Emitted only for a try with two or more clauses -- a single-clause try has no
	sibling to shield, so it still calls the no-argument form and pushes nil."

	SessionTemps @env0:current
		@env0:at: #'GrailHandlerDepth'
		put: self ___handlerDepth___ @env0:+ 1.
	self ___handlerTokenStack___ @env0:addLast: aTokenOrNil.
	^ self
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___handlerTokenStack___
	"The try-activation tokens of the ``except'' handler bodies currently
	running, outermost first.  Session-local, like the depth it parallels."

	^ SessionTemps @env0:current
		@env0:at: #'GrailHandlerTokens'
		ifAbsentPut: [OrderedCollection @env0:new]
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___captureHandlerState___
	"The running-handler bookkeeping, as one value, so a second thread of
	execution can put its own in place and hand this back afterwards.

	The depth and the token stack are session-wide slots, but what they describe
	-- ``which except handler bodies am I inside'' -- is a property of ONE call
	stack.  A generator body is a second call stack (it runs on a forked
	GsProcess), and a coroutine is a generator, so an ``await'' inside an
	``except'' handler suspends with the handler still counted.  Whoever runs next
	then sees, and unwinds, bookkeeping that is not theirs.

	The symptom is not a mismatched handler but an UNCAUGHT exception: a token
	left behind makes ___handlerTokenActive___: answer true for its try site
	forever after, and a shielded clause refuses everything -- ``except
	BaseException'' included.  Two coroutines both parked inside
	``except BlockingIOError: await ...'' (the canonical asyncio retry, and what
	every socket coroutine in the event loop is written as) is enough to produce
	it.

	This is the same problem ___currentException___ already has, and the same
	answer: PythonGenerator save/restores it across every suspension, from both
	sides.  See PythonGenerator >> ___captureConsumerState___ and >> ___yield___:.

	The stack is COPIED.  It is a mutable OrderedCollection living in a session
	slot, so handing back the same object would hand back whatever the other side
	did to it."

	^ { self ___handlerDepth___ . self ___handlerTokenStack___ @env0:copy }
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___restoreHandlerState___: anArray
	"Reinstate what ___captureHandlerState___ answered."

	SessionTemps @env0:current
		@env0:at: #'GrailHandlerDepth'
		put: (anArray @env0:at: 1).
	SessionTemps @env0:current
		@env0:at: #'GrailHandlerTokens'
		put: (anArray @env0:at: 2) @env0:copy.
	^ self
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___handlerTokenActive___: aToken
	"Is one of THIS try activation's own handler bodies currently running?

	Identity against the token, and a search of the WHOLE stack rather than just
	its top, because both readings matter:

	  * my clause-1 handler is running            -> shield my later clauses
	  * my clause-1 handler called g, and g's own
	    handler is raising                        -> still inside my handler,
	                                                 so still shield
	  * g's handler is raising and no handler of
	    mine is running                           -> NOT mine, so my later
	                                                 clauses must catch

	That last line is the one a depth test got wrong.

	A fresh token per try ACTIVATION, not per try site: a recursive function
	whose outer call is inside its own handler would otherwise shield the inner
	call's clauses against an exception that has nothing to do with them."

	aToken @env0:isNil ifTrue: [^ false].
	^ self ___handlerTokenStack___ @env0:anySatisfy: [:each | each @env0:== aToken]
%

category: 'Grail-Handler Depth'
classmethod: BaseException
___exitHandler___
	"Called as an ``except'' handler body finishes, however it finishes -- the
	caller pairs this with the enter through ensure:, so a return / break /
	continue or a re-raise still unwinds the count.

	POPPING THE TOP IS CORRECT, but only because the stack is per-thread-of-
	execution rather than per session -- which it was not until
	___captureHandlerState___ was added.  Handler bodies on ONE call stack finish
	in the order they started (ensure: guarantees the pairing), so last-in-first-out
	holds.  What broke that was two COROUTINES: each runs on its own forked
	GsProcess, and either can suspend inside a handler, so their handler bodies
	interleave and whoever resumed first popped the other's entry.  The answer is
	to give each its own stack across suspensions, not to search this one -- a
	search would also have to guess which entry was 'mine' among identical
	per-SITE tokens, which is exactly the case it cannot distinguish."

	| d stack |
	d := self ___handlerDepth___.
	SessionTemps @env0:current
		@env0:at: #'GrailHandlerDepth'
		put: (d @env0:> 0 ifTrue: [d @env0:- 1] ifFalse: [0]).
	stack := self ___handlerTokenStack___.
	stack @env0:isEmpty ifFalse: [stack @env0:removeLast].
	^ self
%

