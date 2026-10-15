Class {
	#name : 'TypeAliasTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - type alias' }
TypeAliasTestCase >> ___censusAndResultsUnderForcedIR___ [
	"Load the same fixture with the seam FORCED on and the census collecting;
	answer { the census counts. the fixture's r }."

	| census mod |
	(importlib @env1:modules) removeKey: #'type_alias_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'type_alias_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	mod := [importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_alias.py')
		name: 'type_alias_ir'] ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___.
	^ { census at: #counts. mod @env1:___pyAttrLoad___: #'r' }

]

{ #category : 'Grail-Private' }
TypeAliasTestCase >> assertMatchesCPythonAt: key [
	"Compare repr against the fixture's own EXPECTED entry -- CPython's
	actual output."

	self
		assert: ((builtins @env1:instance) @env1:repr:
			((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key)) asString
		equals: ((testModule @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: key) asString

]

{ #category : 'Grail-Setup' }
TypeAliasTestCase >> setUp [
	"Reload tests/python/type_alias.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_alias' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_alias.py')
		name: 'type_alias'.

]

{ #category : 'Grail-Tests - type alias' }
TypeAliasTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'type_alias_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'type_alias_ir'

]

{ #category : 'Grail-Tests - Laziness' }
TypeAliasTestCase >> testAnAliasWhoseValueIsNoneIsStillOnlyEvaluatedOnce [
	"``type C1 = None'' -- test_annotationlib writes it twice.  A once-cache
	that asks ``is the stored value nil?'' cannot tell ``not yet run'' from
	``ran and answered None'', and re-runs the thunk on every access."

	self assertMatchesCPythonAt: 'none_value'.
	self assertMatchesCPythonAt: 'none_value_again'.

]

{ #category : 'Grail-Tests - The alias object' }
TypeAliasTestCase >> testNameAndReprAndTypeParamsAreAttributesNotMethods [
	"repr() is the BARE NAME -- CPython prints ``Alias'', not a
	constructor-shaped string, and annotation formatting depends on it.
	__name__ and __type_params__ read as values; as zero-arg methods they
	answered a BoundMethod, which prints without complaint."

	self assertMatchesCPythonAt: 'repr'.
	self assertMatchesCPythonAt: 'name'.
	self assertMatchesCPythonAt: 'type_params'.

]

{ #category : 'Grail-Tests - Binding' }
TypeAliasTestCase >> testTheAliasBindsItsNameLikeAnAssignment [
	"A type alias binds exactly as an assignment does, so at module scope
	it is an ordinary module global.  Emitting a plain ``X := ...'' instead
	of routing through AssignAst reproduced none of that cascade, and a
	module-level ``type X = int'' compiled to an undefined symbol."

	self assertMatchesCPythonAt: 'is_a_module_global'.

]

{ #category : 'Grail-Tests - type alias' }
TypeAliasTestCase >> testTheStatementCompilesThroughIR [
	"THE TESTS ABOVE PASS ON EITHER PATH.  Neither TypeAliasAst nor
	TypeAliasValueAst had any IR protocol, so every def holding a type alias
	refused eligibility and compiled as TEXT -- which handles all of this
	already, so every value was right and nothing said the IR arm had never
	run.

	Two assertions.  The CENSUS one says the refusal is gone, naming BOTH rows:
	giving the statement its protocol first moved `stmt:TypeAliasAst' to
	`value:TypeAliasValueAst' with cm:eligible unchanged at 660 -- the row
	moved one node down rather than closing, which a count cannot see.  The
	RESULTS one says the emit that replaced it is right, over the same keys the
	text arm checks.

	``lazy_forward_reference'' and ``lazy_in_a_function'' are the two that
	matter most: the value lives in a THUNK, and an emit that evaluated it
	eagerly would turn a legal forward reference into a NameError at the point
	of definition while passing every other check here."

	| pair counts results present |
	pair := self ___censusAndResultsUnderForcedIR___.
	counts := pair at: 1.
	results := pair at: 2.
	#('repr' 'name' 'type_params' 'none_value' 'none_value_again'
	  'lazy_forward_reference' 'is_a_module_global' 'in_a_function'
	  'lazy_in_a_function' 'in_a_method') do: [:key |
		self assert: ((results @env1:__getitem__: key) @env1:__repr__ @env0:asString)
			equals: ((testModule @env1:___pyAttrLoad___: #'EXPECTED')
				@env1:__getitem__: key) @env0:asString
			description: 'under forced IR: ' , key].
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	present := #('stmt:TypeAliasAst' 'cm:stmt:TypeAliasAst'
		'value:TypeAliasValueAst' 'cm:value:TypeAliasValueAst') select: [:row |
			(counts at: row asSymbol otherwise: 0) > 0].
	self assert: present isEmpty
		description: 'a type-alias refusal is still in the census: '
			, (present collect: [:r | r , '=' ,
				(counts at: r asSymbol otherwise: 0) printString]) asArray printString

]

{ #category : 'Grail-Tests - Laziness' }
TypeAliasTestCase >> testTheValueIsEvaluatedLazily [
	"The alias is defined BEFORE the name it refers to exists.  An eager
	implementation raises NameError at the definition, so this is the
	check that the thunk is real."

	self assertMatchesCPythonAt: 'lazy_forward_reference'.

]

{ #category : 'Grail-Tests - Soft keyword' }
TypeAliasTestCase >> testTypeRemainsTheBuiltin [
	"``type'' opens a type alias in exactly one position and stays the
	builtin everywhere else -- called, passed to isinstance, and read as a
	value."

	self assertMatchesCPythonAt: 'builtin_call'.
	self assertMatchesCPythonAt: 'builtin_isinstance'.
	self assertMatchesCPythonAt: 'builtin_as_value'.

]
