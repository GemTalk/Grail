"Class-body statements and nested classes in IR (plan P3.4): a method-local
class whose body holds statements CPython runs for their effect -- a bare
expression, a store through a subscript or an attribute, ``if'', ``for'',
``while'', ``try'', ``with'', an augmented assignment, ``del'', ``raise'',
``assert'' -- or a nested class, has its helper built through IR.  A runtime
statement is built by its own IR emitter, with the names it binds stored on
the class (AbstractNode >> ___emitIRClassBodyRuntimeStoreOf___:from:on:); a
nested class is built by a helper of its own, its header evaluated in the
outer body (ClassDefAst >> ___emitIRNestedClassWith___:).

The tests load tests/python/class_body_statements_ir.py and
class_body_nested_classes_ir.py, compare every check with CPython's answer on
the IR arm and with the text helper as the control, check that the helpers
really were built through IR -- correct answers from a text helper would
prove nothing -- and pin the census rows of the shapes still refused."
Class {
	#name : 'ClassBodyStatementsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyStatementsIRTestCase >> ___classes___: aSource [
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
ClassBodyStatementsIRTestCase >> ___disagreementsOf___: aModule keys: keys [
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
ClassBodyStatementsIRTestCase >> ___fixtures___ [
	"Each fixture: { file. module name. its checks. the method-local helpers
	on its module class. the nested-class helpers }."

	^ {
		{ 'class_body_statements_ir.py'. 'cbs_ir'.
		  #('ann_target' 'augassign' 'del_stmt' 'enum_dup' 'expression'
		    'for_loop' 'if_else_false' 'if_else_inner' 'if_else_true'
		    'method_attr' 'raise_assert_false' 'raise_assert_true' 'subscript'
		    'try_except' 'while_loop' 'with_stmt').
		  15. 0 }.
		{ 'class_body_nested_classes_ir.py'. 'cbnc_ir'.
		  #('attr_store' 'base' 'decorated' 'doubly' 'enclosing' 'enum' 'methods'
		    'order' 'raises' 'simple' 'statements').
		  11. 12 } }

]

{ #category : 'Grail-Helpers' }
ClassBodyStatementsIRTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyStatementsIRTestCase >> ___load___: aFixture helpers: irHelpers [
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
ClassBodyStatementsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	self ___fixtures___ do: [:fx |
		(importlib @env1:modules) removeKey: (fx at: 2) asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: (fx at: 2)].
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyStatementsIRTestCase >> testTheFixturesAgreeWithCPython [
	"Every check of both fixtures, on the IR arm with the helpers built through
	IR: runtime statements of every kind and the names they bind on the class,
	the class-body ``if'', and nested classes -- their header read in the
	outer body, their body reading the enclosing function, their position in
	the body."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := OrderedCollection new.
	self ___fixtures___ do: [:fx |
		bad addAll: (self ___disagreementsOf___: (self ___load___: fx helpers: true)
			keys: (fx at: 3))].
	self assert: bad isEmpty
		description: 'class-body statements or nested classes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyStatementsIRTestCase >> testTheHelpersWereBuiltThroughIR [
	"Correct answers prove nothing if the helpers were compiled from text, so
	check the methods themselves: every helper of each fixture -- a nested
	class's included -- carries the IR marker, nothing fell back, and the
	census counts no text helper."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___fixtures___ do: [:fx |
		| m stats helpers |
		m := self ___load___: fx helpers: true.
		stats := importlib ___irStats___.
		self assert: (stats at: #fallbacks) = 0
			description: (fx at: 1) , ': IR fell back to text: ' , (stats at: #lastError) printString.
		helpers := self ___helpersOf___: m class.
		self assert: helpers size >= ((fx at: 4) + (fx at: 5))
			description: (fx at: 1) , ': expected its helpers on the module class, found '
				, helpers keys asArray printString.
		helpers keysAndValuesDo: [:sel :meth |
			self assert: (BaseException ___isIRPythonMethod___: meth)
				description: (fx at: 1) , ': ' , sel , ' was compiled from text'].
		self assert: (census at: #'th:irHelper' otherwise: 0) >= (fx at: 4)
			description: (fx at: 1) , ' census: ' , census printString.
		self assert: (census at: #'th:irNestedHelper' otherwise: 0) >= (fx at: 5)
			description: (fx at: 1) , ' census: ' , census printString.
		self assert: (census at: #'th:helper' otherwise: 0) = 0
			description: (fx at: 1) , ': a helper was compiled from text: ' , census printString]

]

{ #category : 'Grail-Tests' }
ClassBodyStatementsIRTestCase >> testTheRefusalsAreCensusRows [
	"The shapes left to later steps keep the class on the text helper, each
	under a census row of its own; the shapes this step admits answer nil."

	| classes expect bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	importlib ___irClassHelperIRForce___: true.
	classes := self ___classes___: 'G = 1
def mf(): pass
def f(p):
    class Runtime:
        print(p)
        d = {}
        d[p] = 1
        for i in range(2):
            x = i
        while False:
            pass
        try:
            y = 1
        except Exception as e:
            pass
        with mf() as w:
            z = w
        x += 1
        del y
        assert x
    class Branch:
        if p:
            a = 1
        else:
            b: int = 2
    class CondDef:
        if p:
            def m(self): pass
    class LoopDef:
        for i in range(2):
            def m(self): pass
    class Chain:
        with mf():
            a = b = 1
    class Glob:
        global G
    class NonLoc:
        nonlocal p
    class Alias:
        type T = int
    class Imp:
        import os
    class Locs:
        locals()[''x''] = 1
    class Target:
        p.x = 1
    class Outer:
        B = int
        class Inner(B):
            for i in range(2):
                pass
    class OuterTp:
        class Inner[T]:
            pass
    class OuterBad:
        class Inner:
            nonlocal p
    return Runtime
'.
	expect := {
		'Runtime' -> nil.
		'Branch' -> nil.
		'CondDef' -> #'irHelper:if:def'.
		'LoopDef' -> #'irHelper:controlFlow:runtime:def'.
		'Chain' -> #'irHelper:controlFlow:runtime:chain'.
		'Glob' -> #'irHelper:global'.
		'NonLoc' -> #'irHelper:nonlocal'.
		'Alias' -> #'irHelper:typeAlias'.
		'Imp' -> #'irHelper:import'.
		'Locs' -> #'irHelper:assignTarget:runtime:frameCall'.
		'Target' -> #'irHelper:assignTarget'.
		'Outer' -> nil.
		'OuterTp' -> #'irHelper:typeParams'.
		'OuterBad' -> #'irHelper:nestedClass:nonlocal' }.
	bad := OrderedCollection new.
	expect do: [:assoc |
		| got |
		got := (classes at: assoc key) ___irClassHelperTextReason___: #('p') asSet.
		got = assoc value ifFalse: [
			bad add: assoc key , ': ' , got printString , ' expected ' , assoc value printString]].
	self assert: bad isEmpty description: bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyStatementsIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control -- and the text helper gives CPython's answers for
	every check."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___fixtures___ do: [:fx |
		| m helpers bad |
		m := self ___load___: fx helpers: false.
		helpers := self ___helpersOf___: m class.
		self deny: helpers isEmpty.
		helpers keysAndValuesDo: [:sel :meth |
			self deny: (BaseException ___isIRPythonMethod___: meth)
				description: sel , ' was built through IR with the class helper off'].
		bad := self ___disagreementsOf___: m keys: (fx at: 3).
		self assert: bad isEmpty
			description: (fx at: 1) , ' disagreeing with CPython on the text helper: '
				, bad asArray printString]

]
