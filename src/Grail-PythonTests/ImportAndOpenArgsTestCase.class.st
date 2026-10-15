Class {
	#name : 'ImportAndOpenArgsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ImportAndOpenArgsTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ImportAndOpenArgsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'import_and_open_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_and_open_args.py')
		name: 'import_and_open_args'.

]

{ #category : 'Grail-Tests - Controls' }
ImportAndOpenArgsTestCase >> testAnOrdinaryMissingFileIsUnaffected [
	"THE CONTROL: the new check refuses what cannot be a path, not everything
	that fails to open."

	self assertMatchesCPythonAt: 'open_missing_file'.

]

{ #category : 'Grail-Tests - Controls' }
ImportAndOpenArgsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '13 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - __import__ arguments' }
ImportAndOpenArgsTestCase >> testImportChecksItsArguments [
	"A non-string name reached importlib's own scan and died with an
	UNCATCHABLE Smalltalk error out of a builtin -- the caller could neither
	handle it nor see what it meant."

	self assertMatchesCPythonAt: 'import_non_string'.
	self assertMatchesCPythonAt: 'import_empty_name'.
	self assertMatchesCPythonAt: 'import_name_twice'.
	self assertMatchesCPythonAt: 'import_missing_module'.
	self assertMatchesCPythonAt: 'import_nul_in_name'.

]

{ #category : 'Grail-Tests - __import__ keywords' }
ImportAndOpenArgsTestCase >> testImportReadsItsParametersByName [
	"The PARTIAL row is the one that found the latent bug: supplying one
	keyword without the rest raised KeyError for the first one missing, which
	no caller in the corpus had ever done."

	self assertMatchesCPythonAt: 'import_positional'.
	self assertMatchesCPythonAt: 'import_by_name'.
	self assertMatchesCPythonAt: 'import_name_and_level'.
	self assertMatchesCPythonAt: 'import_partial_keywords'.

]

{ #category : 'Grail-Tests - open' }
ImportAndOpenArgsTestCase >> testOpenRefusesAnEmbeddedNul [
	"Both spellings: the bytes one arrives as bytes and the path coercion
	turns it into the bytes object's printString, in which the NUL is no
	longer a NUL -- so a check on the coerced form alone lets it through."

	self assertMatchesCPythonAt: 'open_nul_str'.
	self assertMatchesCPythonAt: 'open_nul_bytes'.

]

{ #category : 'Grail-Tests - Relative imports' }
ImportAndOpenArgsTestCase >> testTheRelativeFallbackWarnsBeforeItFails [
	"THE SAME EMPTY NAME, and it must NOT be the ValueError above: at level 1
	it is ``from . import foo'', which is legal and fails as an ImportError
	about the missing parent.  The warning is asserted with it, because that
	is what says CPython's fallback chain (__package__, then __spec__.parent,
	then a warned guess at __name__) was walked rather than skipped."

	self assertMatchesCPythonAt: 'relative_without_package'.

]
