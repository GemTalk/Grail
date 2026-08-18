! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnittestKnobsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UnittestKnobsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnittestKnobsTestCase
!
! ``TestCase.maxDiff'' / ``longMessage'' / ``_diffThreshold'', and the message
! order ``_formatMessage'' produces.
!
! The three attributes were missing from Grail's vendored TestCase.  The
! measured demand for them is small and is written down in the fixture, because
! it is the kind of thing that gets overstated after the fact: all nine uses in
! the vendored corpus are ASSIGNMENTS, which already worked.
!
! The behavioural fix here is the one the probe found next door -- Grail's
! ``_formatMessage'' had the standard and explicit halves the wrong way round.
!
! See tests/python/unittest_testcase_knobs.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnittestKnobsTestCase removeAllMethods.
UnittestKnobsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - unittest'
method: UnittestKnobsTestCase
testTestCaseKnobsAndMessageOrder
	"CPython's three TestCase knobs, and the order of an assertion message.

	WHAT WAS MISSING, AND HOW MUCH IT MATTERED.  ``maxDiff'', ``longMessage''
	and ``_diffThreshold'' were absent from Grail's TestCase.  Measured in the
	vendored corpus before adding them: maxDiff in 9 places across 8 modules,
	longMessage in 0, _diffThreshold in 0 -- and every one of the 9 is an
	ASSIGNMENT (``self.maxDiff = None'' in setUp, ``maxDiff = None'' in a class
	body).  Assignment binds an instance attribute and needs no class default,
	so all nine already worked.  What raised AttributeError was a READ through
	the class, ``SomeTestCase.maxDiff''.

	So the honest expectation for the attributes alone is that they move ZERO
	corpus tests, and the reason to believe that is the count, not optimism.
	They are here because they are part of TestCase's surface.

	THE BUG NEXT DOOR.  Pinning the attributes against CPython meant calling
	``_formatMessage'', which read

	    str(msg) + ' : ' + standardMsg

	-- the two halves reversed.  CPython answers ``1 != 3 : expected three'';
	Grail answered ``expected three : 1 != 3''.  Nothing failed: an assertion
	that was going to fail still failed, and the message merely read inside out,
	which is invisible unless you compare the text against CPython. That is what
	makes it worth a test rather than a quiet edit -- there is no failing run to
	notice its absence, so only a pinned expectation keeps it fixed.

	``longMessage'' is what made the reversal reachable at all: implementing it
	means branching in ``_formatMessage'', and CPython's branch falls back to the
	standard message for any FALSY explicit message, not just None. Both edges
	are pinned below, since '' behaves differently with the flag on and off.

	``_truncateMessage'' comes along as maxDiff's only consumer. It has no caller
	in Grail today -- assertEqual does not dispatch by type, so there is no
	assertMultiLineEqual or assertDictEqual to produce a diff -- and it is here
	so maxDiff means what it says the moment one is added, instead of being a
	number nothing reads. Stated rather than left to be discovered.

	All eighteen checks answer identically under real CPython 3.14.6."

	| mod |
	importlib @env1:modules removeKey: #'unittest_testcase_knobs' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unittest_testcase_knobs.py')
		name: 'unittest_testcase_knobs'.
	#( 'maxdiff_is_readable_on_the_class'
	   'longmessage_is_readable_on_the_class'
	   'diffthreshold_is_readable_on_the_class'
	   'maxdiff_is_eighty_by_eight'
	   'assigning_maxdiff_still_works'
	   'a_subclass_can_override_in_its_body'
	   'the_standard_message_comes_first'
	   'a_missing_message_leaves_the_standard_one'
	   'longmessage_off_prefers_the_explicit_message'
	   'longmessage_off_falls_back_when_there_is_no_message'
	   'longmessage_off_treats_an_empty_message_as_absent'
	   'longmessage_on_keeps_an_empty_message'
	   'a_non_string_message_is_stringified'
	   'a_real_assertion_failure_reads_in_cpython_order'
	   'a_short_diff_is_appended_whole'
	   'a_long_diff_is_replaced_by_its_length'
	   'maxdiff_none_never_truncates'
	   'a_diff_exactly_at_maxdiff_is_kept' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'TestCase knob check failed: ' , k
				, ' -> ' , answer printString]
%
