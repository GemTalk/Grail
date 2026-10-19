Class {
	#name : 'ClassBodyNamespaceDefsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyNamespaceDefsTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ClassBodyNamespaceDefsTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_namespace_defs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_namespace_defs.py')
		name: 'class_body_namespace_defs'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.

]

{ #category : 'Grail-Tests - Source Order' }
ClassBodyNamespaceDefsTestCase >> testABodyOfPlainAssignmentsIsUnchanged [
	"The path stages 1-5 already had.  A body with no def and no nested class
	must record exactly what it did before."

	self assert: ((self at: 'plain_order') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'x' 'y' ).

]

{ #category : 'Grail-Tests - Bound Values' }
ClassBodyNamespaceDefsTestCase >> testADecoratedDefBindsUnderItsOwnName [
	"Reading the value OFF THE CLASS rather than passing it in is what makes
	this work: the decorator has already rebound the name, and the load sees
	the rebinding rather than the raw compiled method."

	self assert: (self at: 'decorated_present') equals: true.
	self assert: (self at: 'decorated_callable') equals: true.

]

{ #category : 'Grail-Tests - Bound Values' }
ClassBodyNamespaceDefsTestCase >> testADefArrivesAsSomethingCallable [
	"CPython puts a function object here and Grail an unbound method, so the
	assertion is callability rather than type -- the difference is real and
	is not what this stage is about."

	self assert: (self at: 'f_callable') equals: true.

]

{ #category : 'Grail-Tests - Bound Values' }
ClassBodyNamespaceDefsTestCase >> testANestedClassArrivesAsAClass [
	self assert: (self at: 'inner_is_class') equals: true.

]

{ #category : 'Grail-Tests - Guards' }
ClassBodyNamespaceDefsTestCase >> testTheClassIsStillBuiltFromTheBody [
	"The bind is additive -- it must not disturb what the body compiles to.
	Method, nested class, decorated method and a plain attribute, all read
	back off the finished class."

	self assert: (self at: 'f_result') @env0:asString equals: 'f'.
	self assert: (self at: 'inner_name') @env0:asString equals: 'Inner'.
	self assert: (self at: 'decorated_result') @env0:asString equals: 'decorated'.
	self assert: (self at: 'c_value') equals: 3.

]

{ #category : 'Grail-Tests - Source Order' }
ClassBodyNamespaceDefsTestCase >> testTheNamespaceSeesEveryBindingInSourceOrder [
	"The whole point.  Before, the mapping recorded only the assignments --
	``a'', ``b'', ``c'' -- so a metaclass could not see the body it was
	about to be handed."

	self assert: ((self at: 'order') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'a' 'f' 'b' 'Inner' 'c' 'decorated' ).

]
