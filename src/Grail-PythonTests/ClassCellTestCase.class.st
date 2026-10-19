Class {
	#name : 'ClassCellTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassCellTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ClassCellTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_cell' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_cell.py')
		name: 'class_cell'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - When it appears' }
ClassCellTestCase >> testCellForABareClassReference [
	"``def f(self): return __class__''."

	self assert: (self at: 'present_for_name') equals: true.

]

{ #category : 'Grail-Tests - When it appears' }
ClassCellTestCase >> testCellForExplicitSuperToo [
	"``super(C, self)'' gets one as well, which is NOT what this test case
	first claimed.  CPython's symbol table creates the implicit __class__ cell
	for any method referencing the NAME ``super'', without waiting to see the
	zero-argument form; the fixture asserted the opposite and real CPython
	corrected it."

	self assert: (self at: 'present_for_explicit_super') equals: true.

]

{ #category : 'Grail-Tests - When it appears' }
ClassCellTestCase >> testCellForZeroArgSuper [
	"``super()'' needs the class, so the cell comes with it."

	self assert: (self at: 'present_for_zero_arg_super') equals: true.

]

{ #category : 'Grail-Tests - Lifecycle' }
ClassCellTestCase >> testClassResolutionIsUnaffected [
	"Grail resolves ``__class__'' lexically and does not read this cell, so the
	whole feature must be observable without changing what __class__ answers."

	self assert: (self at: 'class_still_resolves') equals: true.

]

{ #category : 'Grail-Tests - Refusals' }
ClassCellTestCase >> testDroppingIsHarmlessForAClassThatNeverAsked [
	"The SAME popping metaclass over a body with no class reference is fine --
	there was no cell to lose.  This is what keeps the RuntimeError specific to
	a real breach instead of firing on any metaclass that tidies its namespace."

	self assert: (self at: 'drop_harmless_without_ref') @env0:asString
		equals: '5'.

]

{ #category : 'Grail-Tests - Refusals' }
ClassCellTestCase >> testDroppingTheCellIsARuntimeError [
	"A metaclass that pops the entry has broken the contract: the class it
	returns would have a dead ``__class__''.  CPython names the class and asks
	whether __classcell__ was propagated to type.__new__."

	self assert: (self at: 'drop_rejected') @env0:asString equals: 'RuntimeError'.

]

{ #category : 'Grail-Tests - When it appears' }
ClassCellTestCase >> testNoCellWhenNoMethodAsksForTheClass [
	"CPython omits the entry entirely for a body whose methods never reference
	the class.  Asserted as firmly as the presence cases -- injecting one
	unconditionally would be just as wrong, and a metaclass can see it."

	self assert: (self at: 'omitted_when_unused') equals: false.

]

{ #category : 'Grail-Tests - Refusals' }
ClassCellTestCase >> testPointingAFilledCellAtASecondClassIsATypeError [
	"A metaclass builds ANOTHER class from the namespace it was handed, whose
	cell is by then filled with the first.  Re-pointing it would leave the
	first class's methods reading the second.

	This is what made the three-argument ``type(name, bases, ns)'' builder have
	to care: it is the same constructor, reached by a different road, and the
	check had to be shared rather than living only on the class-statement path."

	self assert: (self at: 'second_class_rejected') @env0:asString
		equals: 'TypeError'.

]

{ #category : 'Grail-Tests - Refusals' }
ClassCellTestCase >> testReplacingTheCellWithANonCellIsATypeError [
	"``ns['__classcell__'] = 'not a cell'''."

	self assert: (self at: 'replace_rejected') @env0:asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests - Lifecycle' }
ClassCellTestCase >> testTheCellArrivesEmptyAndIsFilledWithTheClass [
	"The ordering the protocol exists to express: the metaclass sees the cell
	BEFORE the class exists, and type.__new__ fills it as the class comes into
	being.  An unset cell raises ValueError rather than answering None, which
	needed an explicit filled flag -- a nil test cannot tell the two apart."

	self assert: (self at: 'empty_on_arrival') @env0:asString equals: 'ValueError'.
	self assert: (self at: 'filled_with_class') equals: true.

]

{ #category : 'Grail-Tests - Lifecycle' }
ClassCellTestCase >> testTheCellIsProtocolNotAClassAttribute [
	"CPython CONSUMES __classcell__ in type.__new__.  Copying it across with
	the rest of the namespace would leave a stray attribute on every class
	whose methods mention __class__."

	self assert: (self at: 'not_a_class_attr') equals: false.

]
