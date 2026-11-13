"ClassBuildIREmitter, the IR backend of the class-build emitter (plan P3.2),
and the method-local class helper it builds.

The operation tests build small methods through the backend on a throwaway
class and run them, so each construct is checked by what it DOES; the
refusal tests pin the stack discipline and the child-node rule.  The fixture
tests load tests/python/method_local_class_ir.py on the IR arm and compare
every check with CPython's answer, and check that the helpers really were
built through IR -- correct answers from a text helper would prove nothing."
Class {
	#name : 'ClassBuildIREmitterTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probeClass',
		'module'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBuildIREmitterTestCase >> ___fixtureModule___ [
	"tests/python/method_local_class_ir.py, compiled on the IR arm with the
	class helper built through IR."

	module ifNotNil: [^ module].
	(importlib @env1:modules) removeKey: #'mlc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mlc_ir'.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: true.
	importlib ___irStatsReset___.
	module := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/method_local_class_ir.py'
		name: 'mlc_ir'.
	^ module

]

{ #category : 'Grail-Helpers' }
ClassBuildIREmitterTestCase >> ___helpersOf___: aClass [
	"aClass's method-local class helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBuildIREmitterTestCase >> ___run___: aOneArgBlock [
	"Build a unary method #probe on the throwaway class through the IR backend
	-- aOneArgBlock emits its statements and leaves its result on the stack --
	install it and answer what it returns."

	| b e |
	b := PyMethodIRBuilder class: probeClass selector: #probe env: 1.
	e := ClassBuildIREmitter on: b.
	b tempNamed: #'t'.
	aOneArgBlock value: e.
	e assertDepth: 0.
	b add: (b return: (b localVar: #'t')).
	b install.
	^ probeClass new perform: #probe env: 1

]

{ #category : 'Grail-Setup' }
ClassBuildIREmitterTestCase >> setUp [

	super setUp.
	probeClass := Object subclass: 'GrailClassBuildIRProbe'
		instVarNames: #() classVars: #() classInstVars: #()
		poolDictionaries: #() inDictionary: nil options: #()

]

{ #category : 'Grail-Setup' }
ClassBuildIREmitterTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'mlc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mlc_ir'.
	module := nil.
	probeClass := nil.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testAnExpressionBlockMustLeaveOneValue [
	"The value stack is how the backend gets a sub-expression's node without
	trusting what the block answers, so a block that leaves no value, or two,
	refuses at the emit rather than building the wrong tree."

	self should: [self ___run___: [:e | e statement: [e var: 'nil'. e var: 'nil']]]
		raise: Error.
	self should: [self ___run___: [:e | e statement: [nil]]]
		raise: Error.
	self should: [self ___run___: [:e |
			e statement: [e send: #printString env: 0 to: [nil]]]]
		raise: Error

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testAnUnknownNameAndAWrongCloseAreRefused [

	self should: [self ___run___: [:e |
			e statement: [e var: '___noSuchGlobalAnywhere___']]]
		raise: Error.
	self should: [self ___run___: [:e |
			e statement: [e assign: 'Python' from: [e integer: 1]]]]
		raise: Error.
	self should: [self ___run___: [:e |
			e openValueBlock: #('x').
			e closeIfTrue]]
		raise: Error

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testBlocksConditionalsAndOpenPairsRun [

	self assert: (self ___run___: [:e |
			e openValueBlock: #('x').
			e statement: [e assign: 'x' from: [e integer: 4]].
			e openIfTrue: [e send: #'>' env: 0 to: [e var: 'x'] with: {[e integer: 3]}].
			e statement: [e assign: 't' from: [
				e ifTrue: [e boolean: false] do: [e integer: 1] ifFalse: [e var: 'x']]].
			e closeIfTrue.
			e closeValueBlock])
		equals: 4.
	self assert: (self ___run___: [:e |
			e statement: [e assign: 't' from: [
				e send: #value: env: 0
					to: [e blockWithArgs: #('a') temps: #('b') do: [
						e statement: [e assign: 'b' from: [
							e send: #'+' env: 0 to: [e var: 'a'] with: {[e integer: 1]}]].
						e var: 'b']]
					with: {[e integer: 41]}]]])
		equals: 42.
	self assert: (self ___run___: [:e |
			e statement: [e assign: 't' from: [
				e send: #value env: 0 to: [e block: [e string: 'blk']]]]])
		equals: 'blk'

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testChildNodesAreConstantsOrValuesTheCallerEvaluated [
	"A child node is either a value the helper's caller evaluated (pre:at:) or a
	constant; anything else needs the class-body namespace, and refuses."

	| node |
	self assert: (self ___run___: [:e |
			e statement: [e assign: 't' from: [
				e parenthesizedNode: (ConstantAst new value: 7; kind: nil; yourself)]]])
		equals: 7.
	node := NameAst new.
	self should: [self ___run___: [:e |
			e statement: [e assign: 't' from: [e expressionNode: node]]]]
		raise: Error.
	self assert: (self ___run___: [:e |
			e pre: node at: (e ___leafNamed___: 't').
			e statement: [e assign: 't' from: [e integer: 9]].
			e statement: [e assign: 't' from: [
				e send: #'*' env: 0 to: [e expressionNode: node] with: {[e integer: 2]}]]])
		equals: 18.
	self should: [self ___run___: [:e | e statementNode: node]] raise: Error

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testLiteralsSendsAndCascades [

	self assert: (self ___run___: [:e |
			e statement: [e assign: 't' from: [
				e braceArray: {
					[e symbolArray: #('a' 'nil' 'true')].
					[e quotedSymbolArray: #('b')].
					[e stringArray: #('s')].
					[e symbolPairArray: #(#('x' 'y'))].
					[e emptyArray].
					[e symbol: 'k:'].
					[e stringIndentedByStream: 'it''s'].
					[e cascadeTo: [e send: #new env: 0 to: [e var: 'OrderedCollection']]
						sends: { { #add:. {[e integer: 1]}. 0 }. { #yourself. #(). 0 } }]}]]])
		equals: { #(#a nil true). #(#b). #('s'). #(#(#x #y)). #(). #'k:'. 'it''s'.
			OrderedCollection new add: 1; yourself }

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testTheFixtureAgreesWithCPython [
	"Every check of method_local_class_ir.py, on the IR arm: CPython's header
	order, the decorator's own line (#1518), no class-body frame for an error
	raised while the class is built, and the ordinary declarative bodies."

	| m r expected bad |
	m := self ___fixtureModule___.
	r := m @env1:___pyAttrLoad___: #'r'.
	expected := m @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	#('header_order' 'decorator_call_lines' 'build_error_frames' 'plain_body'
	  'captures' 'exception_class' 'slots' 'starred_base'
	  'init_subclass_keywords' 'class_in_a_method') do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'method-local classes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, so
	check the methods themselves: every helper of the fixture's admitted
	classes carries the IR marker, and nothing fell back."

	| m helpers stats |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___fixtureModule___.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___: m class.
	self assert: helpers size >= 9
		description: 'expected the fixture''s helpers on its module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	"The header travels as an argument: header_order's C captures nothing, so
	its helper takes the header alone; plain_body's B also carries its
	captured base."
	self assert: (helpers keys anySatisfy: [:sel | sel endsWith: '_C___:'])
		description: 'header_order''s class C did not take its header as an argument: '
			, helpers keys asArray printString.
	self assert: (helpers keys anySatisfy: [:sel | sel endsWith: '_B___:setters:pre:'])
		description: 'plain_body''s class B did not take its captures and header: '
			, helpers keys asArray printString

]

{ #category : 'Grail-Tests' }
ClassBuildIREmitterTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text, which is the A/B control the two backends are compared with."

	| m helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	(importlib @env1:modules) removeKey: #'mlc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mlc_ir'.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: false.
	m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/method_local_class_ir.py'
		name: 'mlc_ir'.
	helpers := self ___helpersOf___: m class.
	self deny: helpers isEmpty.
	helpers keysAndValuesDo: [:sel :meth |
		self deny: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was built through IR with the class helper off']

]
