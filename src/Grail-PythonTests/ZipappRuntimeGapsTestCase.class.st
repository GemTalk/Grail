Class {
	#name : 'ZipappRuntimeGapsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ZipappRuntimeGapsTestCase >> assertMatchesCPythonAt: key [
	"Every recorded answer is already a repr string, so the two compare as text."

	| actual expected |
	actual := (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key.
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
ZipappRuntimeGapsTestCase >> setUp [
	"Reload tests/python/zipapp_runtime_gaps.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'zipapp_runtime_gaps' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/zipapp_runtime_gaps.py')
		name: 'zipapp_runtime_gaps'.

]

{ #category : 'Grail-Tests' }
ZipappRuntimeGapsTestCase >> testPatchNewCallable [
	"``patch('sys.stdout', new_callable=io.StringIO)'' as a with-statement and
	as a method decorator (test_zipapp test_info_command); its keywords go to
	the callable; a mock class still works; and CPython's refusals beside
	``new'' or ``autospec''."

	self assertMatchesCPythonAt: 'new_callable_with'.
	self assertMatchesCPythonAt: 'new_callable_decorator'.
	self assertMatchesCPythonAt: 'new_callable_keywords'.
	self assertMatchesCPythonAt: 'new_callable_mock_class'.
	self assertMatchesCPythonAt: 'new_callable_refusals'.

]

{ #category : 'Grail-Tests' }
ZipappRuntimeGapsTestCase >> testStatIsCPythons [
	"S_IEXEC and the other aliases zipapp and shutil use, S_IFMT as a
	function, filemode, and the ST_ indices."

	self assertMatchesCPythonAt: 'stat_aliases'.
	self assertMatchesCPythonAt: 'stat_ifmt_is_a_function'.
	self assertMatchesCPythonAt: 'stat_filemode'.
	self assertMatchesCPythonAt: 'stat_ifmt_constants'.
	self assertMatchesCPythonAt: 'stat_st_indices'.

]

{ #category : 'Grail-Tests' }
ZipappRuntimeGapsTestCase >> testStringIOConstructor [
	"initial_value and newline by position and by name, None as empty, and
	CPython's TypeError/ValueError messages for the rest."

	self assertMatchesCPythonAt: 'stringio_constructor'.

]

{ #category : 'Grail-Tests' }
ZipappRuntimeGapsTestCase >> testStringIOTranslatesNewlines [
	"newline=None, '\r' and '\r\n' translate on write, as CPython's do.  This
	used to record a refusal: Grail's StringIO did not translate at all."

	self assertMatchesCPythonAt: 'stringio_newline_translation'.

]
