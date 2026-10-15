Class {
	#name : 'ClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassTestCase >> setUp [
	"Load the test module and cache the instance."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_with_classes' ifAbsent: [].
	"The classes live in the PythonModules SymbolDictionary, which is
	dropped and recreated by install.gs; nothing to clean up by hand."
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_with_classes.py')
		name: 'module_with_classes'.

]

{ #category : 'Grail-Tests - Class Creation' }
ClassTestCase >> testCounterClassExists [
	"Test that Counter was bound on the module."

	self assert: (testModule @env1:Counter) notNil.

]

{ #category : 'Grail-Tests - Counter' }
ClassTestCase >> testCounterResult [
	"Test that Counter inc/get works: 3 incs → count = 3."

	self assert: (testModule @env1:c_count) equals: 3.

]

{ #category : 'Grail-Tests - Direct Call' }
ClassTestCase >> testDirectMethodCall [
	"Test calling a method via perform on an instance."

	| p |
	p := testModule dynamicInstVarAt: #p.
	self assert: (p perform: #sum env: 1) equals: 7.

]

{ #category : 'Grail-Tests - Real Methods' }
ClassTestCase >> testInitBindsKeywordArguments [
	"__init__ binds positional, keyword, and mixed arguments by name —
	Point(x=10, y=20) and Point(3, y=4) — and raises TypeError on a
	missing required argument."

	self assert: testModule @env1:init_by_keyword equals: true.
	self assert: testModule @env1:init_mixed_positional_keyword equals: true.
	self assert: testModule @env1:init_missing_arg_raises equals: true

]

{ #category : 'Grail-Tests - Module Loading' }
ClassTestCase >> testModuleLoads [
	"Test that the module with classes loads without error."

	self assert: testModule notNil.

]

{ #category : 'Grail-Tests - Accessors' }
ClassTestCase >> testPointAccessors [
	"Instance attributes read back through the attribute protocol.  Read via
	___pyAttrLoad___: rather than a bare unary ``perform: #x env: 1'': under
	GRAIL_DIRECT_CALLS a bare unary send to a PythonInstance is a Python CALL
	(``p.x()'' -> TypeError for an int), no longer a read."

	| p |
	p := testModule dynamicInstVarAt: #p.
	self assert: (p @env1:___pyAttrLoad___: #x) equals: 3.
	self assert: (p @env1:___pyAttrLoad___: #y) equals: 4.

]

{ #category : 'Grail-Tests - Class Creation' }
ClassTestCase >> testPointClassExists [
	"Test that Point was bound on the module."

	self assert: (testModule @env1:Point) notNil.

]

{ #category : 'Grail-Tests - Instantiation' }
ClassTestCase >> testPointCreatedDuringInit [
	"p = Point(3, 4) creates a Point with x=3, y=4.  Read through the Python
	attribute protocol, not ``dynamicInstVarAt:'': where the value lives (a
	dynamic instVar, or a named slot under GRAIL_INFERRED_SLOTS) is the
	runtime's business, and this test is about the constructor."

	| p |
	p := testModule dynamicInstVarAt: #p.
	self assert: (p @env1:___pyAttrLoad___: #x) equals: 3.
	self assert: (p @env1:___pyAttrLoad___: #y) equals: 4.

]

{ #category : 'Grail-Tests - Real Methods' }
ClassTestCase >> testPointInitIsRealMethod [
	"Test that __init__ is a real env-1 method on Point.  __init__ is
	now compiled to the varargs ``___init__:kw:'' form (rather than a
	fixed-arity ``__init__:_:'') so it can bind keyword arguments — see
	FunctionDefAst >> compilesAsVarargs."

	| cls md |
	cls := testModule @env1:Point.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #'___init__:kw:').

]

{ #category : 'Grail-Tests - Instance Variables' }
ClassTestCase >> testPointInstVars [
	"Phase B: Point instances expose x and y as Python attributes.
	Storage is dynamic-instVars on each instance — the class itself
	has no static instVar declarations for these names."

	| p |
	p := testModule dynamicInstVarAt: #p.
	self assert: (p @env1:___pyAttrLoad___: #x) equals: 3.
	self assert: (p @env1:___pyAttrLoad___: #y) equals: 4.

]

{ #category : 'Grail-Tests - Real Methods' }
ClassTestCase >> testPointSumIsRealMethod [
	"Test that sum is a real env-1 method on Point."

	| cls md |
	cls := testModule @env1:Point.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #sum).

]

{ #category : 'Grail-Tests - Method Calls' }
ClassTestCase >> testPointSumResult [
	"Test that p.sum() = 7 was stored during module init."

	self assert: (testModule @env1:p_sum) equals: 7.

]

{ #category : 'Grail-Tests - Real Methods' }
ClassTestCase >> testSuperInitBindsArguments [
	"super().__init__(...) into a parent's __init__ binds both
	positional (Point3D(1, 2, 3)) and keyword (Point3D(x=4, y=5, z=6))
	arguments — the werkzeug Request(environ) construction pattern."

	self assert: testModule @env1:super_init_positional equals: true.
	self assert: testModule @env1:super_init_keyword equals: true

]
