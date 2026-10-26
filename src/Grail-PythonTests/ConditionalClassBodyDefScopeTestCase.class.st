"A def inside a CONDITIONAL class-body block (if / try / for) does not see the
class body: its free names are the module's, as for any def in a class.

Grail emits such a def inline, as a block value, while the class body is being
compiled, and NameAst >> ___inNestedScopeWithinClassBody___ stopped at the def
and answered ``not nested'' -- so every class-body branch fired and a free name
read a sibling method or a class attribute.  A def whose name GemStone reserves
(``repeat'') is put under a synthetic ``if True:'', so test_timeit's
``def repeat'' read the test class's own ``timeit'' method.

Every expectation in tests/python/conditional_class_body_def_scope.py was
produced by CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'ConditionalClassBodyDefScopeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ConditionalClassBodyDefScopeTestCase >> assertAll: keys [

	keys do: [:each |
		| result |
		result := self resultAt: each.
		self assert: result == true description: each , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ConditionalClassBodyDefScopeTestCase >> resultAt: aKey [

	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ConditionalClassBodyDefScopeTestCase >> setUp [

	importlib @env1:modules removeKey: #'conditional_class_body_def_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/conditional_class_body_def_scope.py')
		name: 'conditional_class_body_def_scope'

]

{ #category : 'Grail-Tests' }
ConditionalClassBodyDefScopeTestCase >> testADefWithAReservedNameReadsTheModule [

	"``def repeat'' is put under a synthetic ``if True:'', and read the class's
	sibling method of the same name as the global."

	self assertAll: #('a_reserved_name')

]

{ #category : 'Grail-Tests' }
ConditionalClassBodyDefScopeTestCase >> testAFreeNameInAConditionalDefIsTheModules [

	self assertAll: #('free_names' 'a_property' 'a_staticmethod' 'under_try' 'under_for')

]

{ #category : 'Grail-Tests' }
ConditionalClassBodyDefScopeTestCase >> testTheClassBodyStillEvaluatesTheDefaultsAndSuper [

	"A default is the class body's own evaluation, and zero-argument super()
	and __class__ still find the class."

	self assertAll: #('default_from_the_class_body' 'zero_arg_super_and_dunder_class')

]
