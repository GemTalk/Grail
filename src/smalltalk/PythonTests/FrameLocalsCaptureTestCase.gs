! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FrameLocalsCaptureTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrameLocalsCaptureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FrameLocalsCaptureTestCase - tb_frame.f_locals reports the frame CPython does.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FrameLocalsCaptureTestCase removeAllMethods.
FrameLocalsCaptureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Tracebacks'
method: FrameLocalsCaptureTestCase
testATracebackFrameReportsTheLocalsCPythonReports
	"``tb_frame.f_locals'' -- and so TracebackException(capture_locals=True) --
	must name what CPython names.  Grail has no live frames: the locals are read
	off the still-live Smalltalk stack while the exception propagates and stored
	on the frame, and several Smalltalk frames merge into one Python frame.  Four
	things that walk got wrong, each independently visible in a rendering:

	  * A RAISE INSIDE A ``try:'' BODY put the raise-time snapshot on the try
	    block's frame, which owns no temporaries -- the function's variables are
	    in the frame outside it.  The snapshot was a real but EMPTY dict, and the
	    catch-time sweep, which reads every merged frame and would have found
	    them, skipped the frame for having an answer already.  Every
	    raise-and-catch-in-one-function traceback reported ``{}'' permanently.
	  * A METHOD'S ``self'' is Grail's Smalltalk RECEIVER rather than a
	    temporary, and ___isInternalTempName___ drops the spelling besides, so
	    the one name CPython always shows was the one always missing.
	  * A METHOD COMPILES TO ``_m: positional kw: kwargs'', and the fast path to
	    ``scale: _factor'' with the body opening ``factor := _factor''.  Both
	    transports were reported as if the program had variables of those names.
	  * THE ``except X as e'' TARGET is a timing difference, not a missing read:
	    CPython's f_locals is live, so the target is there while the handler runs
	    and gone after it (PEP 3110 deletes it).  Grail's snapshot predates the
	    handler entirely, so codegen hands the name over at handler entry and
	    removes it in the handler's ensure:.

	Together these are what test_traceback's
	TestColorizedTraceback.test_colorized_traceback_from_exception_group
	compares line for line, and it needed all four."

	| mod |
	importlib @env1:modules removeKey: #'frame_locals_capture' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_locals_capture.py')
		name: 'frame_locals_capture'.
	#( 'a_method_frame_reports_its_receiver'
	   'a_method_frame_reports_its_parameters'
	   'a_method_frame_reports_a_local_bound_before_the_raise'
	   'a_method_frame_hides_the_calling_convention_arguments'
	   'a_frame_that_catches_its_own_raise_still_reports_locals'
	   'each_frame_of_a_chain_reports_its_own_locals'
	   "Both halves of the except-target timing."
	   'the_except_target_is_bound_while_the_handler_runs'
	   'the_except_target_is_gone_once_the_handler_ends'
	   "End to end, through the renderer the CPython test reads."
	   'capture_locals_renders_the_receiver' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'frame locals capture check failed: ' , k , ' -> '
				, answer printString]
%
