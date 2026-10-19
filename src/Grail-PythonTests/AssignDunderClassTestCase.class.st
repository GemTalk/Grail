Class {
	#name : 'AssignDunderClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AssignDunderClassTestCase >> ___expectedReprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
AssignDunderClassTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/assign_dunder_class.py'

]

{ #category : 'Grail-Private' }
AssignDunderClassTestCase >> ___irModule___ [
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'adc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'adc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'adc_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
AssignDunderClassTestCase >> ___keys___ [
	^ #('a_local_receiver' 'a_parameter_receiver' 'an_attribute_receiver'
	    'a_subscript_receiver' 'the_werkzeug_shape'
	    'the_change_is_visible_to_isinstance' 'a_plain_attribute_still_works')

]

{ #category : 'Grail-Private' }
AssignDunderClassTestCase >> ___reprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
AssignDunderClassTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'adc_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'adc_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests' }
AssignDunderClassTestCase >> testAssigningAClassItsOwnTypeAsH11Does [
	"h11's Sentinel metaclass ends __new__ with ``v.__class__ = v'', so each
	sentinel is its own type; Grail refused it, from inside a kernel handler
	running in protected mode, so the ``except'' that caught it died on its
	first import with InternalError 2261 and h11 and httpcore crashed the
	package census.  Behind that, a tuple holding a class with ``__hash__ =
	None'' hashed to None, an uncatchable bitXor: MNU.
	tests/python/class_assign_on_a_class.py holds the checks -- CPython's
	rules for __class__ assignment on a class, the sentinel shape, and the two
	failures -- and agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_assign_on_a_class' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_assign_on_a_class.py')
		name: 'class_assign_on_a_class'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - assigning __class__' }
AssignDunderClassTestCase >> testEveryReceiverShapeAgreesWithCPythonUnderIR [
	"Seven checks: four receiver shapes, the werkzeug idiom, the change seen
	through isinstance, and a plain attribute store beside them."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := self ___expectedReprOf___: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: '__class__ assignment shapes disagreeing with CPython under '
			, 'IR: ' , bad asArray printString

]

{ #category : 'Grail-Tests - assigning __class__' }
AssignDunderClassTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the refusal used to make it do."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 9
		description: 'fewer defs compiled than the cut measured (9): compiled = '
			, (stats at: #compiled) printString

]

{ #category : 'Grail-Tests - assigning __class__' }
AssignDunderClassTestCase >> testTheTypeReallyChanged [
	"Stated on its own: the statement must REBIND THE TYPE, not bind an
	attribute called ``__class__''.  An emit that fell through to the generic
	``__setattr__:_:'' would store a value under that name and answer the OLD
	method from a later send -- a wrong answer, not an error."

	| got |
	got := self ___reprOf___: 'a_local_receiver'.
	self assert: got = '(''other'', ''Other'')'
		description: 'the object''s type did not change (a __setattr__ would '
			, 'leave who() answering ''base''): ' , got

]
