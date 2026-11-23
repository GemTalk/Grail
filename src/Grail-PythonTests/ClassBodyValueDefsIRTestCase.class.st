"Defs a method-local class body builds as VALUES, and PEP 695 in such a body, in
IR (plan P3.5).  A def in a class-body ``if'' -- and the type-parameter scope
function the parser wraps in one for a generic method, class or alias -- is
built by the nested-def IR emitter as a closure and stored on the class
(ClassBuildIREmitter >> statementNode:); a PEP 695 annotation scope reads the
class namespace through the class variable (NameAst >>
___emitIRAnnotationScopeClassRead___:on:); a ``type X = V'' alias is the
assignment the parser gave it.

The tests load tests/python/class_body_value_defs_ir.py, compare every check
with CPython's answer on the IR arm and with the text helper as the control,
and check that the helpers really were built through IR."
Class {
	#name : 'ClassBodyValueDefsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyValueDefsIRTestCase >> ___disagreementsOf___: aModule [
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
ClassBodyValueDefsIRTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyValueDefsIRTestCase >> ___keys___ [

	^ #('generic_alias' 'generic_bound' 'generic_class' 'generic_decorated'
		'generic_super' 'if_def_decorated' 'if_def_false' 'if_def_late' 'if_def_super' 'if_def_true'
		'class_in_value_def' 'mangled' 'type_alias')

]

{ #category : 'Grail-Helpers' }
ClassBodyValueDefsIRTestCase >> ___load___: irHelpers [
	"The fixture, freshly compiled on the IR arm with the census on, its class
	helpers built through IR or (irHelpers false) from text."

	| m |
	(importlib @env1:modules) removeKey: #'cbvd_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbvd_ir'.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: irHelpers.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_value_defs_ir.py'
		name: 'cbvd_ir']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyValueDefsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbvd_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbvd_ir'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyValueDefsIRTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm with the helpers built through IR: defs in a
	class-body ``if'', type aliases, generic methods, classes and aliases."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true).
	self assert: bad isEmpty
		description: 'class-body value defs disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyValueDefsIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, or
	if the enclosing defs fell back to it: every helper -- a generic class's
	inside its scope function included -- carries the IR marker, nothing fell
	back, the census counts no text helper, and no class statement refused
	its enclosing def."

	| m stats helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: true.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___: m class.
	self assert: helpers size >= 9
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	self assert: (census at: #'th:irHelper' otherwise: 0) >= 9
		description: 'census: ' , census printString.
	self assert: (census at: #'th:helper' otherwise: 0) = 0
		description: 'a helper was compiled from text: ' , census printString.
	census keysDo: [:k |
		self deny: (k asString includesString: 'classDef:')
			description: 'a class statement refused its def: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyValueDefsIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control.  A def built as a value that reads an enclosing
	variable closes over the text helper's copy, so its enclosing def stays on
	text (classDef:deferredRead); either way every check gives CPython's answer."

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
		description: 'class-body value defs disagreeing with CPython on the text helper: '
			, bad asArray printString

]
