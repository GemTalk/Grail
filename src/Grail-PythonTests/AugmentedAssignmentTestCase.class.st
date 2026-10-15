Class {
	#name : 'AugmentedAssignmentTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AugmentedAssignmentTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
AugmentedAssignmentTestCase >> setUp [
	"Reload tests/python/augmented_assignment.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'augmented_assignment' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/augmented_assignment.py')
		name: 'augmented_assignment'.

]

{ #category : 'Grail-Tests - Controls' }
AugmentedAssignmentTestCase >> testAFunctionLocalTargetIsUnchanged [
	"This branch was always correct, and is the reason the others went
	unnoticed: the same statement worked in a function and not at module
	scope.  Here so a fix cannot trade one for the other."

	self assertMatchesCPythonAt: 'function_reflected_proxy'.
	self assertMatchesCPythonAt: 'function_dict_in_place'.
	self assertMatchesCPythonAt: 'function_list_iadd_value'.
	self assertMatchesCPythonAt: 'function_list_in_place'.
	self assertMatchesCPythonAt: 'function_inplace_dunder_ran'.

]

{ #category : 'Grail-Tests - Module scope' }
AugmentedAssignmentTestCase >> testAModuleScopeTargetMutatesInPlace [
	"The IDENTITY assertion is the one that matters.  Comparing values alone
	passes whether the object was mutated or replaced, which is exactly the
	difference this branch used to get wrong -- and the difference is only
	visible to a second name bound to the same object."

	self assertMatchesCPythonAt: 'module_dict_ior_value'.
	self assertMatchesCPythonAt: 'module_dict_ior_in_place'.
	self assertMatchesCPythonAt: 'module_list_iadd_value'.
	self assertMatchesCPythonAt: 'module_list_iadd_in_place'.
	self assertMatchesCPythonAt: 'module_set_ior_value'.
	self assertMatchesCPythonAt: 'module_set_ior_in_place'.
	self assertMatchesCPythonAt: 'module_inplace_dunder_ran'.

]

{ #category : 'Grail-Tests - Module scope' }
AugmentedAssignmentTestCase >> testAModuleScopeTargetReachesTheReflectedOperator [
	"A forward dunder that declines must not have its NotImplemented STORED.
	That is the half that produces a value rather than an error, so it cannot
	be caught by watching for exceptions."

	self assertMatchesCPythonAt: 'module_reflected_proxy'.
	self assertMatchesCPythonAt: 'module_reflected_custom'.

]

{ #category : 'Grail-Tests - Attribute targets' }
AugmentedAssignmentTestCase >> testAnAttributeTargetTakesTheSameProtocol [
	"``obj.x op= v'' and ``self.x op= v'' take DIFFERENT emits -- the
	polymorphic attribute protocol and the instance's own storage -- so both
	are probed rather than one assumed to follow from the other.
	``self.data |= other'' is how UserDict.__ior__ is written, which is how
	this reached test_userdict."

	self assertMatchesCPythonAt: 'attr_list_iadd_value'.
	self assertMatchesCPythonAt: 'attr_list_iadd_in_place'.
	self assertMatchesCPythonAt: 'attr_reflected_proxy'.
	self assertMatchesCPythonAt: 'attr_inplace_dunder_ran'.
	self assertMatchesCPythonAt: 'self_attr_in_place'.
	self assertMatchesCPythonAt: 'self_attr_reflected_proxy'.

]

{ #category : 'Grail-Tests' }
AugmentedAssignmentTestCase >> testAnnotatedAndAugmentedValuesTakeABareTuple [
	"``x: tuple = -1, None'' and ``t += 1, 2'': both right-hand sides are
	star_expressions in CPython's grammar, and Grail parsed a single
	expression, so the comma was a SyntaxError -- the first thing keeping pyparsing
	from importing (#1419).  tests/python/annassign_bare_tuple.py holds the
	checks (module, function and class scope, starred items, yield values,
	augmented forms, and a lone starred value still refused) and agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'annassign_bare_tuple' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/annassign_bare_tuple.py')
		name: 'annassign_bare_tuple'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Subscript targets' }
AugmentedAssignmentTestCase >> testASubscriptTargetTakesTheSameProtocol [
	"``d[k] += [x]'' must extend the list already at d[k] rather than build a
	new one and store it over the top."

	self assertMatchesCPythonAt: 'subscript_list_iadd_value'.
	self assertMatchesCPythonAt: 'subscript_list_iadd_in_place'.
	self assertMatchesCPythonAt: 'subscript_reflected_proxy'.
	self assertMatchesCPythonAt: 'subscript_inplace_dunder_ran'.

]

{ #category : 'Grail-Tests - Controls' }
AugmentedAssignmentTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '32 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
AugmentedAssignmentTestCase >> testImmutableTargetsAreUnaffected [
	"int, str and tuple have no in-place dunder, so ``x += y'' must still
	build a new object and rebind -- the tuple row asserts the REPLACEMENT
	explicitly, which is the mirror image of the in-place assertions above."

	self assertMatchesCPythonAt: 'module_int_iadd'.
	self assertMatchesCPythonAt: 'module_str_iadd'.
	self assertMatchesCPythonAt: 'module_tuple_iadd'.
	self assertMatchesCPythonAt: 'module_tuple_is_replaced'.
	self assertMatchesCPythonAt: 'attr_int_iadd'.
	self assertMatchesCPythonAt: 'subscript_int_iadd'.

]

{ #category : 'Grail-Tests - Controls' }
AugmentedAssignmentTestCase >> testThePlainOperatorAndTheAugmentedOneNowAgree [
	"The fix closed a gap between two SPELLINGS of one operator.  These rows
	measure the spelling that was always right, so a regression that broke it
	instead of fixing the other would be caught rather than looking like
	agreement."

	self assertMatchesCPythonAt: 'binary_reflected_proxy'.
	self assertMatchesCPythonAt: 'binary_reflected_custom'.

]
