Class {
	#name : 'ClassTypeParamsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassTypeParamsTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ClassTypeParamsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_type_params' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_type_params.py')
		name: 'class_type_params'.

]

{ #category : 'Grail-Tests - the parameters exist' }
ClassTypeParamsTestCase >> testAClassReportsItsTypeParameters [
	"The names were discarded by the parser, so there was nothing to report."

	self assertMatchesCPythonAt: 'names'.
	self assertMatchesCPythonAt: 'count'.
	self assertMatchesCPythonAt: 'is_typevar'.
	self assertMatchesCPythonAt: 'two_parameters'.
	self assertMatchesCPythonAt: 'is_a_tuple'.

]

{ #category : 'Grail-Tests - assignment and deletion' }
ClassTypeParamsTestCase >> testAnAssignmentWinsAndSurvivesARefusedDelete [
	"Three facts in one row, in the order test_type_typeparams asserts them:
	the assignment takes, the delete raises TypeError, and the assigned value
	is still there afterwards.  The assignment lands in the class-attribute
	OVERLAY once the class is canonical, not in the holder, which is why the
	read consults both."

	self assertMatchesCPythonAt: 'assign_then_delete'.

]

{ #category : 'Grail-Tests - the parameters exist' }
ClassTypeParamsTestCase >> testAnOrdinaryClassAnswersAnEmptyTuple [
	"Not AttributeError: the slot is part of the type, which is also why it
	cannot be deleted."

	self assertMatchesCPythonAt: 'plain_class'.
	self assertMatchesCPythonAt: 'dynamic_class'.

]

{ #category : 'Grail-Tests - Controls' }
ClassTypeParamsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
ClassTypeParamsTestCase >> testTheStoredNamesStayInternal [
	"They live under a Grail-internal key, so they must not surface as a class
	attribute -- and __type_params__ itself is not a __dict__ entry either, in
	CPython or here."

	self assertMatchesCPythonAt: 'not_in_dict'.
	self assertMatchesCPythonAt: 'type_params_not_in_dict'.
	self assertMatchesCPythonAt: 'class_still_usable'.
	self assertMatchesCPythonAt: 'subclass_of_generic'.

]

{ #category : 'Grail-Tests - Controls' }
ClassTypeParamsTestCase >> testTypingIsUndisturbed [
	"THE CONTROL FOR THE HISTORY.  An earlier cut materialised the TypeVars at
	class-definition time, which imports typing WHILE typing is defining its
	own generic classes; ForwardRef broke deterministically and the whole cut
	was reverted.  Building them on first READ is what avoids it, and this row
	asks the very thing that broke."

	self assertMatchesCPythonAt: 'typing_still_works'.
	self assertMatchesCPythonAt: 'typevar_usable'.

]
