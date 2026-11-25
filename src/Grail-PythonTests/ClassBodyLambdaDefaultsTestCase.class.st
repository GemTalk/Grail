"A lambda's DEFAULT values in a class body are class-body reads (#2293).
CPython evaluates a lambda's defaults where the lambda is written, so in a
class body ``lambda v=label: v'' takes the class's ``label''; only the lambda's
BODY is a scope of its own, which skips the class.  NameAst >>
___inNestedScopeWithinClassBody___ answered true at any LambdaAst, so a
default read the module's (or the enclosing def's) binding instead.

The tests load tests/python/class_body_lambda_defaults.py and compare every
check with CPython's answer on the IR arm, with its method-local class helpers
built through IR and nothing falling back, and on the text arm
(GRAIL_IR_CODEGEN=0, here its force)."
Class {
	#name : 'ClassBodyLambdaDefaultsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census',
		'registrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyLambdaDefaultsTestCase >> ___disagreementsOf___: aModule [
	"The fixture's checks that disagree with CPython, as printable lines."

	| r expected bad |
	r := aModule @env1:___pyAttrLoad___: #'r'.
	expected := aModule @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Helpers' }
ClassBodyLambdaDefaultsTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyLambdaDefaultsTestCase >> ___keys___ [

	^ #('bound_later' 'class_only' 'comprehension' 'def_default' 'dynamic'
		'inner_body' 'method_local' 'method_local_more' 'module_class'
		'nested_class' 'param_shadow' 'shadow_local' 'sibling_method' 'statements')

]

{ #category : 'Grail-Helpers' }
ClassBodyLambdaDefaultsTestCase >> ___load___: useIR [
	"The fixture, freshly compiled on the IR arm (useIR true, with the census on
	and the class helpers built through IR) or on the text arm."

	| m |
	(importlib @env1:modules) removeKey: #'cbld' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbld'.
	registrySnapshot ifNil: [
		registrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: useIR.
	useIR ifTrue: [importlib ___irClassHelperIRForce___: true].
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: useIR.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_lambda_defaults.py'
		name: 'cbld']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyLambdaDefaultsTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbld' ifAbsent: [].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbld'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultsTestCase >> testTheFixtureAgreesWithCPythonOnText [
	"Every check on the text arm (GRAIL_IR_CODEGEN=0)."

	| bad |
	bad := self ___disagreementsOf___: (self ___load___: false).
	self assert: bad isEmpty
		description: 'class-body lambda defaults disagreeing with CPython on text: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultsTestCase >> testTheFixtureAgreesWithCPythonUnderIR [
	"Every check on the IR arm: defaults read the class, bodies skip it, a
	comprehension's element hides it and its first iterable does not."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true).
	self assert: bad isEmpty
		description: 'class-body lambda defaults disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultsTestCase >> testTheIRArmBuiltItThroughIR [
	"Correct answers prove nothing if the IR arm compiled the fixture from text:
	nothing fell back, every method-local class helper carries the IR marker,
	and no class statement refused its enclosing def."

	| m stats helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: true.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___: m class.
	self assert: helpers size >= 5
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	self assert: (census at: #'th:helper' otherwise: 0) = 0
		description: 'a helper was compiled from text: ' , census printString.
	census keysDo: [:k |
		self deny: (k asString includesString: 'classDef:')
			description: 'a class statement refused its def: ' , census printString]

]
