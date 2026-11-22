"locals() and vars() in a method-local class body, in IR (plan P3.6).  A class
body that calls either one can bind a name no statement in it names
(``locals()['x'] = 43''), so it is built in a dynamic-read mode
(CallAst classBodyDynamicLocals): every class-body name read asks the class
first for such a name (NameAst >> ___emitClassBodyDynamicReadWith___:), and
the call answers the names bound so far, connected to the class (CallAst >>
___emitClassBodyLocalsWith___:).  Both are one description the text and the
IR-built helper share.

The tests load tests/python/class_body_locals_ir.py, compare every check
with CPython's answer on the IR arm and with the text helper as the control,
and check that the helpers really were built through IR."
Class {
	#name : 'ClassBodyLocalsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyLocalsIRTestCase >> ___disagreementsOf___: aModule [
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
ClassBodyLocalsIRTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyLocalsIRTestCase >> ___keys___ [

	^ #('captures' 'default_and_decorator' 'enum_period' 'enum_update' 'in_for' 'in_if'
		'local_names' 'local_write_read' 'mapping_ops' 'nested_class' 'no_free_vars'
		'reads_after' 'top_locals' 'top_vars' 'update' 'vars_of_object')

]

{ #category : 'Grail-Helpers' }
ClassBodyLocalsIRTestCase >> ___load___: irHelpers [
	"The fixture, freshly compiled on the IR arm with the census on, its class
	helpers built through IR or (irHelpers false) from text."

	| m |
	(importlib @env1:modules) removeKey: #'cbl_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbl_ir'.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: irHelpers.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_locals_ir.py'
		name: 'cbl_ir']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyLocalsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbl_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbl_ir'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsIRTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm with the helpers built through IR: locals() and
	vars() in a class body, reads after a write through them, writes in a
	class-body ``if'' and ``for'', captures, mapping operations, Enum."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true).
	self assert: bad isEmpty
		description: 'class-body locals() disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsIRTestCase >> testTheHelpersWereBuiltThroughIR [
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
	self assert: helpers size >= 15
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	self assert: (census at: #'th:irHelper' otherwise: 0) >= 15
		description: 'census: ' , census printString.
	self assert: (census at: #'th:helper' otherwise: 0) = 0
		description: 'a helper was compiled from text: ' , census printString.
	census keysDo: [:k |
		self deny: (k asString includesString: 'classDef:')
			description: 'a class statement refused its def: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyLocalsIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control -- and the text helper gives CPython's answers for
	every check too."

	| m helpers bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: false.
	helpers := self ___helpersOf___: m class.
	self deny: helpers isEmpty.
	helpers keysAndValuesDo: [:sel :meth |
		self deny: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was built through IR with the class helper off'].
	bad := self ___disagreementsOf___: m.
	self assert: bad isEmpty
		description: 'class-body locals() disagreeing with CPython on the text helper: '
			, bad asArray printString

]
