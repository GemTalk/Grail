Class {
	#name : 'ModuleDocstringTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleDocstringTestCase >> assertMatchesCPythonAt: key [
	"Compare the fixture's recorded result against its CPython-measured
	EXPECTED entry, both through repr so a True and a 'True' cannot pass for
	each other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
ModuleDocstringTestCase >> setUp [
	"Reload tests/python/module_docstring.py fresh each test, so each one reads
	a module built by this session's compiler rather than whatever an earlier
	test left in sys.modules."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_docstring' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_docstring.py')
		name: 'module_docstring'.

]

{ #category : 'Grail-Tests' }
ModuleDocstringTestCase >> testAModuleReadsBackItsOwnDocstring [
	"The compiler now extracts the leading bare string literal of a module body
	and stamps it; before this it discarded it, so the value below was
	unreachable no matter how the accessor behaved."

	self assertMatchesCPythonAt: 'own_doc_is_a_string'.
	self assertMatchesCPythonAt: 'own_doc_first_line'.
	self assertMatchesCPythonAt: 'imported_doc_value'.

]

{ #category : 'Grail-Tests' }
ModuleDocstringTestCase >> testAModuleWithNoDocstringAnswersNone [
	"None, not absent and not inherited.  This is the half that the old
	``^ super __doc__'' got wrong in the most misleading way: it answered a
	string for a module that has no docstring at all."

	self assertMatchesCPythonAt: 'no_docstring_is_none'.

]

{ #category : 'Grail-Tests' }
ModuleDocstringTestCase >> testNoModuleReportsObjectsDocstring [
	"The regression proper.  Stated as a property rather than against a literal
	so it survives a rewording of GemStone's Object docstring -- and because the
	literal is exactly what every module used to answer, an equality check
	against it would have passed for the wrong reason."

	self assertMatchesCPythonAt: 'own_doc_is_not_objects'.
	self assertMatchesCPythonAt: 'imported_doc_is_not_objects'.

]

{ #category : 'Grail-Tests' }
ModuleDocstringTestCase >> testTheDocstringIsAnEntryInTheNamespaceNotMerelyReadable [
	"CPython puts ``__doc__'' IN the module namespace, so dir(), vars() and any
	iteration see it.  Membership is what distinguishes a real entry from an
	accessor that merely answers a read."

	self assertMatchesCPythonAt: 'own_doc_in_namespace'.
	self assertMatchesCPythonAt: 'imported_doc_in_namespace'.

]
