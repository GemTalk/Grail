Class {
	#name : 'FunctionDictAndDocTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionDictAndDocTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
FunctionDictAndDocTestCase >> setUp [
	"Reload tests/python/function_dict_and_doc.py fresh each test -- the module
	body REPLACES and deletes the __dict__ of the functions it builds, so a
	shared instance would be reading a previous test's edits."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_dict_and_doc' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_dict_and_doc.py')
		name: 'function_dict_and_doc'.

]

{ #category : 'Grail-Tests - Assigning __dict__' }
FunctionDictAndDocTestCase >> testAssigningANonDictIsATypeError [
	"No check ran before, so None -- or an int -- was accepted in silence,
	leaving a function whose __dict__ could not be read back as a mapping.  A
	UserDict is refused too: CPython wants the real type and names the offending
	one in the message."

	self assertMatchesCPythonAt: 'assign_none'.
	self assertMatchesCPythonAt: 'assign_int'.
	self assertMatchesCPythonAt: 'assign_userdict'.

]

{ #category : 'Grail-Tests - Assigning __dict__' }
FunctionDictAndDocTestCase >> testAssigningTheDictReplacesIt [
	"THE TEST THIS EXISTS FOR.  The assignment used to land in a namespace the
	reader never consults, so it changed nothing and said nothing -- and the read
	back showed the dict nested under a '__dict__' key."

	self assertMatchesCPythonAt: 'assign_dict'.

]

{ #category : 'Grail-Tests - Assigning __dict__' }
FunctionDictAndDocTestCase >> testAssignmentIsLiveNotACopy [
	"By IDENTITY: ``f.__dict__ is d'' stays true, so mutating d afterwards shows
	through f.  This is what separates a real replacement from a merge, which
	would agree once and then drift."

	self assertMatchesCPythonAt: 'assignment_is_live'.

]

{ #category : 'Grail-Tests - Deleting' }
FunctionDictAndDocTestCase >> testDeletingTheDocstringResetsItToNone [
	"``del f.__doc__'' does not remove an attribute -- it is func_set_doc(NULL),
	so the function still HAS a __doc__ and it reads None.  Grail raised
	``AttributeError: __doc__'' because __doc__ lives in the slot namespace and
	was never in the table the delete searched.  Deleting twice is therefore fine.
	Closes test_funcattrs' test_delete_docstring."

	self assertMatchesCPythonAt: 'delete_doc'.
	self assertMatchesCPythonAt: 'delete_doc_twice'.

]

{ #category : 'Grail-Tests - Deleting' }
FunctionDictAndDocTestCase >> testTheDictCannotBeDeleted [
	"TypeError, not AttributeError: the attribute exists and is writable, so what
	is refused is the DELETION.  Closes test_funcattrs' test_delete___dict__."

	self assertMatchesCPythonAt: 'delete_dict'.

]

{ #category : 'Grail-Tests - Reading __dict__' }
FunctionDictAndDocTestCase >> testTheDictStartsEmptyAndCollectsAttributes [
	"The reads were already right; they are here so the write fixes cannot break
	them."

	self assertMatchesCPythonAt: 'dict_initially_empty'.
	self assertMatchesCPythonAt: 'setattr_in_dict'.

]

{ #category : 'Grail-Tests - __doc__' }
FunctionDictAndDocTestCase >> testTheOrdinaryDocstringPathIsUndisturbed [
	"A function with no docstring reads None, one with a literal reads it, and an
	assignment round-trips.  Guarding the delete must not disturb any of that."

	self assertMatchesCPythonAt: 'doc_initially_none'.
	self assertMatchesCPythonAt: 'literal_docstring'.
	self assertMatchesCPythonAt: 'set_doc'.

]
