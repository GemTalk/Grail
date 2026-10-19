Class {
	#name : 'ReprAndRangeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ReprAndRangeTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
ReprAndRangeTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'repr_and_range' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/repr_and_range.py')
		name: 'repr_and_range'.

]

{ #category : 'Grail-Tests - Range Repr' }
ReprAndRangeTestCase >> testANegativeStepReportsTheRightStop [
	"THE TEST THIS EXISTS FOR.  ``to + 1'' is the inclusive-to-exclusive
	conversion for a POSITIVE step only, so ``range(5, 0, -1)'' printed as
	``range(5, 2, -1)'' -- a range with different contents from the one being
	printed."

	self assertMatchesCPythonAt: 'range_negative_step'.

]

{ #category : 'Grail-Tests - reprlib' }
ReprAndRangeTestCase >> testRecursiveReprShortCircuitsACycle [
	"The wrapper is applied EXPLICITLY in the fixture rather than with @-syntax --
	see this class's comment: a method decorator is dropped by Grail, which looks
	like a broken recursive_repr and is not one."

	self assertMatchesCPythonAt: 'recursive_repr_guard'.

]

{ #category : 'Grail-Tests - reprlib' }
ReprAndRangeTestCase >> testTheFeaturesTheSubsetLacked [
	"Repr() takes its limits as KEYWORD arguments and supports ``indent='', which
	the subset had no notion of at all -- including the ValueError a negative
	indent must raise."

	self assertMatchesCPythonAt: 'keyword_construction'.
	self assertMatchesCPythonAt: 'indent_feature'.
	self assertMatchesCPythonAt: 'invalid_indent'.

]

{ #category : 'Grail-Tests - Range Repr' }
ReprAndRangeTestCase >> testTheReprAlwaysShowsStartAndStop [
	"CPython never abbreviates: ``range(1)'' prints as ``range(0, 1)''.  The repr
	is the normalised three-field form, not the constructor call that was written."

	self assertMatchesCPythonAt: 'range_one_arg'.
	self assertMatchesCPythonAt: 'range_two_arg'.
	self assertMatchesCPythonAt: 'range_empty'.
	self assertMatchesCPythonAt: 'range_step'.

]

{ #category : 'Grail-Tests - Range Repr' }
ReprAndRangeTestCase >> testTheReprNamesThisRange [
	"The property the repr exists for, checked as a ROUND TRIP rather than a
	string comparison: eval(repr(r)) must rebuild a range with the same contents
	and the same start/stop/step.  A repr that merely looks plausible passes a
	string check and fails this one."

	self assertMatchesCPythonAt: 'round_trips'.
	self assertMatchesCPythonAt: 'repr_agrees_with_attributes'.

]

{ #category : 'Grail-Tests - reprlib' }
ReprAndRangeTestCase >> testTheSizeLimitsMatchCPython [
	"Nesting depth, list truncation and string truncation -- three of the places
	the hand-written subset drifted."

	self assertMatchesCPythonAt: 'nesting_depth'.
	self assertMatchesCPythonAt: 'long_list'.
	self assertMatchesCPythonAt: 'long_string'.
	self assertMatchesCPythonAt: 'deep_dict'.

]
