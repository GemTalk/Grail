Extension { #name : 'BaseException' }

{ #category : 'Grail-Initialization' }
BaseException class >> ___allocateForNew: args kw: kwargs [
	"CPython's BaseException_new: an instance of the receiver holding args.
	Keywords are ignored here -- BaseException_init is what refuses them -- and
	___classForArgs___: still decides the class, so OSError.__new__(OSError,
	2, 'x') is a FileNotFoundError and a bare group narrows, as in CPython."

	| inst |
	inst := (self ___classForArgs___: args) ___new___.
	inst ___args___: args.
	^ inst

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___applyCause___: aCause to: anException [
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

]

{ #category : 'Grail-Argument Binding' }
BaseException class >> ___checkMissingKeywordOnly___: kwargs defaults: defaults names: names qualifiedName: qname [
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

]

{ #category : 'Grail-Argument Binding' }
BaseException class >> ___checkMissingPositional___: positional kwargs: kwargs names: names posonly: posonlyCount qualifiedName: qname [
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

]

{ #category : 'Grail-Initialization' }
BaseException class >> ___classForArgs___: positional [
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

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___exceptionFromClass___: cls [
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

]

{ #category : 'Grail-Initialization' }
BaseException class >> ___excStaticNew: positional kw: kwargs [
	"CPython's ``Exc.__new__(cls, *args)'' -- __new__ called EXPLICITLY, with the
	class to build as its first argument: ``Exception.__new__(cls, m)'' and
	``super().__new__(cls, m)'' in a subclass's own __new__.

	The class-side ``__new__:'' family cannot serve that call.  It is the
	CONSTRUCTOR the class-call fast path emits -- ``ValueError('m')'' is
	``ValueError __new__: 'm''' -- so its receiver is the class and every
	argument is a constructor argument, and an explicit call reached it with
	``cls'' as the first ARGUMENT: ``Exception.__new__(C, 'm')'' built an
	Exception whose args were (C, 'm').  A subclass's __init__ resetting
	``args'' hid that for every class but OSError, whose __init__ CPython makes
	a no-op once __new__ is overridden (test_exception_hierarchy's
	test_new_overridden and test_init_new_overridden).

	So the __new__ a class READ answers for a built-in exception (BoundMethod
	class >> ___forAttrRead___:selector:) and the one super() resolves to
	(SuperBoundMethod >> value:value:) both come here.  The receiver is the
	class whose __new__ was read, which is what CPython's messages name.  No
	__init__ runs: CPython's type call runs it, an explicit __new__ does not."

	| cls |
	(positional @env0:isNil or: [positional @env0:isEmpty]) ifTrue: [
		^ TypeError ___signal___: self @env0:name @env0:asString
			@env0:, '.__new__(): not enough arguments'].
	cls := positional @env0:at: 1.
	(cls @env0:isKindOf: Behavior) ifFalse: [
		^ TypeError ___signal___: self @env0:name @env0:asString
			@env0:, '.__new__(X): X is not a type object ('
			@env0:, (bytes ___pyTypeNameOf___: cls) @env0:, ')'].
	((cls == self) or: [cls @env0:inheritsFrom: self]) ifFalse: [
		^ TypeError ___signal___: self @env0:name @env0:asString
			@env0:, '.__new__(' @env0:, (cls ___pyAttrLoad___: #'__name__') @env0:asString
			@env0:, '): ' @env0:, (cls ___pyAttrLoad___: #'__name__') @env0:asString
			@env0:, ' is not a subtype of ' @env0:, self @env0:name @env0:asString].
	^ cls ___allocateForNew: (positional @env0:copyFrom: 2 to: positional @env0:size)
		kw: kwargs

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___isInFlight___: excValue [
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

]

{ #category : 'Grail-Argument Binding' }
BaseException class >> ___missingArgumentsText___: names kind: kind qualifiedName: qname [
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

]

{ #category : 'Grail-Exception handling' }
BaseException class >> ___overflowPayloadFor___: anOverflow [
	"The RecursionError a raw AlmostOutOfStack(Error) stands for, built on first
	use and kept on it as its ___grailPayload___ -- the carrier slot
	___payloadOf___: reads -- so every handler that meets this overflow, and a
	re-raise from any of them, sees ONE RecursionError.

	Built as CPython builds it: Python args and messageText, and the implicit
	__context__ every raise takes (the runaway is often inside a handler, which
	is what gives test_long_context_chain its chain).  No stack capture here:
	___payloadOf___: copies the overflow's own, which is the stack at the trip."

	| re |
	re := anOverflow @env0:dynamicInstVarAt: #'___grailPayload___' ifAbsent: [nil].
	re == nil ifFalse: [^ re].
	BaseException @env0:___noteStackOverflow___: anOverflow.
	re := RecursionError ___new___.
	re ___args___: { 'maximum recursion depth exceeded' }.
	re @env0:messageText: 'maximum recursion depth exceeded'.
	re ___applyImplicitContext___.
	anOverflow @env0:dynamicInstVarAt: #'___grailPayload___' put: re.
	BaseException @env0:___noteStackOverflowConverted___.
	^ re

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___passOrSignal___: excValue [
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

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___pyExceptType___: handler [
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

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___pyRaise___: excValue [
	"``raise excValue`` (the expression form).  CPython: a BaseException subCLASS
	is signalled (``raise ValueError'' behaves like ``raise ValueError()''); a
	BaseException INSTANCE signals itself; anything else -- a plain class, a str,
	a number -- raises ``TypeError: exceptions must derive from BaseException''.
	excValue is an ARGUMENT (not the receiver) so a non-exception can't die on a
	MessageNotUnderstood for #signal (test_baseexception test_raise_string /
	test_raise_new_style_non_exception)."

	^ self ___pyRaise___: excValue cause: nil

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___pyRaise___: excValue cause: aCause [
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
			((BaseException @env0:___handledException___) isNil
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
		"RAISING AN EXCEPTION THAT ALREADY HAS A TRACEBACK ADDS THE FRAMES OF THIS
		RAISE ON TOP OF IT.  That is CPython's rule for ``raise exc'', and it is
		the same rule with_traceback() asks for, so this takes the same road: the
		mark tells the next catch to PREPEND this raise's frames to the chain
		instead of reading the chain as a partial unwind record.

		Without it the next catch saw a head frame naming the function it was in
		-- the frame the EARLIER catch recorded -- took that for ``already
		located'' and added nothing, so the line of the ``raise exc'' itself was
		missing.  ExitStack's own __exit__ is exactly this shape:

		    try:
		        raise exc          # CPython reports this line ...
		    except BaseException:  # ... above the one exc was first caught at
		        exc.__context__ = fixed_ctx
		        raise

		(test_contextlib[_async] test_exit_exception_traceback).

		The capture has to be taken HERE, at the re-raise, since the frames
		wanted are the ones between this raise and its catcher.  Primitive 2022
		fills _gsStack only when it is nil, so the first raise's capture is
		cleared -- it is spent: its frames are already in the chain being kept --
		and so is any generator stash it carries, which describes that earlier
		raise and would otherwise be spliced in front of this one.  A bare
		``raise'' does not come here (___reRaise___), and correctly so: CPython
		adds no frame for it."
		(excValue __traceback__ == None) ifFalse: [
			excValue @env0:dynamicInstVarAt: #'___tbUserAttached___' put: true.
			excValue @env0:_gsStack: nil.
			BaseException @env0:___dropGeneratorStack___: excValue].
		"In flight -- its handler is running, so the object is a live anchor and
		cannot be signalled again.  A CARRIER re-raises it without re-signalling
		it, which keeps CPython's identity AND gets a fresh handler search; #pass
		kept the identity but resumed outside the active on:do:, skipping any
		handler established inside the except body.  See ___signalCarrying___:."
		(self ___isInFlight___: excValue) ifTrue: [^ self @env0:___signalCarrying___: excValue].
		^ self ___signalOrPass___: excValue].
	^ TypeError ___signal___: 'exceptions must derive from BaseException'

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___pyRaiseNew___: cls args: positional kw: kwargs [
	"``raise cls(*positional, **kwargs)`` for a bare-name callee.  Validate that
	cls is a BaseException subclass -- else ``TypeError: exceptions must derive
	from BaseException'' (``raise NewStyleClass()'') -- then construct and signal
	via ___signalNew___ (running any user __init__), exactly as the unguarded
	path did for a real exception class."

	^ self ___pyRaiseNew___: cls args: positional kw: kwargs cause: nil

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___pyRaiseNew___: cls args: positional kw: kwargs cause: aCause [
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

]

{ #category : 'Grail-Initialization' }
BaseException class >> ___pythonClassDefines: aName [
	"Does a Python-defined class on the receiver's chain, at or below the
	built-in it rests on, define aName itself (instance or class side)?  A
	merged secondary base's methods are compiled into the subclass, so they
	count as its own."

	| c family |
	family := importlib @env0:___pythonNameFamilyOf___: aName.
	c := self.
	[c ~~ nil and: [(c @env0:whichClassIncludesSelector: #'___pyDefinedClass___'
			environmentId: 1) ~~ nil]] whileTrue: [
		((c ___grailOwnsPythonDef___: aName family: family forwarders: true)
			or: [c @env0:class ___grailOwnsPythonDef___: aName family: family forwarders: true])
				ifTrue: [^ true].
		c := c @env0:superclass].
	^ false

]

{ #category : 'Grail-Recursion' }
BaseException class >> ___recursionGuard___: aBlock [
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
		"INSTRUMENTATION, because the interesting failure is not this handler
		 running -- it is this handler running OUT.

		 The yellow zone is a RESERVE, not a second chance: GEM_SMALLTALK_STACK_-
		 ERROR_PERCENT (default 25) sets how much stack remains AFTER the trip
		 point, and docs/GemStone_Feature_Requests.md measures that reserve at
		 ~343 frames at the default.  Everything below runs inside it -- building
		 the replacement, ___applyImplicitContext___ walking the context chain,
		 and then resignalAs:, which restarts the handler search from the ORIGINAL
		 signal point deep inside the recursion.  Overrun it and the product
		 signals a NOT-TRAPPABLE AlmostOutOfStackError to the GCI and the gem
		 dies -- which is what test.test_copy has been doing nightly on Linux
		 while passing here.

		 So record the depth at entry and again just before resignalAs:, the last
		 point still reachable.  The difference is what the conversion COSTS, and
		 comparing it against the reserve is the whole question.  Emitted to the
		 client log (which the CPython harness captures per module) only when
		 GRAIL_STACK_TRACE is set, so an ordinary run pays nothing and the
		 instrumentation cannot itself perturb the reserve it measures.  The
		 SessionTemps tally is unconditional: two sends, no I/O."
		"A PAYLOAD ALREADY BUILT means a Python handler caught this overflow in
		 the first search (BaseException class >> handles:) and then let it go
		 on -- a bare ``raise'', a ``with'' whose __exit__ declined.  Every
		 handler above this guard has had its turn, so the RecursionError is
		 signalled OUTWARD from here.  resignalAs: would restart at the
		 overflow and run that handler's body a second time."
		(ex @env0:dynamicInstVarAt: #'___grailPayload___' ifAbsent: [nil]) ifNotNil: [:p |
			^ ex @env0:return: (BaseException @env0:___signalCarrying___: p)].
		re := self ___overflowPayloadFor___: ex.
		ex @env0:resignalAs: re]

]

{ #category : 'Grail-Initialization' }
BaseException class >> ___signal___: message [
	"Create and signal an exception with proper Python args."

	| instance |
	instance := self ___new___.
	instance ___args___: { message }.
	instance ___applyImplicitContext___.
	instance ___signal___: message.

]

{ #category : 'Grail-Argument Binding' }
BaseException class >> ___signalMissingArguments___: names kind: kind qualifiedName: qname [
	"Raise the missing-argument TypeError for an already-determined list of
	names.  The per-parameter binding fallbacks emitted by FunctionDefAst and
	LambdaAst come here with a single name, so a call that somehow reaches one
	of them still reports CPython's wording rather than a second, older one."

	^ TypeError ___signal___:
		(self ___missingArgumentsText___: names kind: kind qualifiedName: qname)

]

{ #category : 'Grail-Initialization' }
BaseException class >> ___signalNew___: positional kw: kwargs [
	"``raise Cls(*positional, **kwargs)`` — construct with the FULL args tuple,
	run any user-defined __init__ (the plain ___signal___: path skips __init__
	and keeps only the first arg), then signal.  Built-in exceptions inherit
	BaseException's __init__ so they skip the __init__ call but still receive
	the complete args tuple."

	^ self ___signalNew___: positional kw: kwargs cause: nil

]

{ #category : 'Grail-Initialization' }
BaseException class >> ___signalNew___: positional kw: kwargs cause: aCause [
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

]

{ #category : 'Grail-Raise Validation' }
BaseException class >> ___signalOrPass___: excValue [
	"#signal excValue, falling back to a carrier when the kernel refuses
	because it is already in flight.  (The name keeps its history; the #pass
	half of it is gone -- see below.)

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

	The fallback is a CARRIER (___signalCarrying___:), not #pass and not a
	#copy, and the history is three designs in one sentence: #pass preserved
	identity but resumed the ORIGINAL handler search -- skipping any handler
	established since, where CPython's ``raise'' always searches afresh from
	the raise point -- and needed the original raise's handler frame to still
	be on THIS process's stack, which a re-raise of an exception captured from
	a generator or coroutine (its body runs on a forked GsProcess) never has;
	that surfaced as an uncatchable ``ImproperOperation: cannot find handler
	frame'' and took out the ordinary asyncio pattern

	    fut.set_exception(exc)      # captured inside a coroutine
	    ...
	    raise self._exception       # asyncio.Future.result(), later, elsewhere

	-- 24 tests of test_asyncgen as ONE Smalltalk error.  A #copy of the
	exception signalled cleanly and matched the same ``except'', but broke
	OBJECT IDENTITY, which CPython requires and asserts: contextlib''s
	_GeneratorContextManager.__exit__ is ``if exc is not value: raise'', and
	test_locks'' test_cancelled_error_wakeup / _re_aquire assert the awaited
	task delivers the very instance the coroutine re-raised -- the copy path
	made exactly those two fail, because a CancelledError whose with-statement
	handler had already suppressed-and-unwound still carries stale frames, so
	the later ``raise raised'' landed here.  The carrier settles both at once:
	the payload is never signalled again (no 6011, no stale-frame refusal, no
	other-process frame needed), the handler unwraps the payload so identity
	is free, and an ordinary #signal from the raise point IS CPython's fresh
	search.  ___signalCarrying___: also keeps the plain-#signal fast path for
	a payload with no live frames, so carriers appear exactly where #signal
	was impossible and nowhere else."

	^ [excValue @env0:signal]
		@env0:on: (Globals @env0:at: #UncontinuableError)
		do: [:u |
			u @env0:return: (self @env0:___signalCarrying___: excValue)]

]

{ #category : 'Grail-Generics' }
BaseException class >> __getitem__: item [
	"``Exception[OSError]'' -- CPython's TypeError: an exception class is not
	generic.  Grail's default collapses a class subscript to the class itself
	(Metaclass3), so this answered Exception and the test that it refuses
	(test_exception_group test_exception_is_not_generic_type) saw no error.
	The group classes, which ARE generic, override this (BaseExceptionGroup
	class >> __getitem__:), and so does any subclass defining its own
	__class_getitem__ -- a user exception mixing in typing.Generic keeps
	working."

	(((self @env0:whichClassIncludesSelector: #'__class_getitem__:' environmentId: 1) ~~ nil
		or: [(self @env0:whichClassIncludesSelector: #'___class_getitem__:kw:' environmentId: 1) ~~ nil])
		or: [((self ___classChainAttrLookup___: #'__class_getitem__') ~~ nil)
			or: [(self ___classAttrOverlayLookup___: self name: #'__class_getitem__') ~~ nil]])
			ifTrue: [^ self ___grailClassGetitemDispatch___: item].
	^ TypeError ___signal___: 'type ''' @env0:, self @env0:name @env0:asString
		@env0:, ''' is not subscriptable'

]

{ #category : 'Grail-Initialization' }
BaseException class >> __new__ [
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

]

{ #category : 'Grail-Initialization' }
BaseException class >> __new__: arg1 [
	"``ExceptionClass(arg)`` as an expression — one constructor argument."

	| instance |
	instance := self ___new___.
	instance ___args___: { arg1 }.
	^ instance

]

{ #category : 'Grail-Initialization' }
BaseException class >> __new__: arg1 _: arg2 [
	"``ExceptionClass(a, b)`` as an expression.

	Through ___classForArgs___:, so ``BaseExceptionGroup('m', [ValueError()])''
	answers an ExceptionGroup here just as it does when raised."

	| instance args |
	args := { arg1. arg2 }.
	instance := (self ___classForArgs___: args) ___new___.
	instance ___args___: args.
	^ instance

]

{ #category : 'Grail-Initialization' }
BaseException class >> __new__: arg1 _: arg2 _: arg3 [
	"``ExceptionClass(a, b, c)`` as an expression.

	Through ___classForArgs___:, for the reason the two-argument form gives:
	which class is built cannot depend on how many arguments were written.
	``OSError(2, 'm')'' and ``OSError(2, 'm', 'f')'' are both
	FileNotFoundError in CPython."

	| instance args |
	args := { arg1. arg2. arg3 }.
	instance := (self ___classForArgs___: args) ___new___.
	instance ___args___: args.
	^ instance

]

{ #category : 'Grail-Initialization' }
BaseException class >> __new__: arg1 _: arg2 _: arg3 _: arg4 [
	"``ExceptionClass(a, b, c, d)'' as an expression -- OSError's
	(errno, strerror, filename, winerror) form among others.  Through
	___classForArgs___: for the reason the two-argument form gives."

	| instance args |
	args := { arg1. arg2. arg3. arg4 }.
	instance := (self ___classForArgs___: args) ___new___.
	instance ___args___: args.
	^ instance

]

{ #category : 'Grail-Initialization' }
BaseException class >> __new__: arg1 _: arg2 _: arg3 _: arg4 _: arg5 [
	"``ExceptionClass(a, b, c, d, e)`` as an expression —
	UnicodeDecodeError / UnicodeEncodeError take five arguments, and so does
	the OSError form that carries a second filename.  Through
	___classForArgs___: for the reason the two-argument form gives."

	| instance args |
	args := { arg1. arg2. arg3. arg4. arg5 }.
	instance := (self ___classForArgs___: args) ___new___.
	instance ___args___: args.
	^ instance

]

{ #category : 'Grail-Initialization' }
BaseException class >> _new: positional kw: kwargs [
	"``ExceptionClass(*args)'' for any arity its fixed forms do not cover.
	CPython's BaseException takes ANY number of positional arguments and keeps
	them all in ``args''; Grail had forms for 0, 1, 2, 3 and 5 only, so
	``ValueError(0, 1, 2, 3)'', ``OSError(2, 's', 'f', None)'' and every
	six-or-more argument exception were ``takes wrong number of arguments''
	(test_exception_hierarchy's BlockingIOError cases).  Through
	___classForArgs___: like the fixed forms, so OSError's errno mapping
	applies whatever the arity.

	Keywords are CPython's TypeError, as they always were here; the built-in
	exceptions that take them (NameError, AttributeError, ImportError) answer
	their own ``_new:kw:''."

	| instance args |
	((kwargs @env0:notNil) and: [kwargs @env0:notEmpty]) ifTrue: [
		^ TypeError ___signal___: (self @env0:name @env0:asString
			@env0:, '() takes no keyword arguments')].
	args := positional @env0:isNil ifTrue: [#()] ifFalse: [positional @env0:asArray].
	instance := (self ___classForArgs___: args) ___new___.
	instance ___args___: args.
	^ instance

]

{ #category : 'Grail-Chaining' }
BaseException >> ___applyImplicitContext___ [
	"CPython's IMPLICIT chaining: an exception raised while another is being
	HANDLED records that other one as its __context__, which is what produces

	    During handling of the above exception, another exception occurred:

	in a rendered traceback.  Unlike __cause__ this needs no syntax -- it happens
	on every raise inside an ``except'' block -- and unlike __cause__ it does NOT
	set __suppress_context__.  ``raise X from Y'' sets BOTH: CPython reports
	cause=Y and context=Y there, with the flag on so only the cause renders.

	The exception being handled is the one TryAst records in
	___currentException___ on handler entry (and restores on exit), or, in a
	generator body with no handler of its own running, the one it inherited
	from its resumer -- ___handledException___ answers whichever applies.

	It must not overwrite a context already set -- an explicit one, or this
	exception being re-raised -- and must not chain an exception to itself.

	Cycles it BREAKS rather than declines, which is what CPython does
	(_PyErr_SetObject): walk the candidate's context chain, and if this exception
	is already in it, clear THAT link's context before chaining.  Declining
	instead leaves the context unset, which is visibly wrong -- test_traceback's
	test_cause_recursive builds exactly this shape and CPython reports
	__context__ as the KeyError, not None -- while doing nothing at all would let
	format() walk the loop forever."

	| current |
	(self ___rawContext___) isNil ifFalse: [^ self].
	current := BaseException @env0:___handledException___.
	current isNil ifTrue: [^ self].
	current == self ifTrue: [^ self].
	self ___unlinkFromContextChainOf___: current.
	self @env0:dynamicInstVarAt: #'___context___' put: current.
	"``current'' is being HANDLED -- we are raising from inside its handler -- so
	its traceback is already built and it is no longer propagating.  Release its
	raise-time capture here: that is what keeps a long chain affordable, since
	otherwise every link retains a full-stack capture and the retained total is
	quadratic in the chain's length (see ___releaseCapturedStack___).

	But only once that traceback EXISTS.  ``Being handled'' is not the same as
	``its traceback was built'': an except clause builds one on entry, but a
	``with'' statement's handler and a finally do not -- they run on behalf of
	the exception and then let it keep propagating, so the frames are built
	later, by whichever except clause finally catches it, FROM THIS CAPTURE.
	Releasing it here left that clause nothing to walk.  The case that found it
	is an ``async with'' whose body raises: awaiting __aexit__ ends that
	coroutine with an internal StopIteration (StopIteration class >>
	___signalReturn___:), which chains to the in-flight exception and so
	released its capture before anything had read it -- the exception then
	arrived at its handler with __traceback__ None (test_contextlib_async
	test_contextmanager_traceback's StopIteration / StopAsyncIteration cases).
	A chain built in except clauses still releases at every link, which is the
	case the quadratic bound is about."
	current __traceback__ == None ifFalse: [
		current @env0:___releaseCapturedStack___].
	^ self

]

{ #category : 'Grail-Private' }
BaseException >> ___args___: anArray [
	"Store the constructor arguments as a Python tuple.  CPython's
	``BaseException.args'' is ALWAYS a tuple of the positional constructor
	arguments -- ``RuntimeError(42).args == (42,)'', and ``{}[(1,)]'' raises a
	KeyError whose ``args == ((1,),)'' (test_dict test_missing /
	test_tuple_keyerror).  Callers pass a Smalltalk Array of the positionals;
	normalise it to a tuple here so every construction path is consistent and
	every reader (args accessor, __str__, __repr__, __eq__) sees a tuple."

	args := tuple @env0:withAll: anArray

]

{ #category : 'Grail-Live Frames' }
BaseException >> ___captureFrameLocalsIfSuggestible___ [
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
	"NOT FOR THE MISS A PROBE IS ASKING ABOUT.  getattr(obj, name, default) and
	 hasattr(obj, name) raise and catch an AttributeError to find a missing name,
	 and that exception is consumed before anything can render it -- yet the walk
	 below was most of its cost: a miss measured 25us, 17 of them here (#1214).
	 builtins>>___probingAttr___:named: publishes the (object, name) pair it is
	 asking about; the miss for exactly that pair skips the snapshot and stays an
	 ordinary AttributeError, so any handler between the two -- a __getattr__
	 that tries object.__getattribute__ and falls back -- still catches it.
	 Only courtesy data is lost, and only for an exception the probe swallows."
	(self @env0:isKindOf: AttributeError) ifTrue: [ | probe |
		probe := SessionTemps @env0:current @env0:at: #'GrailAttrProbe' otherwise: nil.
		(probe @env0:notNil
			and: [(probe @env0:at: 1) @env0:== (self @env0:dynamicInstVarAt: #'obj')
			and: [(probe @env0:at: 2) @env0:= (self @env0:dynamicInstVarAt: #'name')]])
				ifTrue: [^ self]].
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
			"THE RECEIVER GOES IN TOO, under the name the def declared for it.
			 Grail passes a Python method's ``self'' as the Smalltalk RECEIVER, so
			 it is not among the frame's temporaries and ___isInternalTempName___
			 drops the spelling besides; the walk above has already found both the
			 name and the value (elements 2 and 3) for the SUGGESTION half, and
			 f_locals wants exactly the same pair.  Without it a ``capture_locals''
			 rendering of a method frame showed every local except the one CPython
			 always shows.  Added to the PyDict rather than to ``locals'', which
			 the suggestion half below reads and already contributes rcvrName to
			 on its own."
			| fl |
			fl := PyFrame @env0:___pyDictFrom___: locals.
			(rcvrName @env0:notNil and: [(snapshot @env0:at: 3) @env0:notNil]) ifTrue: [
				[(fl @env0:includesKey: rcvrName @env0:asString) ifFalse: [
					fl @env0:at: rcvrName @env0:asString put: (snapshot @env0:at: 3)]]
					@env0:on: AbstractException do: [:e | e @env0:return: nil]].
			self @env0:dynamicInstVarAt: #'___frameLocals___' put: fl.
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
		"AT MODULE SCOPE THE LOCALS ARE THE SCOPE, not the frame's temporaries --
		 a module body declares only ___curPos___ -- so the walk above finds
		 nothing to suggest from.  For a real module the names come back later
		 through f_globals, which PyFrame resolves from co_filename; an
		 exec()/eval() body has no module to resolve, so its scope has to be read
		 while it is still running.  builtins publishes it for exactly that
		 window.  Guarded like everything else here: a suggestion is a courtesy.

		 A DOIT'S FRAME HAS NO NAME -- it is a compiled doit, and a doit has no
		 selector -- so the test admits nil as well as '<module>'.  Both are
		 narrow enough: the scope is only published while an exec/eval body is
		 running, and a function CALLED by that body lands here under its own
		 name, where its own temporaries are the right answer.

		 Until module bodies carried a ___curPos___ the innermost Python frame
		 found here was the eval()'s CALLER, whose temporaries happened to
		 include what the eval could see -- which is what made
		 test_name_error_suggestions_with_non_string_candidates pass by
		 accident.  Now the frame is the eval'd body itself, as it is in
		 CPython, and its locals have to come from the scope."
		(((snapshot @env0:at: 4) @env0:isNil)
			or: [(snapshot @env0:at: 4) @env0:= '<module>']) ifTrue: [
			| sc |
			sc := [((Python @env0:at: #builtins) instance) @env1:___grailDoitScope___]
				@env0:on: AbstractException do: [:e | e @env0:return: nil].
			sc @env0:notNil ifTrue: [
				[sc @env0:keysDo: [:k | names @env0:add: k @env0:asString]]
					@env0:on: AbstractException do: [:e | e @env0:return: nil]]].
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

]

{ #category : 'Grail-Initialization' }
BaseException >> ___init__: positional kw: kwargs [
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

]

{ #category : 'Grail-Initialization' }
BaseException >> ___init__: positional kw: kwargs keywords: allowed displayName: aString [
	"The varargs init for the few built-in exceptions CPython gives KEYWORD
	attributes: NameError(name=), AttributeError(name=, obj=) and
	ImportError(name=, path=, name_from=).  Each keyword is stored as a dynamic
	instVar under its own Python name -- the idiom ___signalUndefined___: and
	AttributeError >> ___stampContextOn___: already use -- and one NOT passed is
	stored as None, because CPython's attribute exists and is None
	(``NameError().name is None'').  Absent, the read was an AttributeError.

	The keywords never reach ``args'': ``ImportError('m', name='n').args'' is
	('m',), measured.  An unknown keyword is CPython's TypeError, naming the
	class that DEFINES the init -- aString -- which is why a
	ModuleNotFoundError reports ``ImportError()''."

	kwargs @env0:notNil ifTrue: [
		kwargs @env0:keysDo: [:k |
			(allowed @env0:includes: k @env0:asString) ifFalse: [
				^ TypeError ___signal___: (aString @env0:, '() got an unexpected keyword argument '''
					@env0:, k @env0:asString @env0:, '''')]]].
	self ___args___: (positional isNil ifTrue: [#()] ifFalse: [positional @env0:asArray]).
	allowed @env0:do: [:k |
		self @env0:dynamicInstVarAt: k @env0:asSymbol put:
			((kwargs @env0:notNil and: [kwargs @env0:includesKey: k])
				ifTrue: [kwargs @env0:at: k]
				ifFalse: [None])].
	^ None

]

{ #category : 'Grail-Attribute Access' }
BaseException >> ___memberAttributeNames___ [
	"The attributes CPython implements as plain object MEMBERS of this
	exception's type: they accept any value, and ``del'' resets them to None
	rather than removing them (3.14.8 test_exceptions test_object_attributes).
	Grail deleted the stored value, which raised AttributeError on the next
	read or exposed a computed fallback (SystemExit.code from args).  The
	numeric members (UnicodeError start/end) are not here: CPython refuses to
	delete those."

	(self @env0:isKindOf: SyntaxError) ifTrue: [
		^ #(#msg #filename #lineno #offset #text #end_lineno #end_offset
			#print_file_and_line #'_metadata')].
	(self @env0:isKindOf: ImportError) ifTrue: [^ #(#msg #name #path #name_from)].
	(self @env0:isKindOf: AttributeError) ifTrue: [^ #(#name #obj)].
	(self @env0:isKindOf: NameError) ifTrue: [^ #(#name)].
	(self @env0:isKindOf: OSError) ifTrue: [^ #(#errno #strerror #filename #filename2)].
	(self @env0:isKindOf: UnicodeError) ifTrue: [^ #(#encoding #object #reason)].
	(self @env0:isKindOf: SystemExit) ifTrue: [^ #(#code)].
	(self @env0:isKindOf: StopIteration) ifTrue: [^ #(#value)].
	^ #()

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> ___pyAttrDelete___: aName [
	"The chaining attributes always exist, so CPython refuses to delete them
	-- with a TypeError, not the AttributeError a missing attribute gets.
	Grail let ``del e.__cause__'' remove the misplaced attribute the store
	used to create.  ``args'' is refused the same way."

	| n |
	(aName @env0:size @env0:= 4 and: [aName @env0:asString @env0:= 'args'])
		ifTrue: [^ TypeError ___signal___: 'args may not be deleted'].
	((self ___memberAttributeNames___) @env0:includes: aName @env0:asString @env0:asSymbol)
		ifTrue: [
			self @env1:___pyAttrStore___: aName put: None.
			^ None].
	(aName @env0:size @env0:between: 9 and: 20) ifFalse: [
		^ super ___pyAttrDelete___: aName].
	n := aName @env0:asString.
	((n @env0:= '__cause__' or: [n @env0:= '__context__'])
		or: [n @env0:= '__traceback__']) ifTrue: [
			^ TypeError ___signal___: n @env0:, ' may not be deleted'].
	n @env0:= '__suppress_context__' ifTrue: [
		^ TypeError ___signal___: 'can''t delete numeric/char attribute'].
	^ super ___pyAttrDelete___: aName

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> ___pyAttrStore___: aName put: aValue [
	"``e.__cause__ = x'', ``e.__context__ = x'' and ``e.__suppress_context__ =
	b'' are getset descriptors in CPython, not instance attributes.  Grail
	stored them as ordinary attributes named after the dunder, so they lived
	in a DIFFERENT slot from the one ``raise X from Y'' writes (___cause___ and
	friends): a Python read happened to find the attribute, but
	pythonExceptionChain did not, nothing was validated, and assigning the
	cause left __suppress_context__ False where CPython sets it -- so

	    e.__cause__ = x; e.__cause__ = None

	showed the implicit context again that CPython keeps suppressed.  Route the
	three to their slots with CPython's checks.  The size test keeps every
	other store on an exception at one compare.

	``e.args = x'' is a getset too: CPython's setter stores tuple(x), and
	every reader -- str(), repr(), an ExceptionGroup's repr -- sees the new
	value.  Grail stored an ordinary attribute named ``args'', which a Python
	read found but str() and repr() did not, so ``e.args = (2,); str(e)''
	still said the constructor's argument, a list stayed a list, and a
	non-iterable was accepted.  The slot is set directly, not through
	___args___:, because CPython's setter only replaces args: an OSError
	keeps its errno and a SyntaxError its lineno, where ___args___: would
	parse them again.

	``e.__traceback__ = tb'' is a getset the same way, and it is the one
	contextlib's __exit__ uses to hand the with statement back the exception
	as it arrived.  Stored as an ordinary attribute it SHADOWED the slot:
	every later read answered the stored chain, whatever frames the next
	raise and catch added to ``tracebackObj'' -- so the frame of the function
	that finally caught it was missing (#1539).  It stores the slot and clears
	with_traceback:'s prepend mark rather than setting it: what CPython does
	next depends on the RAISE, not on the store -- ``raise e'' adds its own
	frame, and marks the exception itself on the way (___pyRaise___:cause:),
	while a bare ``raise'' in the same function adds nothing.  For that bare
	``raise'' the head being REPLACED is recorded too: it names the function
	whose handler is running, which is where the re-raise is, and the next
	catch keeps the assigned chain under it (___pushCatchingFrameWork___)."

	| n |
	(aName @env0:size @env0:= 4 and: [aName @env0:asString @env0:= 'args'])
		ifTrue: [
			args := tuple __new__: aValue.
			^ aValue].
	(aName @env0:size @env0:between: 9 and: 20) ifFalse: [
		^ super ___pyAttrStore___: aName put: aValue].
	n := aName @env0:asString.
	n @env0:= '__cause__' ifTrue: [
		self ___requireChainLink___: aValue role: 'cause'.
		self @env0:dynamicInstVarAt: #'___cause___'
			put: (aValue == None ifTrue: [nil] ifFalse: [aValue]).
		self @env0:dynamicInstVarAt: #'___suppressContext___' put: true.
		^ aValue].
	n @env0:= '__context__' ifTrue: [
		self ___requireChainLink___: aValue role: 'context'.
		self @env0:dynamicInstVarAt: #'___context___'
			put: (aValue == None ifTrue: [nil] ifFalse: [aValue]).
		^ aValue].
	n @env0:= '__suppress_context__' ifTrue: [
		(aValue == true or: [aValue == false]) ifFalse: [
			^ TypeError ___signal___: 'attribute value type must be bool'].
		self @env0:dynamicInstVarAt: #'___suppressContext___' put: aValue.
		^ aValue].
	n @env0:= '__traceback__' ifTrue: [
		(aValue == None or: [aValue @env0:isKindOf: PyTraceback]) ifFalse: [
			^ TypeError ___signal___: '__traceback__ must be a traceback or None'].
		self @env0:dynamicInstVarAt: #'___tbAssignedOver___' put: self @env0:___headFrameName___.
		tracebackObj := aValue == None ifTrue: [nil] ifFalse: [aValue].
		self @env0:dynamicInstVarAt: #'___tbUserAttached___' put: false.
		^ aValue].
	^ super ___pyAttrStore___: aName put: aValue

]

{ #category : 'Grail-Attribute Access' }
BaseException >> ___pyHiddenStateNames___ [
	"The dynamic instVars that are Grail's own bookkeeping, not Python
	attributes -- the context and cause links, the traceback mark, a
	payload: every one is spelled with Grail's ``___'' prefix.  Computed
	rather than listed, so bookkeeping added later stays out of __dict__
	too.  (The kernel's named instVars -- gsNumber, gsResumable, ... --
	are never in the view, which lists dynamic instVars only.)"

	| pairs names |
	pairs := self @env0:dynamicInstVarPairs.
	names := OrderedCollection @env0:new.
	1 @env0:to: pairs @env0:size by: 2 do: [:i | | n |
		n := pairs @env0:at: i.
		((n isKindOf: CharacterCollection)
			@env0:and: [n @env0:asString @env0:beginsWith: '___'])
				ifTrue: [names @env0:add: n]].
	^ names @env0:asArray

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> ___rawContext___ [
	"The ___context___ slot as STORED -- nil when unset, where __context__
	answers the None singleton.  The chain walks need to tell ``no context'' from
	``a context that happens to be None''."

	^ ([self @env0:dynamicInstVarAt: #'___context___']
		@env0:on: AbstractException do: [:e | nil])

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> ___requireChainLink___: aValue role: aString [
	"CPython accepts only None or an exception INSTANCE as a cause or context
	-- a class is refused here, unlike ``raise X from Cls'', which instantiates
	it."

	(aValue == None or: [aValue @env0:isKindOf: BaseException]) ifFalse: [
		^ TypeError ___signal___: 'exception ' @env0:, aString
			@env0:, ' must be None or derive from BaseException']

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> ___setCause___: aCause context: aContext [
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

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> ___signal___: message [
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
	(BaseException @env0:___handledException___) isNil ifFalse: [
		self ___applyImplicitContext___].
	self ___captureFrameLocalsIfSuggestible___.
	^ self @env0:signal: message

]

{ #category : 'Grail-Chaining' }
BaseException >> ___unlinkFromContextChainOf___: anException [

	"CPython's _PyErr_SetObject (Python/errors.c:203), before it chains the
	receiver to anException: walk anException's context chain and, if the
	receiver is on it, clear the link that points at the receiver, so the new
	link makes no cycle.

	A cycle ALREADY in the chain ends the walk, found as CPython finds it, with
	Floyd's tortoise and hare: by the time the hare meets the tortoise every
	exception on the loop has been checked.  Without it the walk never ended --
	``ex.__context__ = ex'' and then any raise inside ex's handler hung the
	session (test_exceptions test_no_hang_on_context_chain_cycle1)."

	| hare tortoise tortoiseMoves next |

	hare := anException.
	tortoise := anException.
	tortoiseMoves := false.
	[(next := hare ___rawContext___) isNil] whileFalse: [
		next == self ifTrue: [
			hare @env0:dynamicInstVarAt: #'___context___' put: nil.
			^ self].
		hare := next.
		hare == tortoise ifTrue: [^ self].
		tortoiseMoves ifTrue: [tortoise := tortoise ___rawContext___].
		tortoiseMoves := tortoiseMoves not].
	^ self

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> __cause__ [
	"The exception that DIRECTLY caused this one -- CPython's ``raise X from Y''.
	Stored in the ___cause___ dynamic instVar, read with the same absent-tolerant
	probe __context__ uses (an unset dynamic instVar reads back as ABSENT, which
	raises rather than answering nil).  Unset -> None, CPython's default.

	Written by ___setCause___:context:, which ``raise X from Y'' reaches, and by
	an assignment ``e.__cause__ = x'' (___pyAttrStore___:put:)."

	^ ([self @env0:dynamicInstVarAt: #'___cause___']
		@env0:on: AbstractException do: [:e | nil]) ifNil: [None]

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> __context__ [
	"Return the exception context: the exception that was being handled when this
	one was raised.  Set implicitly on every raise inside an ``except'' block
	(___applyImplicitContext___), and explicitly by ``raise X from Y'' and by code
	that constructs a derived exception (e.g. Enum value-lookup when a _missing_
	hook returns a bad value or raises).  Unset -> None (CPython default)."

	^ ([self @env0:dynamicInstVarAt: #'___context___']
		@env0:on: AbstractException do: [:e | nil]) ifNil: [None]

]

{ #category : 'Grail-Attribute Access' }
BaseException >> __dict__ [
	"``e.__dict__'' -- the live view of the exception's Python attributes,
	as for any instance.  Exceptions had none: the read raised
	AttributeError, and a class that also defines __getattr__ recursed
	forever, because CPython code reaches for __dict__ precisely INSIDE
	__getattr__.  urllib.error.HTTPError is such a class -- it inherits
	tempfile._TemporaryFileWrapper, whose __getattr__ begins
	``file = self.__dict__['file']'' -- so every HTTPError read died of
	RecursionError (test_urllib2_localnet test_404)."

	^ PyInstanceDict @env0:on: self

]

{ #category : 'Grail-Initialization' }
BaseException >> __init__ [
	"Initialize with no arguments."

	self ___args___: #().
	^ None

]

{ #category : 'Grail-Initialization' }
BaseException >> __init__: a [
	"Initialize with ONE positional constructor argument ``a''.  CPython's
	``BaseException.__init__(self, *args)'' sets ``self.args = args'', so a
	single argument yields the 1-tuple ``(a,)'' -- e.g. ``RuntimeError(42).args
	== (42,)''.  (Smalltalk nil, the no-arg sentinel, yields the empty tuple.)"

	a ifNil: [ self ___args___: #() ] ifNotNil: [ self ___args___: { a } ].
	^ None

]

{ #category : 'Grail-Exception Methods' }
BaseException >> __notes__ [
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

]

{ #category : 'Grail-String Representation' }
BaseException >> __repr__ [
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

]

{ #category : 'Grail-Serialization' }
BaseException >> __setstate__: state [
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

]

{ #category : 'Grail-String Representation' }
BaseException >> __str__ [
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

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> __suppress_context__ [
	"Whether a traceback should suppress the implicit context.  CPython sets this
	as a SIDE EFFECT of assigning __cause__ (``raise X from Y''), which is what
	makes the traceback read ``The above exception was the direct cause of...''
	rather than ``During handling of the above exception...''.  Stored separately
	from ___cause___ so ``raise X from None'' -- suppress with NO cause -- is
	representable.  Unset -> false."

	^ ([self @env0:dynamicInstVarAt: #'___suppressContext___']
		@env0:on: AbstractException do: [:e | nil]) == true

]

{ #category : 'Grail-Exception Chaining' }
BaseException >> __traceback__ [
	"Return the traceback object (a PyTraceback linked list) for this
	exception, or None when none has been attached.  ``#'__traceback__''
	is in ___pythonValueAttrs___ so ___pyAttrLoad___ returns THIS value
	rather than BoundMethod-wrapping the selector."

	^ tracebackObj ifNil: [ None ]

]

{ #category : 'Grail-Exception Methods' }
BaseException >> add_note: note [
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

]

{ #category : 'Grail-Attribute Access' }
BaseException >> args [
	"Return the tuple of arguments passed to the exception (CPython
	``BaseException.args'', always a tuple)."

	^ args ifNil: [ tuple @env0:withAll: #() ]

]

{ #category : 'Grail-Exception Methods' }
BaseException >> with_traceback: tb [
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

]
