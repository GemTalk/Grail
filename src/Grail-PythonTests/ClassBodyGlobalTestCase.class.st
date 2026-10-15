Class {
	#name : 'ClassBodyGlobalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassBodyGlobalTestCase >> setUp [
	"Reload tests/python/class_body_global.py fresh each test -- its
	module-level globals are what the class bodies rebind."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_global' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_global.py')
		name: 'class_body_global'.

]

{ #category : 'Grail-Tests' }
ClassBodyGlobalTestCase >> testAMethodAssigningTheNameIsStillLocal [
	"A method is its own scope, so the class body's declaration does not reach
	it: ``gy = val'' there binds a method local and leaves the module's gy
	alone.  Routing every method assignment at the module would pass the first
	test and fail this one."

	self assert: testModule @env1:a_method_assigning_the_name_is_still_local asArray
		equals: #( 999 101 101 ).

]

{ #category : 'Grail-Tests' }
ClassBodyGlobalTestCase >> testAnUndeclaredClassAttributeIsUnaffected [
	"Only the DECLARED name is exempt from becoming a class attribute; a
	sibling assignment in the same body is an ordinary one."

	self assert: testModule @env1:an_undeclared_class_attribute_is_unaffected asArray
		equals: #( 21 22 false ).

]

{ #category : 'Grail-Tests' }
ClassBodyGlobalTestCase >> testAttributesAroundTheWriteSeeSourceOrder [
	"THE ORDERING CASE, and the reason the write cannot be a pass after the
	class attributes: ``x'' is read before it and ``y'' after it.  Emitting the
	write last answers ( 1 1 2 false ) -- which is how this change regressed
	test_listcomps the first time it was written."

	self assert: testModule @env1:attributes_around_the_write_see_source_order asArray
		equals: #( 1 2 2 false ).

]

{ #category : 'Grail-Tests' }
ClassBodyGlobalTestCase >> testExecClassBodyGlobal [
	"Inside exec the write goes through the doit's scope handle rather than a
	module instance, so the whole shape needs its own test."

	self assert: testModule @env1:exec_class_body_global asArray
		equals: #( 13 13 false ).

]

{ #category : 'Grail-Tests' }
ClassBodyGlobalTestCase >> testExecClassBodyGlobalOrdering [
	"...and so does the ordering, for the same reason."

	self assert: testModule @env1:exec_class_body_global_ordering asArray
		equals: #( 1 2 2 ).

]

{ #category : 'Grail-Tests' }
ClassBodyGlobalTestCase >> testModuleLevelClassBodyGlobal [
	"THE BUG.  The module binding becomes 13, a method reading the name sees
	13, and the class has NO attribute of that name -- Grail answered 12, 12,
	true."

	self assert: testModule @env1:module_level_class_body_global asArray
		equals: #( 13 13 false ).

]
