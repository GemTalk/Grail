! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FrameEqualityTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrameEqualityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FrameEqualityTestCase - frames compare by value, and what that costs.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FrameEqualityTestCase removeAllMethods.
FrameEqualityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Data Model'
method: FrameEqualityTestCase
testFrameEquality
	"Frame objects compare by VALUE in Grail.

	CPython compares frames by IDENTITY and Grail cannot: a live stack is read
	by RAISING and reading the VM's captured (method, ip, receiver) triples, so
	every walk RECONSTRUCTS its frames and two walks of one unchanged stack
	yield distinct objects.  Real identity would need a cache keyed to a
	physical frame, and 9.47 measures that no such key exists -- one activation
	walked twice and three separate activations of the same method on the same
	receiver at the same depth give byte-identical triples, the ip included,
	while CPython answers one frame object for the first case and three for the
	second.

	``f_lineno'' is deliberately NOT part of the comparison, which was measured
	rather than assumed.  A frame's line is mutable STATE -- in CPython it
	advances while the frame object stays the same -- so including it made two
	readings of ONE frame taken at different lines unequal
	(the_same_frame_read_twice_is_equal).  It also bought no discrimination
	against the case it looks like it should catch: two separate activations at
	one depth return from the SAME line, so they compared equal with the line
	included too.  walk_stack yields (frame, lineno) pairs, so the line is still
	compared where a consumer depends on it -- which
	walk_stack_pairs_compare_equal_across_two_walks pins.

	PyCode gained value equality alongside, and that half is ordinary
	conformance rather than a concession: CPython's code objects compare by
	value already.

	Only the Python-level __eq__/__hash__ are defined, never Smalltalk =/hash,
	so Grail-internal collections that key frames by identity are unaffected --
	the same rule BoundMethod follows for the same reason.

	All eight checks answer identically under real CPython 3.14.6.  A ninth,
	two_activations_at_one_depth_compare_equal, records the divergence and is
	asserted here as GRAIL-SPECIFIC so that CPython agreeing with it one day
	shows up as a change rather than passing unnoticed.  See
	tests/python/frame_equality.py."

	| mod |
	importlib @env1:modules removeKey: #'frame_equality' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_equality.py')
		name: 'frame_equality'.
	#( 'the_same_frame_read_twice_is_equal'
	   'the_same_frame_read_twice_hashes_equal'
	   'different_functions_are_not_equal'
	   'a_frame_is_not_equal_to_a_non_frame'
	   'equality_is_symmetric'
	   'a_frame_equals_itself'
	   'deeper_frames_are_not_equal_to_shallower_ones'
	   'walk_stack_pairs_compare_equal_across_two_walks'
	   'two_activations_at_one_depth_compare_equal' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'frame equality check failed: ' , k , ' -> ' , answer printString]
%
