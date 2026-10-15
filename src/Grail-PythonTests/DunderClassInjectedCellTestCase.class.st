Class {
	#name : 'DunderClassInjectedCellTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DunderClassInjectedCellTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
DunderClassInjectedCellTestCase >> listAt: aKey [
	"The fixture's entries are Python lists; compare them as Smalltalk Arrays so
	a failure prints both sides."

	| v out |
	v := probe @env1:__getitem__: aKey.
	out := OrderedCollection new.
	1 to: (v @env1:__len__) do: [:i | out add: (v @env1:__getitem__: i - 1)].
	^ out asArray

]

{ #category : 'Grail-Setup' }
DunderClassInjectedCellTestCase >> setUp [
	probe := self ___loadProbe___: 'dunder_class_injected_cell'.

]

{ #category : 'Grail-Tests' }
DunderClassInjectedCellTestCase >> testACapturedLocalIsNotAClassAndMustNotBeTreatedAsOne [
	"THE GUARD on keeping this a separate entry point.  A method reading an
	enclosing function's local goes through the same closure-cell lookup, and such
	a value is routinely not a class -- an int, a string, None.  Folding the
	recovery into ___classCell___ would have consulted a class cell for every one
	of them, which is wrong rather than merely wasteful, and ``None'' is the value
	that would have hidden it: indistinguishable from the failure the recovery
	exists to repair."

	| vals |
	vals := self listAt: 'captured_local'.
	self assert: vals size equals: 3.
	self assert: (vals at: 1) equals: 42.
	self assert: (vals at: 2) @env0:asString equals: 'text'.
	"Python ``None'', which is a real object here and NOT Smalltalk nil -- the
	distinction is the whole point of this test."
	self assert: (vals at: 3) @env1:__repr__ @env0:asString equals: 'None'.

]

{ #category : 'Grail-Tests' }
DunderClassInjectedCellTestCase >> testADelayedClassReadsTheCellNotTheNameBinding [
	"THE HEADLINE.  ``A is None'' is the metaclass's answer and must stand; the
	cell is a different thing and holds B.  All three are asserted together
	because the first two are what make the third meaningful -- a run where the
	metaclass silently built a class after all would pass the third alone."

	self assert: (self listAt: 'delayed_class') equals: #( true true true ).

]

{ #category : 'Grail-Tests' }
DunderClassInjectedCellTestCase >> testAnOrdinaryClassStillAnswersItself [
	"THE CONTROL, and the reason the fallback is conditional.  A metaclass that
	DOES build its class, a class with no metaclass, and an inherited method on a
	SUBCLASS instance -- the last because ``__class__'' is the class the method
	was DEFINED in, not type(self), and a fallback that reached for type(self)
	would pass the other two and fail this one."

	self assert: (self listAt: 'ordinary_class_is_unaffected')
		equals: #( true true true ).

]

{ #category : 'Grail-Tests' }
DunderClassInjectedCellTestCase >> testTheInjectedCellIsEmptyUntilTypeFillsIt [
	"The mechanism, checked rather than assumed.  CPython distinguishes an EMPTY
	cell from one holding None -- ``cell_contents'' on an unset cell raises
	ValueError -- and the metaclass here never called type.__new__, so the cell it
	was handed is still empty when it returns.  The three-argument type() is what
	fills it."

	self assert: (self listAt: 'cell_is_empty_until_type_fills_it')
		equals: (Array with: 'ValueError' with: true).

]

{ #category : 'Grail-Tests' }
DunderClassInjectedCellTestCase >> testZeroArgSuperStillReadsTheSameCell [
	"``super()'' reaches the cell through its own entry point
	(___classCellForSuper___), which now shares the recovery, so a cooperative
	chain has to keep working."

	self assert: (probe @env1:__getitem__: 'zero_arg_super_still_works') @env0:asString
		equals: 'Derived+Base'.

]
