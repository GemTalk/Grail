Class {
	#name : 'DirSlotsAndTracebackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DirSlotsAndTracebackTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
DirSlotsAndTracebackTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dir_slots_and_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_slots_and_traceback.py')
		name: 'dir_slots_and_traceback'.

]

{ #category : 'Grail-Tests - a traceback' }
DirSlotsAndTracebackTestCase >> testATracebackReportsExactlyFourNames [
	"The LENGTH is asserted upstream, so an extra name fails.  Grail answered
	29 -- every inherited dunder, and none of the four."

	self assertMatchesCPythonAt: 'traceback_dir'.
	self assertMatchesCPythonAt: 'traceback_dir_length'.

]

{ #category : 'Grail-Tests - a slot shadows __class__' }
DirSlotsAndTracebackTestCase >> testDirDegradesToTheInstancesOwnNames [
	"CPython's object.__dir__ reaches the type through getattr, so when that
	read fails dir() has only the instance dict left.  Grail took ``self
	class'' and could not fail."

	self assertMatchesCPythonAt: 'dir_drops_the_type'.
	self assertMatchesCPythonAt: 'dir_keeps_own_names'.
	self assertMatchesCPythonAt: 'assigning_the_slot'.

]

{ #category : 'Grail-Tests - Controls' }
DirSlotsAndTracebackTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
DirSlotsAndTracebackTestCase >> testEveryOtherObjectIsUnaffected [
	"The shortcut yields ONLY to a declared slot.  An ordinary instance, a
	class and a built-in all answer their real type, dir() reports the full
	chain, and isinstance and type() are untouched."

	self assertMatchesCPythonAt: 'plain_instance_dir'.
	self assertMatchesCPythonAt: 'plain_instance_class'.
	self assertMatchesCPythonAt: 'class_dir'.
	self assertMatchesCPythonAt: 'builtin_dir'.
	self assertMatchesCPythonAt: 'isinstance_unaffected'.
	self assertMatchesCPythonAt: 'type_is_unaffected'.

]

{ #category : 'Grail-Tests - Controls' }
DirSlotsAndTracebackTestCase >> testTheOtherShadowStillWorks [
	"THE CONTROL FOR THE GATE.  ``__class__ = property(...)'' is the other way
	to shadow it, and the legacy abstract-class protocol depends on it -- the
	shortcut already yielded to that and must keep doing so."

	self assertMatchesCPythonAt: 'property_shadow_still_works'.

]

{ #category : 'Grail-Tests - a slot shadows __class__' }
DirSlotsAndTracebackTestCase >> testTheSlotWinsAndStartsUnset [
	"The read raises until something assigns it, which is the whole of the
	trick.  Reading it RAW is what makes this possible: the accessor pair
	ends in a call back into the loader, and asking it from inside the loader
	recursed until the stack gave out."

	self assertMatchesCPythonAt: 'reading_it_raises'.
	self assertMatchesCPythonAt: 'getattr_raises'.

]
