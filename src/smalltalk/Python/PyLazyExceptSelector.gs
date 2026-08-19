! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- PyLazyExceptSelector — deferred ``except <expr>:'' target
!
! Python evaluates the expression in an ``except <expr>:'' clause ONLY when
! an exception reaches that handler.  Smalltalk's ``on:do:'' evaluates its
! ``on:'' ARGUMENT when the handler is installed, i.e. before the protected
! block runs, so a direct translation evaluates the expression even when
! nothing is raised.  That is observable:
!
!     try:
!         x = 1                      # raises nothing
!     except json.decoder.JSONDecodeError:
!         pass
!
! is fine in CPython even when ``json.decoder'' does not exist, because the
! handler expression is never reached.  Grail used to fail this on the
! SUCCESS path with AttributeError.
!
! ``on:do:'' only sends #handles: to its argument while searching for a
! handler for an exception that has actually been signalled.  So an object
! that computes the real selector inside #handles: gives exactly Python's
! timing: never evaluated when the body completes normally, and evaluated
! in handler order (innermost first) when it does raise.

expectvalue /Class
doit
Object subclass: 'PyLazyExceptSelector'
  instVarNames: #( block selector evaluated shieldAbove shieldToken )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyLazyExceptSelector comment:
'Defers an ``except <expr>:'' target until an exception is actually raised.

``block'' evaluates the (already validated) handler expression; the result
is memoised in ``selector'' so re-entering the same handler search does not
re-run a side-effecting expression.  Instances are produced by TryAst''s
code generation and are never seen by Python code.'
%

expectvalue /Class
doit
PyLazyExceptSelector category: 'Grail-Runtime'
%

expectvalue /Metaclass3
doit
PyLazyExceptSelector removeAllMethods: 0.
PyLazyExceptSelector removeAllMethods: 1.
PyLazyExceptSelector class removeAllMethods: 0.
PyLazyExceptSelector class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
classmethod: PyLazyExceptSelector
on: aBlock shieldedFor: aToken
	"As on:, plus the TRY ACTIVATION this clause belongs to.

	Python's except clauses are alternatives for the try BODY only, so an
	exception raised inside one clause's handler must not be caught by a later
	clause of the same try.  They compile to nested protected blocks, where the
	later handlers' on:do: enclose the earlier handlers' bodies, so the shield
	has to say no explicitly.

	The token identifies the try ACTIVATION -- a fresh object each time the try
	is entered, shared by that try's clauses through a block temp.  See
	BaseException >> ___handlerTokenActive___: for why identity, and why per
	activation rather than per try site."

	^ self @env0:new _setBlock: aBlock shieldFor: aToken
%

category: 'Grail-Private'
classmethod: PyLazyExceptSelector
on: aBlock shieldedAbove: aDepth
	"As on:, plus the handler depth at which this selector was INSTALLED.  It
	handles nothing once the depth has risen above that.

	This is what stops an exception raised in one ``except'' handler from being
	caught by a LATER handler of the same try.  Python's except clauses are
	alternatives for the try BODY only; they compile to nested protected blocks,
	so the later handlers' on:do: enclose the earlier handlers' bodies.

	A DEPTH rather than a flag, and captured at install time rather than read
	from a shared place, because that is what makes nesting come out right: a try
	inside a handler installs its selectors at the raised depth, so its own
	handlers still catch from its own body while the enclosing try's later
	handlers stay shielded.  Two earlier designs failed here -- moving handler
	bodies outside the on:do: makes a bare ``raise'' impossible (GemStone will not
	re-signal an unwound exception), and a per-statement flag in an enclosing
	block costs a stack frame per try, which turned test_richcmp's
	test_recursion into a RecursionError.  An integer in the selector costs
	neither."

	^ self new _setBlock: aBlock shieldAbove: aDepth
%

category: 'Grail-Private'
classmethod: PyLazyExceptSelector
on: aBlock
	"aBlock answers the handler target (an exception class or ExceptionSet),
	already passed through BaseException class >> ___pyExceptType___:."

	^ self new _setBlock: aBlock
%

category: 'Grail-Private'
method: PyLazyExceptSelector
_setBlock: aBlock
	block := aBlock.
	evaluated := false.
	^ self
%

category: 'Grail-Private'
method: PyLazyExceptSelector
_setBlock: aBlock shieldFor: aToken
	block := aBlock.
	evaluated := false.
	shieldToken := aToken.
	^ self
%

category: 'Grail-Private'
method: PyLazyExceptSelector
_setBlock: aBlock shieldAbove: aDepth
	block := aBlock.
	evaluated := false.
	shieldAbove := aDepth.
	^ self
%

category: 'Grail-Private'
method: PyLazyExceptSelector
_selector
	"Evaluate the handler expression once, on first use."

	evaluated ifTrue: [^ selector].
	selector := block value.
	evaluated := true.
	^ selector
%

category: 'Grail-Exception Selector'
method: PyLazyExceptSelector
handles: anException
	"Sent by on:do: only while searching for a handler for a signalled
	exception -- which is precisely when Python evaluates the clause."

	"Shielded: a handler body of THIS SAME TRY is running, so this clause is not
	an alternative for what that handler raised -- Python's except clauses are
	alternatives for the try BODY only.

	Keyed to the try ACTIVATION (shieldToken), not to a global handler depth.
	The depth test this replaces could not tell my own handler from a handler in
	a function my body merely CALLED: both raise the depth, so an exception
	raised inside a callee's except clause was shielded from my later clauses and
	escaped uncaught, where CPython catches it.  ___handlerTokenActive___: asks
	the question the shield actually means."
	(shieldToken notNil
		and: [BaseException ___handlerTokenActive___: shieldToken]) ifTrue: [^ false].
	"The depth form is kept for any selector still built the old way."
	(shieldAbove notNil
		and: [BaseException ___handlerDepth___ > shieldAbove]) ifTrue: [^ false].
	^ self _selector handles: anException
%
