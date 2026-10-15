Class {
	#name : 'RoundDirFormatTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
RoundDirFormatTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
RoundDirFormatTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'round_dir_format' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/round_dir_format.py')
		name: 'round_dir_format'.

]

{ #category : 'Grail-Tests - dir' }
RoundDirFormatTestCase >> testClassAttributesSurviveTheNarrowedWalk [
	"THE CONTROL for the change above.  The metaclass union exists because a
	class body's data attributes live there -- ``data = 42'' compiles to an
	accessor pair on C class -- so narrowing the walk could have dropped them.
	A SUBCLASS is included because its inherited attributes live on its BASE's
	metaclass, one step further up the chain that was narrowed."

	self assertMatchesCPythonAt: 'dir_class_attr'.
	self assertMatchesCPythonAt: 'dir_subclass_attr'.
	self assertMatchesCPythonAt: 'dir_instance_attr'.

]

{ #category : 'Grail-Tests - dir' }
RoundDirFormatTestCase >> testDirAnswersASortedListWhateverTheHookReturned [
	"dir() is documented to answer a sorted list; Grail answered whatever
	__dir__ did.  The non-iterable row is the one that matters -- it is the
	difference between an error at the dir() call and an error much later,
	wherever the caller tried to use 7 as a list."

	self assertMatchesCPythonAt: 'dir_tuple_value'.
	self assertMatchesCPythonAt: 'dir_tuple_type'.
	self assertMatchesCPythonAt: 'dir_set_value'.
	self assertMatchesCPythonAt: 'dir_set_type'.
	self assertMatchesCPythonAt: 'dir_not_iterable'.
	self assertMatchesCPythonAt: 'dir_module_bad_dict'.

]

{ #category : 'Grail-Tests - dir' }
RoundDirFormatTestCase >> testDirOfAClassDoesNotLeakTheKernelMetaclass [
	"Seven names from Behavior and Object class appeared on every built-in
	type.  Asked as MEMBERSHIP rather than as the whole list: dir(str) still
	differs from CPython's in other ways (Grail's object carries __enter__ /
	__aenter__ and friends), and pinning the list whole would make this fail
	for reasons it is not about."

	self assertMatchesCPythonAt: 'dir_str_no_metaclass_names'.
	self assertMatchesCPythonAt: 'dir_str_keeps_real_methods'.

]

{ #category : 'Grail-Tests - Controls' }
RoundDirFormatTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '39 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - format' }
RoundDirFormatTestCase >> testFormatRequiresAStrResult [
	"Checked for BOTH call shapes, because format(x) used to reach
	__format__ directly rather than through format(x, '') -- so a check added
	only to the two-argument form would have left the common spelling
	unguarded."

	self assertMatchesCPythonAt: 'format_bad_result'.
	self assertMatchesCPythonAt: 'format_bad_result_with_spec'.
	self assertMatchesCPythonAt: 'format_good_result'.
	self assertMatchesCPythonAt: 'format_default_spec'.

]

{ #category : 'Grail-Tests - round' }
RoundDirFormatTestCase >> testNdigitsNoneMeansTheArgumentWasNotSupplied [
	"Four types, four different __round__ implementations -- and only the INT
	leg failed, because int tested Smalltalk nil where Python None is a
	distinct OBJECT.  float's __round__: documents that exact trap and checks
	for both; int did not.  Testing all four is what tells a type-specific
	slip from a general one."

	#('int' 'float' 'decimal' 'fraction') do: [:k |
		self assertMatchesCPythonAt: 'round_none_ndigits_' , k.
		self assertMatchesCPythonAt: 'round_none_type_' , k].

]

{ #category : 'Grail-Tests - Controls' }
RoundDirFormatTestCase >> testOrdinaryFormattingIsUnaffected [
	"The control: a result check must not refuse what already worked."

	self assertMatchesCPythonAt: 'format_plain'.
	self assertMatchesCPythonAt: 'format_bad_spec_type'.

]

{ #category : 'Grail-Tests - round' }
RoundDirFormatTestCase >> testRoundArgumentHandling [
	"Every row here was a WRONG ANSWER rather than an error: a keyword
	reported as a missing argument, extra positionals dropped so round(1, 2,
	3) answered 1."

	self assertMatchesCPythonAt: 'round_kw_both'.
	self assertMatchesCPythonAt: 'round_kw_ndigits'.
	self assertMatchesCPythonAt: 'round_no_args'.
	self assertMatchesCPythonAt: 'round_too_many'.

]

{ #category : 'Grail-Tests - round' }
RoundDirFormatTestCase >> testRoundBreaksTiesToEven [
	"Both signs and both sides of each tie: half-away-from-zero and
	ties-to-even agree on EVERYTHING except an exact .5, so a test that only
	checked non-ties would have passed throughout."

	self assertMatchesCPythonAt: 'round_ties'.
	self assertMatchesCPythonAt: 'round_non_ties'.
	self assertMatchesCPythonAt: 'round_int_ndigits_ties'.
	self assertMatchesCPythonAt: 'round_int_ndigits_wide'.

]

{ #category : 'Grail-Tests - round' }
RoundDirFormatTestCase >> testRoundLooksUpTheDunderOnTheType [
	"An INSTANCE attribute named __round__ must not be honoured.  Grail's
	lookup was already on the type, correctly -- but a receiver that failed it
	fell into the kernel arithmetic and died with an UNCATCHABLE ``does not
	understand #'*''', so the right rule produced the wrong exception."

	self assertMatchesCPythonAt: 'round_delegates'.
	self assertMatchesCPythonAt: 'round_no_dunder'.
	self assertMatchesCPythonAt: 'round_instance_dunder'.
	self assertMatchesCPythonAt: 'round_instance_dunder_ndigits'.

]

{ #category : 'Grail-Tests - round' }
RoundDirFormatTestCase >> testTheNdigitsFormStillAgrees [
	"It was already correct, by its own exact-rational route -- which is
	exactly why the disagreement was hard to see: round(2.5) and round(2.5, 0)
	are the same question and gave different answers.  Here so the fix joins
	them rather than swapping which one is wrong."

	self assertMatchesCPythonAt: 'round_ndigits_ties'.
	self assertMatchesCPythonAt: 'round_result_types'.

]
