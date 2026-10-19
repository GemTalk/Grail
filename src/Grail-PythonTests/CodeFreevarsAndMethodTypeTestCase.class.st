Class {
	#name : 'CodeFreevarsAndMethodTypeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CodeFreevarsAndMethodTypeTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
CodeFreevarsAndMethodTypeTestCase >> setUp [
	"Reload tests/python/code_freevars_and_method_type.py fresh each test: the
	module body ASSIGNS __code__ on the functions it builds, so a shared
	instance would let one test observe another's replacement."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'code_freevars_and_method_type' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/code_freevars_and_method_type.py')
		name: 'code_freevars_and_method_type'.

]

{ #category : 'Grail-Tests - co_freevars' }
CodeFreevarsAndMethodTypeTestCase >> testACodeObjectNamesItsFreeVariables [
	"None, one and two of them -- and an empty tuple rather than an absent
	attribute for the def that closes over nothing, because
	``len(co.co_freevars)'' is how the assignment rule is phrased and a missing
	attribute would make it unwritable rather than merely unavailable."

	self assertMatchesCPythonAt: 'freevars_of_a_closure'.

]

{ #category : 'Grail-Tests - The __code__ Assignment Rule' }
CodeFreevarsAndMethodTypeTestCase >> testAssigningCodeWithADifferentFreeVarCountIsRefused [
	"THE TEST THIS EXISTS FOR, in both directions -- fewer free variables than
	the target and more.  Grail accepted either, leaving the function's cells
	and its code describing different closures, with nothing raised until the
	next call."

	self assertMatchesCPythonAt: 'fewer_free_vars_is_refused'.
	self assertMatchesCPythonAt: 'more_free_vars_is_refused'.

]

{ #category : 'Grail-Tests - co_freevars' }
CodeFreevarsAndMethodTypeTestCase >> testCoFreevarsAgreesWithTheClosure [
	"Sorted, as CPython sorts them, and the same LENGTH as __closure__ --
	they are stamped from one set for exactly this reason.  A check derived
	separately from the cells it protects is a second source of truth for one
	fact, which is how the two come apart."

	self assertMatchesCPythonAt: 'freevars_are_sorted_and_match_the_closure'.
	self assertMatchesCPythonAt: 'the_code_type_is_the_code_type'.

]

{ #category : 'Grail-Tests - types.MethodType' }
CodeFreevarsAndMethodTypeTestCase >> testMethodTypeBindsAFunctionToAnObject [
	"THE OTHER TEST THIS EXISTS FOR.  ``types.MethodType(f, obj)()'' calls
	``f(obj)'', and further arguments follow the receiver.  The stub answered
	something uncallable, so invoking it raised a Smalltalk
	MessageNotUnderstood -- not catchable from Python, and enough to void the
	whole module's score in the conformance harness."

	self assertMatchesCPythonAt: 'binds_a_function_to_an_object'.
	self assertMatchesCPythonAt: 'passes_further_arguments_through'.

]

{ #category : 'Grail-Tests - types.MethodType' }
CodeFreevarsAndMethodTypeTestCase >> testMethodTypeCarriesFuncAndSelf [
	"The two attributes a bound method exposes, by identity."

	self assertMatchesCPythonAt: 'carries_func_and_self'.

]

{ #category : 'Grail-Tests - types.MethodType' }
CodeFreevarsAndMethodTypeTestCase >> testMethodTypeHasNoAttributeStorage [
	"Reading, setting and deleting an arbitrary name are all AttributeError:
	CPython's method type has no __dict__, which is why this is __slots__ rather
	than a plain class body."

	self assertMatchesCPythonAt: 'has_no_attribute_storage'.

]

{ #category : 'Grail-Tests - The __code__ Assignment Rule' }
CodeFreevarsAndMethodTypeTestCase >> testTheRuleDoesNotOvershoot [
	"A guard that also refuses the LEGAL assignment would be worse than none:
	equal counts must still go through.  And a non-code value stays a TypeError
	about its type -- the free-variable rule must not restate that as a
	ValueError about free variables it never got to count."

	self assertMatchesCPythonAt: 'same_free_var_count_is_allowed'.
	self assertMatchesCPythonAt: 'a_non_code_object_is_still_a_type_error'.

]
