"A method-local class body reading and writing the ENCLOSING function's
variables, in IR (plan P3.5).  The helper is handed each carried capture as a
reader block and keeps a copy of it for the class body; every read now goes
through the block (ClassBuildIREmitter >> carriedLeaf:cell:), so a lambda, a
generator expression or a PEP 649 annotation that runs later, and a class-body
read after a call that rebinds the variable, see the binding as it is then
(#2292).  The class-body ``global'' and ``nonlocal'' declarations, ``__class__''
/ ``__classdict__'' read from a lambda in the body, and a call of a def the body
binds are built through IR too.

The tests load tests/python/class_body_captures_ir.py, compare every check
with CPython's answer on the IR arm and with the text helper as the control,
check that the helpers really were built through IR, and that a TEXT helper
whose build reads a carried name late keeps its enclosing def on text
(classDef:deferredRead), since the text helper still closes over the copy."
Class {
	#name : 'ClassBodyCapturesIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyCapturesIRTestCase >> ___disagreementsOf___: aModule [
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
ClassBodyCapturesIRTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyCapturesIRTestCase >> ___keys___ [

	^ #('annotation_late' 'dunder_class_decls' 'eager_after_call' 'global_decl'
		'lambda_late' 'method_nonlocal_late' 'nested_late' 'nonlocal_late'
		'nonlocal_param' 'nonlocal_then_read' 'own_cells' 'sibling_calls')

]

{ #category : 'Grail-Helpers' }
ClassBodyCapturesIRTestCase >> ___load___: irHelpers [
	"The fixture, freshly compiled on the IR arm with the census on, its class
	helpers built through IR or (irHelpers false) from text."

	| m |
	(importlib @env1:modules) removeKey: #'cbcap_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbcap_ir'.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: irHelpers.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_captures_ir.py'
		name: 'cbcap_ir']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyCapturesIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbcap_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbcap_ir'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyCapturesIRTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm with the helpers built through IR."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true).
	self assert: bad isEmpty
		description: 'class-body captures disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyCapturesIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, or
	if the enclosing defs fell back to it: every helper carries the IR marker,
	nothing fell back, the census counts no text helper, and no class
	statement refused its enclosing def."

	| m stats helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: true.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___: m class.
	self assert: helpers size >= 13
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	self assert: (census at: #'th:irHelper' otherwise: 0) >= 13
		description: 'census: ' , census printString.
	self assert: (census at: #'th:helper' otherwise: 0) = 0
		description: 'a helper was compiled from text: ' , census printString.
	census keysDo: [:k |
		self deny: (k asString includesString: 'classDef:')
			description: 'a class statement refused its def: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyCapturesIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control.  The text helper still closes over its copy of a
	carried capture, so a def whose class reads one late stays on text
	(classDef:deferredRead); either way every check gives CPython's answer."

	| m helpers bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: false.
	helpers := self ___helpersOf___: m class.
	self deny: helpers isEmpty.
	helpers keysAndValuesDo: [:sel :meth |
		self deny: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was built through IR with the class helper off'].
	self assert: (census at: #'classDef:deferredRead' otherwise: 0) >= 1
		description: 'census: ' , census printString.
	bad := self ___disagreementsOf___: m.
	self assert: bad isEmpty
		description: 'class-body captures disagreeing with CPython on the text helper: '
			, bad asArray printString

]
