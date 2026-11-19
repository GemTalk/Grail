"Method decorators in IR (plan P3.3c): a method-local class with decorated
methods has its helper built through IR.  The walk applies the decorators
through the emitter -- at the def, or in the pass after the body -- and a name
in a decorator expression is read by the description both helpers share
(NameAst >> ___emitMethodDecoratorValueWith___:): a name the class body binds
off the class, anything else as the enclosing scopes read it.

It also covers the other class-body scopes P3.3c admits: a lambda, a
comprehension or a generator expression in a class-body value, an annotated
value, a default or a decorator, each built by its own emitter as in a def.

The tests load tests/python/class_body_decorators_ir.py and
class_body_function_scopes_ir.py, compare every check with CPython's answer
on the IR arm and with the text helper as the control,
and check that the helpers really were built through IR -- correct answers
from a text helper would prove nothing.  ClassBodyNamespaceIRTestCase >>
testTheRefusalsAreCensusRows pins the census rows of the shapes still refused."
Class {
	#name : 'ClassBodyDecoratorsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyDecoratorsIRTestCase >> ___disagreementsOf___: aModule keys: keys [
	"The fixture's checks that disagree with CPython, as printable lines."

	| r expected bad |
	r := aModule @env1:___pyAttrLoad___: #'r'.
	expected := aModule @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	keys do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Helpers' }
ClassBodyDecoratorsIRTestCase >> ___fixtures___ [
	"Each fixture: { file. module name. its checks. its class count }."

	^ {
		{ 'class_body_decorators_ir.py'. 'cbd_ir'.
		  #('alias_after' 'cells' 'class_body_names' 'declarative' 'enclosing_local'
		    'lines' 'module_deco' 'order' 'own_name' 'properties' 'raises' 'register'
		    'skip' 'wraps').
		  15 }.
		{ 'class_body_function_scopes_ir.py'. 'cbfs_ir'.
		  #('annotate' 'annotated' 'closures' 'comps' 'decorator' 'default'
		    'lambda_names' 'lambda_scope' 'lambda_value' 'listcomp').
		  11 } }

]

{ #category : 'Grail-Helpers' }
ClassBodyDecoratorsIRTestCase >> ___helpersOf___: aClass [
	"aClass's method-local class helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyDecoratorsIRTestCase >> ___load___: aFixture helpers: irHelpers [
	"aFixture, freshly compiled on the IR arm with the census on, its class
	helpers built through IR or (irHelpers false) from text."

	| m name |
	name := aFixture at: 2.
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: irHelpers.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/' , (aFixture at: 1)
		name: name]
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyDecoratorsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	self ___fixtures___ do: [:fx |
		(importlib @env1:modules) removeKey: (fx at: 2) asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: (fx at: 2)].
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyDecoratorsIRTestCase >> testTheFixturesAgreeWithCPython [
	"Every check of both fixtures, on the IR arm with the helpers built through
	IR: decorators that are module globals, enclosing locals and class-body
	names, their evaluation and application order, decorators around the
	declarative forms and properties, and the class-body frame and line a
	decorator is called from; lambdas, comprehensions and generator
	expressions in class-body values, annotations, defaults and decorators."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := OrderedCollection new.
	self ___fixtures___ do: [:fx |
		bad addAll: (self ___disagreementsOf___: (self ___load___: fx helpers: true)
			keys: (fx at: 3))].
	self assert: bad isEmpty
		description: 'method decorators or class-body scopes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyDecoratorsIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, so
	check the methods themselves: every helper of each fixture carries the IR
	marker, nothing fell back, and the census counts no text helper."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___fixtures___ do: [:fx |
		| m stats helpers |
		m := self ___load___: fx helpers: true.
		stats := importlib ___irStats___.
		self assert: (stats at: #fallbacks) = 0
			description: (fx at: 1) , ': IR fell back to text: ' , (stats at: #lastError) printString.
		helpers := self ___helpersOf___: m class.
		self assert: helpers size >= (fx at: 4)
			description: (fx at: 1) , ': expected its helpers on the module class, found '
				, helpers keys asArray printString.
		helpers keysAndValuesDo: [:sel :meth |
			self assert: (BaseException ___isIRPythonMethod___: meth)
				description: (fx at: 1) , ': ' , sel , ' was compiled from text'].
		self assert: (census at: #'th:irHelper' otherwise: 0) >= (fx at: 4)
			description: (fx at: 1) , ' census: ' , census printString.
		self assert: (census at: #'th:helper' otherwise: 0) = 0
			description: (fx at: 1) , ': a helper was compiled from text: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyDecoratorsIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control -- and the text helper gives CPython's answers
	for every check but one: a text helper is not a Python frame for
	sys._getframe, so ``lines'' sees no class-body frame where CPython (and
	the IR helper) see the class body at the decorator's line."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___fixtures___ do: [:fx |
		| m helpers bad |
		m := self ___load___: fx helpers: false.
		helpers := self ___helpersOf___: m class.
		self deny: helpers isEmpty.
		helpers keysAndValuesDo: [:sel :meth |
			self deny: (BaseException ___isIRPythonMethod___: meth)
				description: sel , ' was built through IR with the class helper off'].
		bad := self ___disagreementsOf___: m keys: ((fx at: 3) copyWithout: 'lines').
		self assert: bad isEmpty
			description: (fx at: 1) , ' disagreeing with CPython on the text helper: '
				, bad asArray printString]

]
