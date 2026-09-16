! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssignDunderClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AssignDunderClassTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AssignDunderClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AssignDunderClassTestCase
!
! ``obj.__class__ = NewClass'' THROUGH THE DIRECT-TO-IR PATH.
!
! `cm:AssignAst:target-AttributeAst' (3).  The IR path had a full attribute-store
! emit -- slots, inferred slots, the generic ``__setattr__:_:'' -- and refused
! this one target name outright, because it is NOT an attribute store.
!
! printSmalltalkOn: routes it to an in-place TYPE CHANGE:
!
!     object @env1:___pyChangeClassOf: (obj) to: (NewClass)
!
! AND THE TARGET TRAVELS AS AN ARGUMENT, not as the receiver, which the text's
! own comment explains: GemStone's ``changeClassTo:'' refuses an object that is
! ``self'' on the stack, and ``(obj) __setattr__: ...'' would put it there.
! test_sort's test_unsafe_object_compare re-types an element MID-SORT and is
! what measured it.  So this emit is not free to pick the tidier spelling.
!
! A SELF RECEIVER IS STILL REFUSED, for the same reason stated the other way:
! ``self'' is on the stack however it is spelled, so the argument form cannot
! rescue it, and the text keeps ``self.__class__ = ...'' on the default path.
! Both corpus sites are foreign receivers -- werkzeug's Response.force_type,
! the documented way to re-type a response, and test_super's
! test___class___modification_multithreaded.
!
! THE FIXTURE VARIES THE RECEIVER (a local, a parameter, an attribute, a
! subscript) rather than the assigned class, because the receiver expression is
! the only part of the statement this emit has latitude about -- and a receiver
! evaluated twice, or evaluated as the send's receiver, is exactly how it would
! go wrong.
! ===============================================================================

doit
AssignDunderClassTestCase removeAllMethods.
AssignDunderClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AssignDunderClassTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'adc_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'adc_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: AssignDunderClassTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/assign_dunder_class.py'
%

category: 'Grail-Private'
method: AssignDunderClassTestCase
___keys___
	^ #('a_local_receiver' 'a_parameter_receiver' 'an_attribute_receiver'
	    'a_subscript_receiver' 'the_werkzeug_shape'
	    'the_change_is_visible_to_isinstance' 'a_plain_attribute_still_works')
%

category: 'Grail-Private'
method: AssignDunderClassTestCase
___irModule___
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
%

category: 'Grail-Private'
method: AssignDunderClassTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: AssignDunderClassTestCase
___expectedReprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests - assigning __class__'
method: AssignDunderClassTestCase
testEveryReceiverShapeAgreesWithCPythonUnderIR
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
%

category: 'Grail-Tests - assigning __class__'
method: AssignDunderClassTestCase
testTheTypeReallyChanged
	"Stated on its own: the statement must REBIND THE TYPE, not bind an
	attribute called ``__class__''.  An emit that fell through to the generic
	``__setattr__:_:'' would store a value under that name and answer the OLD
	method from a later send -- a wrong answer, not an error."

	| got |
	got := self ___reprOf___: 'a_local_receiver'.
	self assert: got = '(''other'', ''Other'')'
		description: 'the object''s type did not change (a __setattr__ would '
			, 'leave who() answering ''base''): ' , got
%

category: 'Grail-Tests - assigning __class__'
method: AssignDunderClassTestCase
testTheIRArmActuallyCompiledTheFixture
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
%
