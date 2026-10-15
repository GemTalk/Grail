Class {
	#name : 'MethodOverrideArityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodOverrideArityTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
MethodOverrideArityTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'method_override_arity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/method_override_arity.py')
		name: 'method_override_arity'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.

]

{ #category : 'Grail-Tests - Guards' }
MethodOverrideArityTestCase >> testAGenuinePropertyPairStillReadsAsAValue [
	"The branch this fix narrows.  A ``@property''/``@prop.setter'' pair is
	declared on ONE class, so its owners match and the pair branch still
	claims it: the read answers the assigned VALUE, not a bound method."

	self assert: (self at: 'prop_read') @env0:asString equals: 'assigned'.
	self assert: (self at: 'prop_not_callable') equals: false.

]

{ #category : 'Grail-Tests - Arity-Changing Override' }
MethodOverrideArityTestCase >> testAnInheritedMethodIsStillReachable [
	"``g'' is inherited, not overridden.  The guard is narrow enough that
	adding it did not disturb ordinary inheritance alongside an override of
	a DIFFERENT name on the same class."

	self assert: (self at: 'inherited') @env0:asString equals: 'base-g:i'.

]

{ #category : 'Grail-Tests - Guards' }
MethodOverrideArityTestCase >> testAnInheritedPropertyPairStillReadsAsAValue [
	"The case that makes ``same owner'' the right test rather than ``declared
	on the receiver's own class'': the pair is inherited intact, so a chain
	walk finds one owner for each spelling and they are the SAME ancestor."

	self assert: (self at: 'prop_inherited') @env0:asString equals: 'initial'.

]

{ #category : 'Grail-Tests - Arity-Changing Override' }
MethodOverrideArityTestCase >> testOverrideAcrossTwoLevels [
	"Three classes, ``f'' widening at each step (0 -> 1 -> 2 params), each
	level delegating up through super().  Every link is an owner mismatch."

	self assert: (self at: 'deep') @env0:asString equals: 'base+a+b'.

]

{ #category : 'Grail-Tests - Arity-Changing Override' }
MethodOverrideArityTestCase >> testOverrideWideningTheParameterCount [
	"``def f(self, extra)'' over an inherited ``def f(self)''.  Before, the
	attribute load answered Base.f's RESULT -- the string 'base' -- and the
	call site raised ``'Unicode7' object is not callable''."

	self assert: (self at: 'widen') @env0:asString equals: 'base+x'.

]

{ #category : 'Grail-Tests - Bound Method' }
MethodOverrideArityTestCase >> testTheOverrideReadsAsABoundMethod [
	"``m = d.f'' then ``m('h')''.  The load has to answer a bound method; it
	used to answer the parent's return value, so the handle was a string."

	self assert: (self at: 'handle') @env0:asString equals: 'base+h'.
	self assert: (self at: 'callable') equals: true.

]

{ #category : 'Grail-Tests - Bound Method' }
MethodOverrideArityTestCase >> testTheOverrideReadsThroughGetattr [
	"getattr() takes the same load path as attribute syntax, so it must
	agree -- a fix that only corrected the compiled send would not."

	self assert: (self at: 'getattr') @env0:asString equals: 'base+ga'.

]

{ #category : 'Grail-Tests - Guards' }
MethodOverrideArityTestCase >> testTheParentsOwnInstanceIsUnaffected [
	"Both overridden names, called on a Base instance.  The override must
	not reach back up and change what the parent's own instances do."

	self assert: (self at: 'base_f') @env0:asString equals: 'base'.
	self assert: (self at: 'base_g') @env0:asString equals: 'base-g:y'.

]
