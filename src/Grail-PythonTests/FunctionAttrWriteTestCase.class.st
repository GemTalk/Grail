Class {
	#name : 'FunctionAttrWriteTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionAttrWriteTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
FunctionAttrWriteTestCase >> setUp [
	"Reload tests/python/function_attr_writes.py fresh each test -- the module
	body mutates the function it tests, so the order of its writes matters and
	a shared instance would not survive."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_attr_writes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_attr_writes.py')
		name: 'function_attr_writes'.

]

{ #category : 'Grail-Tests - Bound Methods' }
FunctionAttrWriteTestCase >> testABoundMethodHasNoAttributeStorage [
	"Every write is an AttributeError -- the read-only descriptors and an
	arbitrary name alike -- because attributes belong on the underlying
	FUNCTION.  Grail took them into dynamic instVars that nothing read back
	through the method, so the write looked like it worked and the value was
	simply lost."

	self assertMatchesCPythonAt: 'method_custom_attr'.
	self assertMatchesCPythonAt: 'method_self'.
	self assertMatchesCPythonAt: 'method_func'.
	self assertMatchesCPythonAt: 'method_del_self'.

]

{ #category : 'Grail-Tests - Still Legal' }
FunctionAttrWriteTestCase >> testAFunctionStillTakesItsOwnAttributes [
	"THE TESTS THAT MATTER MOST HERE.  Grail represents a module-level ``def''
	and a bound method with the SAME class, so a guard written without that
	distinction rejects every one of these -- and a function carrying
	attributes is how functools.wraps, dataclasses and every decorator work.
	A first attempt did exactly that, and these are what caught it."

	self assertMatchesCPythonAt: 'name_to_str'.
	self assertMatchesCPythonAt: 'custom_attr_on_function'.
	self assertMatchesCPythonAt: 'doc'.
	self assertMatchesCPythonAt: 'defaults_to_tuple'.
	self assertMatchesCPythonAt: 'dict_to_dict'.

]

{ #category : 'Grail-Tests - Type Checked' }
FunctionAttrWriteTestCase >> testAnIdentifyingNameMustBeAString [
	"``f.__name__ = 7'' left an integer where every traceback, repr and pickle
	expects a string -- and raised nothing, so the first sign of it was a
	failure somewhere else entirely."

	self assertMatchesCPythonAt: 'name_to_int'.
	self assertMatchesCPythonAt: 'qualname_to_int'.

]

{ #category : 'Grail-Tests - Still Legal' }
FunctionAttrWriteTestCase >> testAnUnboundMethodIsAPlainFunction [
	"``F.a'' is a function in CPython -- only ``F().a'' is a bound method --
	so it takes attributes.  Rejecting on the class side as well would be the
	same over-application one level up."

	self assertMatchesCPythonAt: 'custom_attr_on_unbound'.

]

{ #category : 'Grail-Tests - Type Checked' }
FunctionAttrWriteTestCase >> testClassAssignmentOnAFunctionIsRefused [
	"A function's layout is fixed, so CPython refuses __class__ assignment
	outright.  TypeError, not AttributeError -- there IS a setter on object,
	it just will not accept this."

	self assertMatchesCPythonAt: 'class_on_function'.

]

{ #category : 'Grail-Tests - Read-Only' }
FunctionAttrWriteTestCase >> testTheAttributesWithNoSetterRefuseBothDirections [
	"__closure__ and __globals__ have a getter and no setter, so assignment
	AND deletion are AttributeError.  Deletion had to be named explicitly:
	these are SLOT names rather than __dict__ entries, so ``del'' found
	nothing to remove and quietly succeeded."

	self assertMatchesCPythonAt: 'set_closure'.
	self assertMatchesCPythonAt: 'del_closure'.
	self assertMatchesCPythonAt: 'set_globals'.
	self assertMatchesCPythonAt: 'del_globals'.

]

{ #category : 'Grail-Tests - Still Legal' }
FunctionAttrWriteTestCase >> testThePermittedWritesActuallyLand [
	"``no error'' only says nothing raised, which a guard that silently
	DROPPED the write would also say.  These read the values back."

	self assertMatchesCPythonAt: 'name_took'.
	self assertMatchesCPythonAt: 'custom_attr_took'.
	self assertMatchesCPythonAt: 'defaults_took'.

]

{ #category : 'Grail-Tests - Type Checked' }
FunctionAttrWriteTestCase >> testTheStructuralAttributesMustHaveTheRightShape [
	"__code__ replaced by a number, __defaults__ by a number, __dict__ by
	None: each leaves the function unable to answer the next call, and each
	used to be accepted."

	self assertMatchesCPythonAt: 'code_to_int'.
	self assertMatchesCPythonAt: 'defaults_to_int'.
	self assertMatchesCPythonAt: 'dict_to_none'.

]
