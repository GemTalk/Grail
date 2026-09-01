! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'LambdaFrameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LambdaFrameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LambdaFrameTestCase - the PEP 657 span of a ``<lambda>'' traceback frame.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LambdaFrameTestCase removeAllMethods.
LambdaFrameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: LambdaFrameTestCase
testLambdaFrameSpans
	"A <lambda> frame underlined its CALLER's call site rather than the lambda
	body -- and the two frames sit on the same source line, so the columns are
	the only thing that tells them apart.

	Grail recovers a frame's position by scanning the generated Smalltalk
	backwards from the ip for the last ``___curPos___ :='' store, and a lambda
	body is an EXPRESSION, so no store was emitted inside its block: the scan
	ran past the opening bracket to the enclosing statement's store.

	Two halves, and the fixture covers each separately -- disabling either one
	alone makes checks here fail:

	  * the block stores its OWN span, into a ___curPos___ that SHADOWS the
	    enclosing temp, so the enclosing frame's runtime position (what a
	    catching frame reads) is untouched;
	  * the enclosing store is put back, for the SCAN, as a comment after the
	    closing bracket, so every later ip in the enclosing frame still finds
	    it."

	| mod |
	importlib @env1:modules removeKey: #'lambda_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/lambda_frames.py')
		name: 'lambda_frames'.
	#( 'a_lambda_frame_spans_its_body'
	   'a_lambda_does_not_disturb_its_callers_span'
	   'a_nested_lambda_spans_its_own_body'
	   "The only check of the SHADOWING rather than of the restore: a catching
	    frame reads ___curPos___ at run time, not from the text."
	   'a_lambda_does_not_move_the_catching_frame'
	   'a_quote_in_the_line_keeps_the_callers_span' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'lambda frame check failed: ' , k , ' -> ' , answer printString]
%
