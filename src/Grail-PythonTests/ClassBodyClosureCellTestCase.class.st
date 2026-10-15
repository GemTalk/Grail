Class {
	#name : 'ClassBodyClosureCellTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyClosureCellTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassBodyClosureCellTestCase >> setUp [
	"Reload tests/python/class_body_closure_cells.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_closure_cells' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_closure_cells.py')
		name: 'class_body_closure_cells'.

]

{ #category : 'Grail-Tests - Existing behaviour preserved' }
ClassBodyClosureCellTestCase >> testCellsStillWorkAfterConstruction [
	"The long-standing case, and BY REFERENCE: a value rebound after the class
	statement is still seen (CPython closure-cell semantics)."

	self assert: (self resultAt: 'after_construction') asString
		equals: 'first/second'.

]

{ #category : 'Grail-Tests - Read during construction' }
ClassBodyClosureCellTestCase >> testEnclosingClassRaisedFromMemberInit [
	"test_enum test_raise_custom_error_on_creation: the free variable is an
	exception CLASS the member __init__ raises."

	self assert: (self resultAt: 'enclosing_class') asString
		equals: 'MyErr raised'.

]

{ #category : 'Grail-Tests - Read during construction' }
ClassBodyClosureCellTestCase >> testEnclosingValueReadFromMemberInit [
	"The plain-value case: __init__ runs while members are built and reads an
	enclosing function local."

	self assert: (self resultAt: 'enclosing_value') equals: 255.

]

{ #category : 'Grail-Tests - Read during construction' }
ClassBodyClosureCellTestCase >> testEnclosingValueReadFromMemberNew [
	"__new__ runs during construction too."

	self assert: (self resultAt: 'enclosing_via_new') equals: 101.

]

{ #category : 'Grail-Tests - Existing behaviour preserved' }
ClassBodyClosureCellTestCase >> testNonlocalWriteCellsStillReachTheEnclosingScope [
	"The setter cells are emitted by the same helper, so they move too."

	self assert: (self resultAt: 'writer') equals: 2.

]

{ #category : 'Grail-Tests - Existing behaviour preserved' }
ClassBodyClosureCellTestCase >> testSelfNameCellHoldsTheDecoratedClass [
	"Why the stores are REPEATED after the decorator loop: a method naming its
	own class must see the decorated object."

	self assert: (self resultAt: 'decorated') asString equals: 'True/True'.

]
