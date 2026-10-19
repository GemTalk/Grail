Class {
	#name : 'FunctionWriteGuardsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionWriteGuardsTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
FunctionWriteGuardsTestCase >> setUp [
	"Reload tests/python/function_write_guards.py fresh each test -- the module
	body renames and re-qualifies the functions it builds, so a shared instance
	would be reading a previous test's edits."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_write_guards' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_write_guards.py')
		name: 'function_write_guards'.

]

{ #category : 'Grail-Tests - Type-Checked' }
FunctionWriteGuardsTestCase >> testANonStringNameIsATypeError [
	"THE TEST THIS EXISTS FOR.  ``f.__name__ = 7'' was accepted in silence,
	putting an integer where every traceback, repr and pickle expects a string --
	so the failure surfaced far from the assignment that caused it."

	self assertMatchesCPythonAt: 'name_to_int'.
	self assertMatchesCPythonAt: 'qualname_to_int'.

]

{ #category : 'Grail-Tests - Type-Checked' }
FunctionWriteGuardsTestCase >> testCodeAndDefaultsAreTypeChecked [
	"``f.__code__ = 7'' replaced the code object with a number and
	``f.__defaults__ = 7'' left a non-tuple where the call path expects one.
	Both were accepted."

	self assertMatchesCPythonAt: 'code_to_int'.
	self assertMatchesCPythonAt: 'defaults_to_int'.

]

{ #category : 'Grail-Tests - Delete Has Its Own Rules' }
FunctionWriteGuardsTestCase >> testDeletingANameIsATypeError [
	"Phrased as the SET message, because CPython routes the delete through the
	same setter with a NULL value.  Grail answered ``AttributeError: __name__'',
	which reads as though the function had no name at all."

	self assertMatchesCPythonAt: 'del_name'.
	self assertMatchesCPythonAt: 'del_qualname'.

]

{ #category : 'Grail-Tests - Delete Has Its Own Rules' }
FunctionWriteGuardsTestCase >> testDeletingDefaultsIsLegalAndClearsThem [
	"The one guarded attribute whose delete is ALLOWED -- it clears the defaults
	to None rather than refusing.  Kept as its own test because a guard written
	as ``refuse every delete'' passes everything above and breaks exactly here."

	self assertMatchesCPythonAt: 'del_defaults'.

]

{ #category : 'Grail-Tests - Read-Only' }
FunctionWriteGuardsTestCase >> testTheReadOnlyAttributesRefuseBothDirections [
	"__closure__ and __globals__ have no setter at all, so BOTH the write and the
	delete are AttributeError -- not TypeError, which is the answer reserved for
	attributes that have a setter and were handed the wrong value.  Assigning
	__closure__ discarded the cells the body reads, silently."

	self assertMatchesCPythonAt: 'set_closure'.
	self assertMatchesCPythonAt: 'del_closure'.
	self assertMatchesCPythonAt: 'set_globals'.
	self assertMatchesCPythonAt: 'del_globals'.

]

{ #category : 'Grail-Tests - Still Legal' }
FunctionWriteGuardsTestCase >> testTheWritesTheAttributesExistForStillWork [
	"A guard that also refuses the legitimate writes would be worse than none.
	Renaming a function is the whole reason __name__ has a setter --
	functools.wraps does it on every decorated function in the corpus."

	self assertMatchesCPythonAt: 'rename'.
	self assertMatchesCPythonAt: 'requalify'.
	self assertMatchesCPythonAt: 'defaults_to_tuple'.

]
