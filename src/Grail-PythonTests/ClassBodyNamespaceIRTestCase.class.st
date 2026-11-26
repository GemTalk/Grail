"The class-body namespace in IR (plan P3.3, first step): a method-local
class whose attribute values, defaults and bare constants are ordinary
expressions has its helper built through IR, and every name in those
expressions is read through the class-body read the text writes too
(NameAst >> ___emitClassBodyValueWith___:).

The fixture tests load tests/python/class_body_namespace_ir.py and compare
every check with CPython's answer, on the IR arm and with the text helper as
the control, and check that the helpers really were built through IR --
correct answers from a text helper would prove nothing.  The refusal test pins
the census rows the shapes left to later steps keep."
Class {
	#name : 'ClassBodyNamespaceIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'module',
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyNamespaceIRTestCase >> ___classes___: aSource [
	"Every ClassDefAst of aSource, parsed and linked (``setParent: nil'', as
	the import path does), by name."

	| tree out |
	tree := PythonParser parse: aSource.
	tree setParent: nil.
	out := KeyValueDictionary new.
	tree ___anyDescendantSatisfies___: [:n |
		(n isKindOf: ClassDefAst) ifTrue: [out at: n name asString put: n].
		false].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyNamespaceIRTestCase >> ___disagreementsOf___: aModule [
	"The fixture's checks that disagree with CPython, as printable lines."

	| r expected bad |
	r := aModule @env1:___pyAttrLoad___: #'r'.
	expected := aModule @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	#('annotations' 'body_frame' 'chained' 'defaults' 'descriptors'
	  'enclosing_reads' 'error_frames' 'namespace_reads' 'not_yet_bound'
	  'unbound_free') do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Helpers' }
ClassBodyNamespaceIRTestCase >> ___fixtureModule___ [
	"tests/python/class_body_namespace_ir.py, compiled on the IR arm with the
	class helper built through IR and the census on."

	module ifNotNil: [^ module].
	module := self ___load___: true.
	^ module

]

{ #category : 'Grail-Helpers' }
ClassBodyNamespaceIRTestCase >> ___helpersOf___: aClass [
	"aClass's method-local class helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyNamespaceIRTestCase >> ___load___: irHelpers [
	"The fixture, freshly compiled on the IR arm, its class helpers built
	through IR or (irHelpers false) from text."

	| m |
	(importlib @env1:modules) removeKey: #'cbn_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbn_ir'.
	importlib ___irCodegenForce___: true.
	importlib ___irClassHelperIRForce___: irHelpers.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[m := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_namespace_ir.py'
		name: 'cbn_ir']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___ at: #counts.
	^ m

]

{ #category : 'Grail-Setup' }
ClassBodyNamespaceIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	(importlib @env1:modules) removeKey: #'cbn_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbn_ir'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyNamespaceIRTestCase >> testTheFixtureAgreesWithCPython [
	"Every check of class_body_namespace_ir.py, on the IR arm with the
	helpers built through IR: class-body reads of prior attributes, sibling
	defs, builtins, module and enclosing names, defaults, descriptors, the
	class-body frame and an error raised in the body."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: self ___fixtureModule___.
	self assert: bad isEmpty
		description: 'class-body values disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyNamespaceIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, so
	check the methods themselves: every helper of the fixture carries the IR
	marker, nothing fell back, and the census counts no text helper."

	| m helpers stats |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___fixtureModule___.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___: m class.
	self assert: helpers size >= 10
		description: 'expected the fixture''s helpers on its module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text'].
	self assert: (census at: #'th:irHelper' otherwise: 0) >= 10
		description: 'census: ' , census printString.
	self assert: (census at: #'th:helper' otherwise: 0) = 0
		description: 'a helper of the fixture was compiled from text: ' , census printString

]

{ #category : 'Grail-Tests' }
ClassBodyNamespaceIRTestCase >> testTheRefusalsAreCensusRows [
	"The shapes left to later steps keep the class on the text helper, each
	under a census row of its own; the shapes this step admits answer nil."

	| classes expect bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	importlib ___irClassHelperIRForce___: true.
	classes := self ___classes___: 'G = 1
def mf(): pass
def f(p):
    class Values:
        a = G + p
        b = a * 2
        c = d = [a, b]
        ln = len
        ...
        def m(self, k=a, j=mf) -> int: return k
    class Lam:
        a = lambda: 1
    class Comp:
        a = [x for x in (1, 2)]
    class Walrus:
        a = (n := 1)
    class Sibling:
        def g(): return 1
        a = g()
    class Frame:
        a = locals()
    class FrameLam:
        a = lambda: locals()
    class FrameDir:
        a = dir()
    class Cell:
        a = __class__
    class CellLam:
        a = lambda: __class__
    class Ann:
        x: G = 1
        y: list[int]
        __slots__ = (''z'',)
    class AnnLam:
        x: (lambda: 1) = 1
    class AnnTarget:
        p.x: int = 1
    class Deco:
        @staticmethod
        def s(): pass
        @mf
        def t(self): pass
        @G.real
        def u(self): pass
    class DecoLam:
        @(lambda fn: fn)
        def s(self): pass
    class DecoCell:
        @mf(__class__)
        def s(self): pass
    class Expr:
        print(1)
    class Target:
        p.x = 1
    class Renamed:
        __renamed__ = {''a'': ''b''}
    class Default:
        def m(self, k=lambda: 1): pass
    return Values
'.
	expect := {
		'Values' -> nil.
		'Lam' -> nil.
		'Comp' -> nil.
		'Walrus' -> #'irHelper:assign:walrus'.
		'Sibling' -> nil.
		'Frame' -> nil.
		'FrameLam' -> #'irHelper:assign:frameCall'.
		'FrameDir' -> #'irHelper:assign:frameCall'.
		'Cell' -> nil.
		'CellLam' -> nil.
		'Ann' -> nil.
		'AnnLam' -> nil.
		'AnnTarget' -> nil.
		'Deco' -> nil.
		'DecoLam' -> nil.
		'DecoCell' -> #'irHelper:methodDecorator:classCell'.
		'Expr' -> nil.
		'Target' -> nil.
		'Renamed' -> nil.
		'Default' -> nil }.
	bad := OrderedCollection new.
	expect do: [:assoc |
		| got |
		got := (classes at: assoc key) ___irClassHelperTextReason___: #('p') asSet.
		got = assoc value ifFalse: [
			bad add: assoc key , ': ' , got printString , ' expected ' , assoc value printString]].
	self assert: bad isEmpty description: bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyNamespaceIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control -- and the text helper gives CPython's answers
	for the same checks but one: a declarative text helper is not a Python
	frame for sys._getframe, so ``body_frame'' sees the enclosing def where
	CPython (and the IR helper) see the class body."

	| m helpers bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___load___: false.
	helpers := self ___helpersOf___: m class.
	self deny: helpers isEmpty.
	helpers keysAndValuesDo: [:sel :meth |
		self deny: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was built through IR with the class helper off'].
	bad := (self ___disagreementsOf___: m) reject: [:line | line beginsWith: 'body_frame:'].
	self assert: bad isEmpty
		description: 'class-body values disagreeing with CPython on the text helper: '
			, bad asArray printString

]
