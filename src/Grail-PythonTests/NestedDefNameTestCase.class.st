Class {
	#name : 'NestedDefNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-NestedDefName' }
NestedDefNameTestCase >> loadFixture [
	"Load tests/python/nested_def_name.py fresh."

	importlib @env1:modules removeKey: #'nested_def_name' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_def_name.py')
		name: 'nested_def_name'

]

{ #category : 'Grail-Tests-NestedDefName' }
NestedDefNameTestCase >> testNameSurvivesAssignment [
	"The stamped name rides along through a plain rebinding."

	self assert: (self loadFixture @env1:name_survives_assignment) equals: 'hello'

]

{ #category : 'Grail-Tests-NestedDefName' }
NestedDefNameTestCase >> testNestedName [
	"``make_nested().__name__`` returns the def's lexical name."

	self assert: (self loadFixture @env1:nested_name) equals: 'hello'

]

{ #category : 'Grail-Tests-NestedDefName' }
NestedDefNameTestCase >> testNestedQualname [
	"``__qualname__'' is the QUALIFIED path, as CPython has it: a def inside a
	function reads ``make_nested.<locals>.hello''.

	This used to assert the bare ``hello'' -- __qualname__ merely mirrored
	__name__, which is only right for a def at module or class level.  The
	qualified form is observable because a function's repr prints it, so it
	lands in error messages callers match on."

	self assert: (self loadFixture @env1:nested_qualname)
		equals: 'make_nested.<locals>.hello'

]
