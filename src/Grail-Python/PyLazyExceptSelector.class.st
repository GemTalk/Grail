"Defers an ``except <expr>:' target until an exception is actually raised.

``block' evaluates the (already validated) handler expression; the result
is memoised in ``selector' so re-entering the same handler search does not
re-run a side-effecting expression.  Instances are produced by TryAst's
code generation and are never seen by Python code."
Class {
	#name : 'PyLazyExceptSelector',
	#superclass : 'Object',
	#instVars : [
		'block',
		'selector',
		'evaluated',
		'shieldAbove',
		'shieldToken'
	],
	#category : 'Grail-Runtime'
}

{ #category : 'Grail-Private' }
PyLazyExceptSelector class >> on: aBlock [
	"aBlock answers the handler target (an exception class or ExceptionSet),
	already passed through BaseException class >> ___pyExceptType___:."

	^ self new _setBlock: aBlock

]

{ #category : 'Grail-Private' }
PyLazyExceptSelector class >> on: aBlock shieldedAbove: aDepth [
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

]

{ #category : 'Grail-Private' }
PyLazyExceptSelector class >> on: aBlock shieldedFor: aToken [
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

]

{ #category : 'Grail-Private' }
PyLazyExceptSelector >> _selector [
	"Evaluate the handler expression once, on first use."

	evaluated ifTrue: [^ selector].
	selector := block value.
	evaluated := true.
	^ selector

]

{ #category : 'Grail-Private' }
PyLazyExceptSelector >> _setBlock: aBlock [
	block := aBlock.
	evaluated := false.
	^ self

]

{ #category : 'Grail-Private' }
PyLazyExceptSelector >> _setBlock: aBlock shieldAbove: aDepth [
	block := aBlock.
	evaluated := false.
	shieldAbove := aDepth.
	^ self

]

{ #category : 'Grail-Private' }
PyLazyExceptSelector >> _setBlock: aBlock shieldFor: aToken [
	block := aBlock.
	evaluated := false.
	shieldToken := aToken.
	^ self

]

{ #category : 'Grail-Exception Selector' }
PyLazyExceptSelector >> handles: anException [
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

]
