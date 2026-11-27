"Frame calls and zero-argument super() in class bodies and lambdas (#2341,
#2342, #2326): a bare eval() / exec() in a class body runs in the class
namespace; locals(), vars(), dir(), eval() and exec() in a lambda see the
lambda's own frame, in a class body, a def or at module level; super() and
``__class__'' in a lambda of a class body take the class's own cell and the
lambda's first parameter.

The tests load tests/python/class_body_frame_calls.py, whose every check
holds the class at module level and inside a def, and compare it with
CPython's answers on the IR arm with the method-local class helpers built
through IR, with them built from text, and on the text arm.  The last test
checks which helpers the IR backend built: these shapes kept a method-local
class on the text helper until now (plan P3.7)."
Class {
	#name : 'ClassBodyFrameCallsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyFrameCallsIRTestCase >> ___assertAgrees___: aModule arm: aString [

	| bad |
	bad := self ___disagreementsOf___: aModule.
	self assert: (bad @env1:__len__) = 0
		description: 'class-body frame calls disagreeing with CPython ' , aString , ': '
			, (bad @env1:__repr__) asString

]

{ #category : 'Grail-Helpers' }
ClassBodyFrameCallsIRTestCase >> ___disagreementsOf___: aModule [
	"The fixture's own list of checks that disagree with CPython."

	^ (aModule @env1:___pyAttrLoad___: #'disagreements') @env1:value: { } value: nil

]

{ #category : 'Grail-Helpers' }
ClassBodyFrameCallsIRTestCase >> ___load___: irCodegen helperThroughIR: helperIR [
	"The fixture, freshly compiled with the census on: on the IR arm (irCodegen
	true) with its method-local class helpers built through IR or from text,
	or on the text arm."

	| m |
	(importlib @env1:modules) removeKey: #'cbfc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbfc_ir'.
	importlib ___irCodegenForce___: irCodegen.
	importlib ___irClassHelperIRForce___: helperIR.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_frame_calls.py'
		name: 'cbfc_ir']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyFrameCallsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbfc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbfc_ir'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyFrameCallsIRTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm, the method-local class helpers built through IR."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___assertAgrees___: (self ___load___: true helperThroughIR: true)
		arm: 'under IR'

]

{ #category : 'Grail-Tests' }
ClassBodyFrameCallsIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"The shapes these issues fix no longer keep a method-local class on the
	text helper.  What does is pinned, row by row, because each is a later
	step's: ``dir()'' in the body or a comprehension, ``locals()'' in a
	comprehension and ``globals()'' as an argument (plan P3.7b, four
	``assign:frameCall''), a walrus in a lambda (P3.7b, two ``assign:walrus''),
	and ``__class__'' in a lambda that is a method's default (one
	``methodDefault:classCell'').  Nothing fell back, and no class statement
	refused its def."

	| stats |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___load___: true helperThroughIR: true.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	self assert: (census at: #'th:irHelper' otherwise: 0) >= 50
		description: 'census: ' , census printString.
	self assert: (census at: #'th:helper' otherwise: 0) = 7
		description: 'text helpers: ' , census printString.
	self assert: (census at: #'th:text:irHelper:assign:frameCall' otherwise: 0) = 4
		description: 'census: ' , census printString.
	self assert: (census at: #'th:text:irHelper:assign:walrus' otherwise: 0) = 2
		description: 'census: ' , census printString.
	self assert: (census at: #'th:text:irHelper:methodDefault:classCell' otherwise: 0) = 1
		description: 'census: ' , census printString.
	census keysDo: [:k |
		self deny: (k asString includesString: 'classDef:')
			description: 'a class statement refused its def: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyFrameCallsIRTestCase >> testTheTextArmAgreesWithCPython [
	"Every check with IR codegen off (GRAIL_IR_CODEGEN=0's arm)."

	self ___assertAgrees___: (self ___load___: false helperThroughIR: true)
		arm: 'on the text arm'

]

{ #category : 'Grail-Tests' }
ClassBodyFrameCallsIRTestCase >> testTheTextHelperAgreesWithCPython [
	"Every check on the IR arm with the method-local class helpers compiled
	from text (GRAIL_IR_CLASS_HELPER=0's arm)."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___assertAgrees___: (self ___load___: true helperThroughIR: false)
		arm: 'with the text class helper'

]
