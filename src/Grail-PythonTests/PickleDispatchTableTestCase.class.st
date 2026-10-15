Class {
	#name : 'PickleDispatchTableTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PickleDispatchTableTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
PickleDispatchTableTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'pickle_dispatch_table' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/pickle_dispatch_table.py')
		name: 'pickle_dispatch_table'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - the table is actually consulted' }
PickleDispatchTableTestCase >> testARegisteredReductorIsTheONLYWayToRoundTripSomeTypes [
	"THE DISCRIMINATING CASE.  Every other assertion in this class is satisfied
	by the DEFAULT reduction path as well, so all of them passed while a
	deployed pickle was reading a stale dispatch table and skipping the
	registration entirely (docs/Persistent_Modules_and_Classes.md par.4.3).
	NeedsArgs cannot round-trip that way -- its __new__ demands an argument, so
	the generic ``cls.__new__(cls)'' reduction raises -- which makes this the
	one assertion here that fails when the table is not consulted."

	self assert: (self at: 'needs_args_round_trip') equals: 7.

]

{ #category : 'Grail-Tests - super' }
PickleDispatchTableTestCase >> testASuperObjectSurvivesARoundTrip [
	"The reductor answers ``(super, (thisclass, self))'', so unpickling
	reconstructs through the ordinary two-argument super() rather than building
	an empty proxy and pushing state into it."

	self assert: (self at: 'round_trip_type') equals: true.
	self assert: (self at: 'round_trip_thisclass') equals: true.
	self assert: (self at: 'round_trip_self_class') equals: true.

]

{ #category : 'Grail-Tests - user registrations' }
PickleDispatchTableTestCase >> testATypeAProgramRegistersItselfIsHonoured [
	"A separate route into the same table -- copyreg.pickle() called from Python,
	which is what the re module does for compiled patterns.  The built-in
	registration could work while this did not, since one is installed in
	Smalltalk and the other through the Python entry point."

	self assert: (self at: 'user_registered_type') @env0:asString equals: 'Point'.
	self assert: ((self at: 'user_registered_state') @env1:__getitem__: 0) equals: 3.

]

{ #category : 'Grail-Tests - the table is actually consulted' }
PickleDispatchTableTestCase >> testBothReductorsActuallyRan [
	"Names of the reductors the fixture saw invoked.  A value assertion can be
	satisfied by an accidental equality; this asserts the CODE PATH."

	| ran |
	ran := self at: 'reductors_ran'.
	self assert: (ran @env1:__len__) equals: 2.
	self assert: (ran @env1:__getitem__: 0) @env0:asString equals: 'needs_args'.
	self assert: (ran @env1:__getitem__: 1) @env0:asString equals: 'point'.

]

{ #category : 'Grail-Tests - super' }
PickleDispatchTableTestCase >> testSuperShipsRegistered [
	"copyreg registers it at initialize time, as CPython's copyreg.py does at
	module level.  Without the entry there is nothing for pickle to find, so this
	is the precondition for everything below."

	self assert: (self at: 'super_is_registered') equals: true.

]

{ #category : 'Grail-Tests - super' }
PickleDispatchTableTestCase >> testTheClassReceiverFormRoundTripsToo [
	"``super(C, E)'' reduces by the same rule, and its __self__ is the class
	itself -- restored by identity rather than copied."

	self assert: (self at: 'class_form_self') equals: true.
	self assert: (self at: 'class_form_thisclass') equals: true.

]

{ #category : 'Grail-Tests - super' }
PickleDispatchTableTestCase >> testTheRestoredProxyStillDispatchesAndCarriesItsObject [
	"The check that would have caught the old behaviour: the empty proxy passed
	``type(u) is type(s)'' perfectly well, so only USING it reveals anything."

	self assert: (self at: 'round_trip_dispatches') equals: true.
	self assert: (self at: 'round_trip_self_type') @env0:asString equals: 'E'.
	self assert: (self at: 'round_trip_self_state') equals: 1.

]

{ #category : 'Grail-Tests - regression guard' }
PickleDispatchTableTestCase >> testUnregisteredTypesAreUnaffected [
	"The guard on a change to pickle's dispatch: an ordinary instance and the
	builtin containers must pickle exactly as before, since every pickled object
	in the corpus passes through the same method."

	self assert: (self at: 'plain_object_still_pickles') equals: true.
	self assert: ((self at: 'builtins_still_pickle') @env1:__len__) equals: 3.

]
