"A walrus in a lambda's DEFAULT in a class body binds a class attribute
(#2345).  CPython evaluates a lambda's defaults where the lambda is written, so
``g = lambda v=(w := label): v'' binds ``w'' in the class namespace; only the
lambda's BODY is a scope of its own.  Grail ended every class-body scope walk at
any LambdaAst, whichever part of it the walrus was in, and emitted a bare ``w
:= label'' into the class build: an undeclared temp, so the whole module failed
to compile (CompileError 1001, uncatchable).  A def's defaults and decorators
had the same fault one node over.

The tests load tests/python/class_body_lambda_default_walrus.py and compare
every check with CPython's answer on the text arm (GRAIL_IR_CODEGEN=0, here its
force), on the IR arm, and on the IR arm with the method-local class helpers
compiled from text (GRAIL_IR_CLASS_HELPER=0).  A method-local class whose body
holds such a walrus refuses its enclosing def as ``classDef:walrus'', exactly as
one with a plain class-body walrus does: that def is compiled from text by
design, not by a fallback."
Class {
	#name : 'ClassBodyLambdaDefaultWalrusTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census',
		'registrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyLambdaDefaultWalrusTestCase >> ___disagreementsOf___: aModule [
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
ClassBodyLambdaDefaultWalrusTestCase >> ___keys___ [

	^ #('body_reads' 'body_reads_error' 'body_reads_module' 'declared'
		'def_default' 'inner_body' 'lambda_body' 'method_local' 'method_local_def'
		'module_class' 'nested_class' 'statements' 'syntax_errors')

]

{ #category : 'Grail-Helpers' }
ClassBodyLambdaDefaultWalrusTestCase >> ___load___: useIR helpers: irHelpers [
	"The fixture, freshly compiled on the IR arm (useIR true, with the census on
	and the class helpers built through IR when irHelpers is true) or on the
	text arm."

	| m |
	(importlib @env1:modules) removeKey: #'cbldw' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbldw'.
	registrySnapshot ifNil: [
		registrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: useIR.
	useIR ifTrue: [importlib ___irClassHelperIRForce___: irHelpers].
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: useIR.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_lambda_default_walrus.py'
		name: 'cbldw']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyLambdaDefaultWalrusTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbldw' ifAbsent: [].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbldw'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultWalrusTestCase >> testTheFixtureAgreesWithCPythonOnText [
	"Every check on the text arm (GRAIL_IR_CODEGEN=0)."

	| bad |
	bad := self ___disagreementsOf___: (self ___load___: false helpers: false).
	self assert: bad isEmpty
		description: 'class-body lambda-default walruses disagreeing with CPython on text: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultWalrusTestCase >> testTheFixtureAgreesWithCPythonUnderIR [
	"Every check on the IR arm, the method-local class helpers built through IR
	where the class allows it."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true helpers: true).
	self assert: bad isEmpty
		description: 'class-body lambda-default walruses disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultWalrusTestCase >> testTheFixtureAgreesWithCPythonWithTextHelpers [
	"Every check on the IR arm with GRAIL_IR_CLASS_HELPER=0 (here, its force):
	every method-local class helper compiled from text."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true helpers: false).
	self assert: bad isEmpty
		description: 'class-body lambda-default walruses disagreeing with CPython with text helpers: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyLambdaDefaultWalrusTestCase >> testTheIRArmDidNotFallBack [
	"Nothing fell back to text on the IR arm.  The only class statements that
	refuse their def are the method-local classes whose body binds a walrus
	(``classDef:walrus'', a P3 row this change leaves as it was), and a walrus
	in a class body is now seen in a lambda's or def's default too."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___load___: true helpers: true.
	self assert: ((importlib ___irStats___) at: #fallbacks) = 0
		description: 'IR fell back to text: ' , ((importlib ___irStats___) at: #lastError) printString.
	self assert: (census at: #'classDef:walrus' otherwise: 0) >= 1
		description: 'census: ' , census printString.
	census keysDo: [:k |
		((k asString includesString: 'classDef:') and: [k ~~ #'classDef:walrus'])
			ifTrue: [self assert: false description: 'a class statement refused its def: '
				, census printString]]

]
