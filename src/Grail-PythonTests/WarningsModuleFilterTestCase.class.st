Class {
	#name : 'WarningsModuleFilterTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
WarningsModuleFilterTestCase >> assertMatchesCPythonAt: key [
	self
		assert: ((builtins @env1:instance) @env1:repr:
			((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key)) asString
		equals: ((testModule @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: key) asString

]

{ #category : 'Grail-Setup' }
WarningsModuleFilterTestCase >> setUp [
	"Reload tests/python/warnings_module_filter.py fresh each test.

	The fixture installs and removes its own filters inside
	catch_warnings(), so a test cannot leak an ``error'' filter into the
	rest of the suite."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warnings_module_filter' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_module_filter.py')
		name: 'warnings_module_filter'.

]

{ #category : 'Grail-Tests - Scoping' }
WarningsModuleFilterTestCase >> testAFilterNamingAnotherModuleDoesNotFire [
	"The other half of scoping: a module-scoped filter must leave warnings
	from everywhere else alone.  Treating an unevaluatable constraint as
	SATISFIED would fail here -- it silently widens every such filter,
	turning unrelated warnings into errors far from their cause."

	self assertMatchesCPythonAt: 'unrelated_name'.

]

{ #category : 'Grail-Tests - Scoping' }
WarningsModuleFilterTestCase >> testAFilterNamingTheRaisingModuleFires [
	"The case the whole feature exists for, and the one a skipped filter
	got wrong: a warning from the named module IS escalated."

	self assertMatchesCPythonAt: 'exact_name'.

]

{ #category : 'Grail-Tests - Signature' }
WarningsModuleFilterTestCase >> testAMissingActionIsATypeError [
	"``action'' is required; CPython raises rather than installing a filter
	that matches everything with no action."

	self assertMatchesCPythonAt: 'missing_action'.

]

{ #category : 'Grail-Tests - Scoping' }
WarningsModuleFilterTestCase >> testAnEmptyPatternMeansNoConstraint [
	"CPython's default is the EMPTY REGEX, which matches every string.  An
	implementation reading it as ``matches only the empty string'' makes
	``filterwarnings('error', '')'' match nothing at all."

	self assertMatchesCPythonAt: 'empty_means_no_constraint'.

]

{ #category : 'Grail-Tests - Scoping' }
WarningsModuleFilterTestCase >> testAPathIsNotAModuleName [
	"``module='' is matched against the dotted __name__, never the
	filename.  This is the check that catches the plausible wrong
	implementation: matching co_filename passes every hand-written probe
	and then scopes every real filter to a string no caller writes, so the
	filter silently never fires."

	self assertMatchesCPythonAt: 'a_path_is_not_a_name'.

]

{ #category : 'Grail-Tests - Signature' }
WarningsModuleFilterTestCase >> testAppendPutsTheFilterLast [
	"``append=True'' adds at the END of the list, so an earlier filter
	still wins.  It was unavailable at any arity, and without it the two
	orderings are indistinguishable."

	self assertMatchesCPythonAt: 'append_goes_last'.

]

{ #category : 'Grail-Tests - Signature' }
WarningsModuleFilterTestCase >> testTheFullSignatureIsAccepted [
	"action, message, category, module, lineno, append -- by position or
	by keyword.  Only fixed-arity positional forms existed, so
	``filterwarnings('error', module=...)'' raised a TypeError about the
	argument count and errored all 20 of test_global's tests in setUp."

	self assertMatchesCPythonAt: 'keyword_module'.
	self assertMatchesCPythonAt: 'all_six_positional'.
	self assertMatchesCPythonAt: 'keyword_append'.

]

{ #category : 'Grail-Tests - Scoping' }
WarningsModuleFilterTestCase >> testTheMatchIsAnchoredSoAPrefixCounts [
	"CPython compiles the pattern and applies #match, which is anchored at
	the START -- so a prefix of the module name matches, and a substring
	appearing later in it does not."

	self assertMatchesCPythonAt: 'name_prefix'.

]
