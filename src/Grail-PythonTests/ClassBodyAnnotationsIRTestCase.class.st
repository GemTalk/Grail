"Class-body annotations and ``__slots__'' in IR (plan P3.3b): a method-local
class with annotated names (``x: T'', ``x: T = v'') or a ``__slots__''
declaration has its helper built through IR.  Its PEP 649 annotate block is
built inline in the helper, and each annotation's names are read through the
class-body read the text writes too (NameAst >> ___emitClassBodyValueWith___:),
lazily, when the block runs.

The tests load tests/python/class_body_annotations_ir.py and its
``from __future__ import annotations'' twin, compare every check with
CPython's answer on the IR arm and with the text helper as the control, and
check that the helpers really were built through IR -- correct answers from a
text helper would prove nothing.  ClassBodyNamespaceIRTestCase >>
testTheRefusalsAreCensusRows pins the census rows of the shapes still refused."
Class {
	#name : 'ClassBodyAnnotationsIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'census'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyAnnotationsIRTestCase >> ___disagreementsOf___: aModule keys: keys [
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
ClassBodyAnnotationsIRTestCase >> ___fixtures___ [
	"Each fixture: { file. module name. its checks. its class count }."

	^ {
		{ 'class_body_annotations_ir.py'. 'cba_ir'.
		  #('basic' 'class_scope' 'dataclass' 'formats' 'late_module_name' 'lazy'
		    'name_error' 'named_tuple' 'slots_annotated' 'slots_conflict' 'slots_dict'
		    'slots_empty' 'slots_list' 'slots_tuple' 'slots_with_dict').
		  16 }.
		{ 'class_body_annotations_future_ir.py'. 'cbaf_ir'.
		  #('never_evaluated' 'no_annotate' 'slots' 'strings').
		  4 } }

]

{ #category : 'Grail-Helpers' }
ClassBodyAnnotationsIRTestCase >> ___helpersOf___: aClass [
	"aClass's method-local class helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyAnnotationsIRTestCase >> ___load___: aFixture helpers: irHelpers [
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
ClassBodyAnnotationsIRTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	self ___fixtures___ do: [:fx |
		(importlib @env1:modules) removeKey: (fx at: 2) asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: (fx at: 2)].
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyAnnotationsIRTestCase >> testTheFixturesAgreeWithCPython [
	"Every check of both fixtures, on the IR arm with the helpers built
	through IR: lazy PEP 649 annotations and their class-body reads, the
	annotationlib formats, PEP 563 strings, the literal __slots__ forms, and
	the dataclass and NamedTuple fields annotations make."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := OrderedCollection new.
	self ___fixtures___ do: [:fx |
		bad addAll: (self ___disagreementsOf___: (self ___load___: fx helpers: true)
			keys: (fx at: 3))].
	self assert: bad isEmpty
		description: 'class-body annotations or slots disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyAnnotationsIRTestCase >> testTheHelpersWereBuiltThroughIR [
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
ClassBodyAnnotationsIRTestCase >> testTheTextHelperIsTheControl [
	"GRAIL_IR_CLASS_HELPER=0 (here, its force) keeps every helper compiled from
	text -- the A/B control -- and the text helper gives CPython's answers
	for every check too."

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
