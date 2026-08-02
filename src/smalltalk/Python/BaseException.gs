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

	| instance |
	instance := self ___new___.
	instance ___args___: positional.
	(self @env0:___hasUserInit___) ifTrue: [
		(instance ___pyAttrLoad___: #'__init__') value: positional value: kwargs
	].
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
	"Return the exception that was the direct cause of this exception.
	Set via 'raise ... from ...' syntax."

	^ None  "TODO: implement exception chaining"
%

category: 'Grail-Exception Chaining'
method: BaseException
__context__
	"Return the exception context (the exception that was being handled
	when this exception was raised)."

	^ None  "TODO: implement exception context"
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
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	
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
		^ ((argsArray @env0:at: 1) @env0:asString) @env0:asUnicodeString
	].
	^ (argsArray @env0:asString) @env0:asUnicodeString
%

category: 'Grail-Exception Chaining'
method: BaseException
__suppress_context__
	"Return whether to suppress the exception context in tracebacks."

	^ false  "TODO: implement context suppression"
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
	needed; created lazily on the first note."

	| notes |
	(note isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: 'add_note() argument must be a str, not '
			@env0:, note @env0:class @env0:name @env0:asString].
	notes := self @env0:dynamicInstVarAt: #'___pyNotes___'.
	notes isNil ifTrue: [
		notes := list ___new___.
		self @env0:dynamicInstVarAt: #'___pyNotes___' put: notes].
	notes append: note.
	^ None
%

category: 'Grail-Exception Methods'
method: BaseException
__notes__
	"PEP 678 list of notes attached via add_note.  CPython leaves ``__notes__''
	ABSENT until the first add_note (accessing it raises AttributeError), so
	mirror that rather than fabricating an empty list."

	| notes |
	notes := self @env0:dynamicInstVarAt: #'___pyNotes___'.
	notes isNil ifTrue: [
		^ AttributeError ___signal___: '''' @env0:, self @env0:class @env0:name @env0:asString
			@env0:, ''' object has no attribute ''__notes__'''].
	^ notes
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
___pushFrameFromPos___: aCode pos: posArray
	"Prepend a frame for aCode at posArray = { beginLine. beginColumn. endLine.
	endColumn. sourceLine } -- the enclosing function's ___curPos___, snapshotted
	as an exception unwinds THROUGH the function's body wrapper.  A nil posArray
	(no statement ran yet) is a no-op, as are control-flow / StopIteration (via
	___pushTracebackFrame___)."

	posArray isNil ifTrue: [^ self].
	^ self ___pushTracebackFrame___: aCode
		lineno: (posArray at: 1)
		colno: (posArray at: 2)
		endLineno: ((posArray at: 3) ifNil: [posArray at: 1])
		endColno: (posArray at: 4)
		line: (posArray at: 5)
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
