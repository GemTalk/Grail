Class {
	#name : 'BuiltinTypeDictAndBasesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuiltinTypeDictAndBasesTestCase >> assertMatchesCPythonAt: key [
	"Every recorded answer is already a repr string, so the two compare as text."

	| actual expected |
	actual := (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key.
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
BuiltinTypeDictAndBasesTestCase >> setUp [
	"Reload tests/python/builtin_type_dict_and_bases.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_type_dict_and_bases' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_type_dict_and_bases.py')
		name: 'builtin_type_dict_and_bases'.

]

{ #category : 'Grail-Tests' }
BuiltinTypeDictAndBasesTestCase >> testBasesSkipImplementationClasses [
	"``int.__bases__'' was (Number,), ``tuple.__bases__'' (Array,),
	BaseException's the kernel Exception -- each disagreeing with the type's
	own __mro__, which already hid them."

	self assertMatchesCPythonAt: 'bases'.
	self assertMatchesCPythonAt: 'mro'.

]

{ #category : 'Grail-Tests' }
BuiltinTypeDictAndBasesTestCase >> testBytearrayDictListsItsMethods [
	"The __dict__ walk stopped at bytes, the first class the MRO named, so the
	methods bytearray shares with bytes were missing (61 of 82 names)."

	self assertMatchesCPythonAt: 'bytearray_methods'.
	self assertMatchesCPythonAt: 'bytearray_method_calls'.

]

{ #category : 'Grail-Tests' }
BuiltinTypeDictAndBasesTestCase >> testBytearrayIsNotABytesSubclass [
	"__mro__ read (bytearray, bytes, object) and __bases__ (bytes,), while
	issubclass(bytearray, bytes) already answered False."

	self assertMatchesCPythonAt: 'bytearray_subclass'.

]

{ #category : 'Grail-Tests' }
BuiltinTypeDictAndBasesTestCase >> testClassAndStaticMethodsAreDescriptors [
	"str.maketrans / dict.fromkeys were missing, bytes.maketrans /
	int.from_bytes bare functions.  Present, of the right kind for pickle and
	inspect, and callable through __func__ / __get__."

	self assertMatchesCPythonAt: 'class_side_present'.
	self assertMatchesCPythonAt: 'staticmethod_kind'.
	self assertMatchesCPythonAt: 'classify_kinds'.
	self assertMatchesCPythonAt: 'pickle_refuses'.
	self assertMatchesCPythonAt: 'descriptors_call'.

]

{ #category : 'Grail-Tests' }
BuiltinTypeDictAndBasesTestCase >> testDocIsTheDocstring [
	"``object.__dict__['__doc__']'' was a function."

	self assertMatchesCPythonAt: 'doc_is_the_docstring'.

]

{ #category : 'Grail-Tests' }
BuiltinTypeDictAndBasesTestCase >> testNoGrailPlumbingInDict [
	"A phantom ``new'' (the class-call transport), int's class-subscription hook
	as ``__getitem__'', __instancecheck__, and ``__pyRaiseNew___:args''."

	self assertMatchesCPythonAt: 'no_plumbing'.

]
