"Class-body statements a method-local class body runs and binds names with, in
IR (plan P3.7a): imports (in the body, an ``if'', a ``try'' and a nested class),
``match'', ``except*'', unpacking, a parenthesised annotation target, an
annotated name in a loop, Grail's ``__transient__'' / ``__renamed__'',
``__slots__'' in a branch, re-classed and setter defs in a branch, a class in a
branch, and defs and classes in a loop, a ``try'' and a ``with''.  Each kept the
helper compiled from text until P3.7a.

The tests load tests/python/class_body_runtime_bindings_ir.py, compare every
check with CPython's answer on the IR arm and on the text arm, and check that
the helpers really were built through IR."
Class {
	#name : 'ClassBodyRuntimeBindingsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyRuntimeBindingsIRTestCase >> ___disagreementsOf___: aModule [
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
ClassBodyRuntimeBindingsIRTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyRuntimeBindingsIRTestCase >> ___keys___ [

	^ #('del_def' 'except_star' 'if_class_false' 'if_class_true' 'if_classmethod' 'if_def_header'
		'if_property_setter' 'if_slots_false' 'if_slots_true' 'if_staticmethod' 'import_body'
		'import_if_false' 'import_if_true' 'import_nested' 'import_try' 'loop_annotation'
		'loop_chain' 'loop_class' 'loop_def' 'match_long' 'match_map' 'match_other' 'match_short'
		'paren_annotation' 'persistence_names' 'try_class' 'try_def' 'try_staticmethod' 'unpack'
		'with_def')

]

{ #category : 'Grail-Helpers' }
ClassBodyRuntimeBindingsIRTestCase >> ___load___: irCodegen [
	"The fixture, freshly compiled with the census on: on the IR arm, its class
	helpers built through IR, or (irCodegen false) on the text arm."

	| m |
	(importlib @env1:modules) removeKey: #'cbrb_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbrb_ir'.
	importlib ___irCodegenForce___: irCodegen.
	importlib ___irClassHelperIRForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_runtime_bindings_ir.py'
		name: 'cbrb_ir']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyRuntimeBindingsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbrb_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbrb_ir'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyRuntimeBindingsIRTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm with the helpers built through IR."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true).
	self assert: bad isEmpty
		description: 'class-body runtime bindings disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyRuntimeBindingsIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, or
	if the enclosing defs fell back to it: every helper carries the IR
	marker, nothing fell back, the census counts no text helper, and no class
	statement refused its enclosing def."

	| m stats helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: true.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___: m class.
	self assert: helpers size >= 25
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	self assert: (census at: #'th:irHelper' otherwise: 0) >= 25
		description: 'census: ' , census printString.
	self assert: (census at: #'th:helper' otherwise: 0) = 0
		description: 'a helper was compiled from text: ' , census printString.
	census keysDo: [:k |
		self deny: (k asString includesString: 'classDef:')
			description: 'a class statement refused its def: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyRuntimeBindingsIRTestCase >> testTheTextArmAgreesWithCPython [
	"Every check with IR codegen off (GRAIL_IR_CODEGEN=0's arm), where the
	class is built inline in its enclosing method's text."

	| bad |
	bad := self ___disagreementsOf___: (self ___load___: false).
	self assert: bad isEmpty
		description: 'class-body runtime bindings disagreeing with CPython on the text arm: '
			, bad asArray printString

]
