Class {
	#name : 'ClassBodyDefAsPlainFunctionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyDefAsPlainFunctionTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Private' }
ClassBodyDefAsPlainFunctionTestCase >> at: aKey item: anIndex [
	^ (probe @env1:__getitem__: aKey) @env1:__getitem__: anIndex

]

{ #category : 'Grail-Running' }
ClassBodyDefAsPlainFunctionTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_def_as_plain_function' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/class_body_def_as_plain_function.py')
		name: 'class_body_def_as_plain_function'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testABuiltinTypesMethodStillRefuses [
	"The gate, and the reason the recompile is not applied to every special
	receiver.  ``bytes.hex(1)'' is a DESCRIPTOR call in CPython and raises
	TypeError; making it run would trade one divergence for another, in a place
	test_bytes checks."

	| refusals |
	refusals := self at: 'builtin_descriptor_still_refuses'.
	1 to: 3 do: [:i |
		self assert: (refusals @env1:__getitem__: i - 1) equals: 'TypeError'].

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testAClassBodyCallsItsOwnDefWithAnInt [
	"The shape the whole change is about.  ``helper(3)'' in the class body used
	to raise the descriptor TypeError, because 3 is a special oop and
	performMethod: would not take it as a receiver."

	self assert: (self at: 'in_body' item: 0) equals: 30.

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testACompTargetShadowingTheReceiverParameter [
	"The second half, and the one that produced no answer at all rather than a
	wrong one: the def's own body would not compile, so calling it raised
	``Grail could not compile this method (codegen gap)''.

	Both readings are asserted together because the fix has to keep them apart.
	CPython restores the parameter after an inlined comprehension, so the
	trailing read answers the ARGUMENT (2) while the lambdas closing over the
	comprehension's target answer its last value (1) -- and the first clause's
	iterable, ``range(x)'', is evaluated in the enclosing scope, which is what
	makes the loop run twice at all."

	self assert: (self at: 'shadowing_comprehension' item: 1) equals: 2.
	self
		assert: ((self at: 'shadowing_comprehension' item: 0) @env1:__getitem__: 0)
		equals: 1.
	self
		assert: ((self at: 'shadowing_comprehension' item: 0) @env1:__getitem__: 1)
		equals: 1.

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testOverThreeArgumentsNowRuns [
	"WAS a recorded divergence, and is now fixed -- kept here, renamed,
	because the boundary moving is worth a test rather than a deletion.

	The note said: above three arguments after self,
	_resolveMethodNargs:kwOk:from: builds no fixed-arity selector, so the
	packed ``_name:kw:'' wrapper is what resolves; that wrapper re-dispatches
	VIRTUALLY, which a substituted special receiver cannot follow, and it
	concluded that only recompiling the whole chain could fix it.

	That turned out not to be the fix.  The resolver's selector table simply
	stopped at three arguments and answered nil above it -- so the fixed form
	was never looked for, not absent.  Generating the selector for any arity
	finds it, and it is performed DIRECTLY, so the wrapper and its virtual
	re-send are never reached.

	CPython answers (1, 2, 3, 4, 5), and so does this now."

	| t |
	t := self at: 'wide_signature'.
	1 to: 5 do: [:i |
		self assert: (t @env1:__getitem__: i - 1) equals: i].

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testTheBodysOwnErrorsAreStillItsOwn [
	"A substituted receiver the BODY cannot use must raise the body's error, not
	the dispatcher's: ``self + 1'' on None is a TypeError about ``+'', which
	only happens if the method actually ran."

	self assert: (self at: 'body_errors_are_the_body_s') equals: 'TypeError'.

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testTheOtherSpecialsWorkToo [
	"SmallInteger is not the only special: a Boolean and a SmallDouble reach the
	same primitive the same way, and True is an int in Python (10, not an
	error)."

	self assert: (self at: 'in_body' item: 1) equals: 10.
	self assert: (self at: 'in_body' item: 2) equals: 15.0.
	"``None'' and not ``nil'': Python's None is Grail's None singleton, and
	asserting nil here is what made this test fail on its first run."
	self assert: (self at: 'outside_none' item: 0) equals: None.
	self assert: (self at: 'outside_char' item: 0) equals: 'c'.

]

{ #category : 'Grail-Tests' }
ClassBodyDefAsPlainFunctionTestCase >> testTheSameCallFromOutsideTheClass [
	"``Cls.method(2, ...)'' is the same substitution reached from outside the
	body, over every fixed arity Grail resolves a selector for: nothing, one,
	two and three arguments after self."

	self assert: (self at: 'outside' item: 0) equals: 6.
	self assert: ((self at: 'outside' item: 1) @env1:__getitem__: 1) equals: 'x'.
	self assert: ((self at: 'outside' item: 2) @env1:__getitem__: 2) equals: 'y'.
	self assert: ((self at: 'outside' item: 3) @env1:__getitem__: 3) equals: 'z'.

]
