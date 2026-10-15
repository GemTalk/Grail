Class {
	#name : 'ReceiverlessClassCallTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ReceiverlessClassCallTestCase >> ___classBodyHelperFixture___ [
	"tests/python/class_body_helper_calls.py, loaded once per test."

	importlib @env1:modules removeKey: #'class_body_helper_calls' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_helper_calls.py')
		name: 'class_body_helper_calls'

]

{ #category : 'Grail-Private' }
ReceiverlessClassCallTestCase >> assertMatchesCPython: aKey [
	| actual expected |
	actual := self result: aKey.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey.
	self
		assert: (actual @env1:__eq__: expected) == true
		description: aKey , ': ' , (builtins @env1:instance @env1:repr: actual) asString

]

{ #category : 'Grail-Private' }
ReceiverlessClassCallTestCase >> result: aKey [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ReceiverlessClassCallTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'receiverless_class_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/receiverless_class_call.py')
		name: 'receiverless_class_call'.

]

{ #category : 'Grail-Setup' }
ReceiverlessClassCallTestCase >> tearDown [
	(importlib @env1:modules) removeKey: #'receiverless_class_call' ifAbsent: [].
	testModule := nil

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testAClassBodyCallsItsOwnHelpers [
	"pygments' two shapes (#1426) -- a helper with defaults naming class-body
	variables, called by the body with a bool; a zero-parameter helper whose
	nested generator takes ``self'' -- plus Cls.f(x) for any x, keywords
	included, and defaults shared across body and later calls.
	tests/python/class_body_helper_calls.py holds the checks and agrees with
	CPython 3.14."

	self
		assert: (self ___classBodyHelperFixture___ @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '16 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testAnInstanceIsStillArgsZero [
	self assertMatchesCPython: 'star_on_instance'.
	self assertMatchesCPython: 'closure_instance'.
	self assertMatchesCPython: 'inherited'

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testAPackedDefTakesASpecialFirstArgument [
	"``def k(self, *a)'' called as ``C.k(1)'': the packed _k:kw: body is
	recompiled for the special receiver, as the fixed form already was
	(#1426).  It was a known divergence until then."

	self assertMatchesCPython: 'packed_int_receiver'

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testAReboundNameInADefaultStillReadsItsLastValue [
	"PINNED: ``v = 1; def f(x, d=v); v = 2'' in a class body.  CPython reads
	1; Grail emits every store of a rebound class attribute at its LAST
	assignment and so reads 2 -- the answer it always gave, and since #1426
	still without raising.  Closing it is welcome; the fixture's
	KNOWN_DIVERGENCES entry then moves to EXPECTED."

	| fixture actual |
	fixture := self ___classBodyHelperFixture___.
	actual := (fixture @env1:___pyAttrLoad___: #r)
		@env1:__getitem__: 'default_is_fixed_at_the_def'.
	self
		deny: (actual @env1:__eq__: ((fixture @env1:___pyAttrLoad___: #KNOWN_DIVERGENCES)
			@env1:__getitem__: 'default_is_fixed_at_the_def')) == true
		description: 'default_is_fixed_at_the_def now matches CPython; move it to EXPECTED'.
	self assert: (actual @env1:__eq__: (self eval: '(2, 2)')) == true

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testClosureCellsWithoutAnInstance [
	self assertMatchesCPython: 'closure'.
	self assertMatchesCPython: 'closure_foreign_receiver'

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testEveryResultIsChecked [
	"Every key the fixture records is either expected or a known divergence."

	| r expected known |
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	known := testModule @env1:___pyAttrLoad___: #KNOWN_DIVERGENCES.
	self assert: (r @env1:__len__) = ((expected @env1:__len__) + (known @env1:__len__)).
	self assert: (expected @env1:__len__) >= 19

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testKeywordArgumentsReachTheBody [
	self assertMatchesCPython: 'star_kwargs'.
	self assertMatchesCPython: 'kwonly'.
	self assertMatchesCPython: 'kwonly_missing'.
	self assertMatchesCPython: 'kwonly_positional'.
	self assertMatchesCPython: 'no_params'.
	self assertMatchesCPython: 'no_params_kwarg'.
	"Through an instance the instance is an argument too many (#1434)."
	self assertMatchesCPython: 'instance_extra_arg'

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testKnownDivergencesStillDiverge [
	"Each is a catchable TypeError where CPython answers, or an answer where
	CPython raises.  Closing one is welcome; it then belongs in EXPECTED."

	| known |
	known := testModule @env1:___pyAttrLoad___: #KNOWN_DIVERGENCES.
	#('receiver_default') do: [:k |
		self
			deny: ((self result: k) @env1:__eq__: (known @env1:__getitem__: k)) == true
			description: k , ' now matches CPython; move it to EXPECTED']

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testStarArgsSeeOnlyTheArguments [
	self assertMatchesCPython: 'star_no_args'.
	self assertMatchesCPython: 'star_int_args'.
	self assertMatchesCPython: 'star_object_args'.
	self assertMatchesCPython: 'star_bound_later'.
	self assertMatchesCPython: 'star_getattr'

]

{ #category : 'Grail-Tests' }
ReceiverlessClassCallTestCase >> testTheOriginalCrashIsAnOrdinaryCall [
	"``make(1).f()'' with ``def f(*a)'' in a method-local class: the LookupError
	2021 that no handler could see."

	self assertMatchesCPython: 'uncaught_used_to_escape'.
	self assertMatchesCPython: 'closure_called_inside'

]
