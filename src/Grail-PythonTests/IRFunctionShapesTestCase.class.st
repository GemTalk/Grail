"
P1.2 of the IR-only codegen plan, the function / closure / lambda shapes:
tests/python/ir_function_shapes.py holds one shape per census row this cut
retired, each reached through a top-level def or a method (a module body is
still text and would prove nothing).

Three things are asserted, each on its own, because each is satisfied by a
different wrong build:

  * the values agree with CPython 3.14 under the IR seam FORCED on -- the
    fixture's EXPECTED table, which scripts/check_python_fixtures.sh measures;
  * the same values come out of the TEXT path, so the two arms of one source
    cannot drift (two of the shapes, a captured ``self'' and a bare decorator
    spelled like its def, were wrong in the text too and are fixed there);
  * the eligibility CENSUS records no refusal at all for the fixture, and the
    seam fell back to text for nothing -- a right value from a text build is
    the thing a value test cannot see.

The ``@smalltalk'' forwarder needs a Smalltalk target class, so its census
check loads the existing smalltalk_forwarder.py fixture instead.
"
Class {
	#name : 'IRFunctionShapesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'registrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRFunctionShapesTestCase >> ___censusOf___: aFixtureName as: aModuleName [
	"Load tests/python/<aFixtureName>.py with the seam forced on and the census
	collecting; answer { this module's census rows. ___irStats___. the module }.
	The module's OWN rows (#byModule), so a stdlib module the fixture happens to
	compile on the way cannot speak for it."

	| mod |
	mod := self ___load___: aFixtureName as: aModuleName ir: true census: true.
	^ { (importlib ___irCensus___ at: #byModule)
			at: aModuleName ifAbsent: [KeyValueDictionary new].
		importlib ___irStats___.
		mod }

]

{ #category : 'Grail-Private' }
IRFunctionShapesTestCase >> ___disagreementsIn___: aModule [
	"Every fixture key whose value differs from EXPECTED, as readable strings."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: k) @env0:asString.
		want := ((aModule @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: k) @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Private' }
IRFunctionShapesTestCase >> ___keys___ [
	"Named rather than read from the fixture, so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('no_positional_reads_enclosing_self' 'kwargs_only_reads_enclosing_self'
	    'default_reads_enclosing_self'
	    'del_self_then_read' 'del_self_then_rebind'
	    'lambda_generator' 'lambda_generator_with_args'
	    'lambda_walrus' 'lambda_walrus_reads_enclosing' 'lambda_walrus_does_not_leak'
	    'lambda_walrus_read_before_bind' 'lambda_walrus_rebinds_parameter'
	    'decorator_reads_own_unbound_name' 'decorator_lambda_parameter'
	    'decorator_is_a_property_of_the_name' 'decorator_bare_name_is_the_def'
	    'decorator_chain_reads_own_name'
	    'decorated_global' 'chain_decorated_global'
	    'nested_super_beside_a_lambda' 'nested_super_beside_a_def'
	    'late_bound_decorator' 'missing_decorator'
	    'nonlocal_del_local' 'nonlocal_del_parameter' 'nonlocal_del_then_rebind')

]

{ #category : 'Grail-Private' }
IRFunctionShapesTestCase >> ___load___: aFixtureName as: aModuleName ir: irBoolean census: censusBoolean [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: aModuleName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aModuleName.
	registrySnapshot ifNil: [registrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: irBoolean.
	importlib ___irStatsReset___.
	censusBoolean ifTrue: [
		importlib ___irCensusReset___.
		importlib ___irCensusOn: true].
	^ [importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/' , aFixtureName , '.py'
		name: aModuleName]
		ensure: [censusBoolean ifTrue: [importlib ___irCensusOn: false]]

]

{ #category : 'Grail-Private' }
IRFunctionShapesTestCase >> ___moduleNames___ [
	^ #('ir_function_shapes_ir' 'ir_function_shapes_text' 'ir_function_shapes_census'
	    'ir_function_shapes_forwarder')

]

{ #category : 'Grail-Private' }
IRFunctionShapesTestCase >> ___refusalsIn___: counts [
	"Every census row that is a REFUSAL: anything but a compiled def, an
	eligible class method, and the bookkeeping rows (nested defs counted,
	class methods seen, and the prefixed what-is-still-text rows)."

	| allowed |
	allowed := #(#compiled #'cm:eligible' #nestedDef #classMethod).
	^ (counts keys select: [:k |
		(allowed includes: k) not
			and: [(#('ms:' 'cs:' 'th:' 'in:' 'lit:' 'by:' 'tx:')
				anySatisfy: [:p | k asString beginsWith: p]) not]])
		asSortedCollection asArray

]

{ #category : 'Grail-Setup' }
IRFunctionShapesTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irCensusOn: false.
	self ___moduleNames___ do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: []].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___moduleNames___ do: [:n | self ___forgetCanonicalModule___: n]

]

{ #category : 'Grail-Tests' }
IRFunctionShapesTestCase >> testEveryShapeAgreesWithCPythonOnTheTextPath [
	"The oracle the IR arm is held to.  Two shapes were wrong HERE before this
	cut, identically in both arms: a no-positional def's captured ``self''
	(read as the receiver) and ``@h def h()'' (applied the new function to
	itself)."

	| bad |
	bad := self ___disagreementsIn___:
		(self ___load___: 'ir_function_shapes' as: 'ir_function_shapes_text' ir: false census: false).
	self assert: bad isEmpty
		description: 'text path disagrees with CPython: ' , bad asArray printString

]

{ #category : 'Grail-Tests' }
IRFunctionShapesTestCase >> testEveryShapeAgreesWithCPythonUnderIR [
	| bad |
	bad := self ___disagreementsIn___:
		(self ___load___: 'ir_function_shapes' as: 'ir_function_shapes_ir' ir: true census: false).
	self assert: bad isEmpty
		description: 'IR path disagrees with CPython: ' , bad asArray printString

]

{ #category : 'Grail-Tests' }
IRFunctionShapesTestCase >> testNoShapeIsRefusedOrFallsBack [
	"The instrument a value test cannot replace: every def of the fixture,
	top-level and class-body, is BUILT through IR.  Before this cut the census
	read method:noSelfNamesReceiver, signature:defaultReadsLocal,
	method:selfDeleted, LambdaAst:yield, NamedExprAst:scope (a walrus in a
	lambda), nestedDef:decoratorReadsOwnName, nestedDef:moduleScopeTargetDecorated,
	nestedDef:super, nestedDef:decorator and NonlocalAst:del here."

	| result refusals stats |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	result := self ___censusOf___: 'ir_function_shapes' as: 'ir_function_shapes_census'.
	refusals := self ___refusalsIn___: (result at: 1).
	stats := result at: 2.
	self assert: refusals isEmpty
		description: 'census refusals: ' , refusals printString.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'

]

{ #category : 'Grail-Tests' }
IRFunctionShapesTestCase >> testSmalltalkForwardersAreBuiltThroughIR [
	"``@smalltalk'' forwarders (method:smalltalkForwarder): instance, keyword,
	binary, @classmethod and @staticmethod forms, all built through IR and all
	still answering what SmalltalkForwarderTestCase pins for the text."

	| result refusals stats mod |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	result := self ___censusOf___: 'smalltalk_forwarder' as: 'ir_function_shapes_forwarder'.
	refusals := self ___refusalsIn___: (result at: 1).
	stats := result at: 2.
	self assert: refusals isEmpty
		description: 'census refusals: ' , refusals printString.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	mod := result at: 3.
	self assert: (mod @env1:r_derived_unary) equals: 'pong'.
	self assert: (mod @env1:r_explicit_unary) equals: 'pong'.
	self assert: (mod @env1:r_keyword_one_arg) equals: 42.
	self assert: (mod @env1:r_keyword_two_args) equals: 42.
	self assert: (mod @env1:r_nil_is_none) equals: true.
	self assert: (mod @env1:r_binary_same) equals: true.
	self assert: (mod @env1:r_binary_diff) equals: false.
	self assert: (mod @env1:r_classmethod_same) equals: true.
	self assert: (mod @env1:r_static_derived) equals: 'beacon'.
	self assert: (mod @env1:r_static_keyword) equals: 42

]
