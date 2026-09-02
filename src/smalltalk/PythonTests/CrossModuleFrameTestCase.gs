! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CrossModuleFrameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CrossModuleFrameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CrossModuleFrameTestCase - the filename of a frame whose function is defined in
! another module.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CrossModuleFrameTestCase removeAllMethods.
CrossModuleFrameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: CrossModuleFrameTestCase
testCrossModuleFrameFilenames
	"Every frame but the module body took its filename from the CATCHING code
	object, so a function defined in one module and called from another was
	reported against the CALLER's file -- right line, right columns, wrong file.

	Since FrameSummary prefers linecache over the embedded source line, that
	also made the frame PRINT the caller's line of that number, with a caret
	line under text from an unrelated module.  Any program of more than one
	module was affected.

	A method's own class knows better: a Python function of module X is a method
	on class X, whose module body carries the ``___pyFile___'' stamp codegen puts
	there.  The exec() check guards the other direction -- a doit's own stamp,
	which holds compile()'s filename, still has to win."

	| mod |
	importlib @env1:modules removeKey: #'cross_module_frames' ifAbsent: [].
	importlib @env1:modules removeKey: #'cross_module_helper' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/cross_module_frames.py')
		name: 'cross_module_frames'.
	#( 'a_frame_names_the_file_its_function_came_from'
	   'the_calling_frame_still_names_the_calling_file'
	   'a_nested_def_in_another_module_names_that_module'
	   'a_lambda_in_another_module_names_that_module'
	   "Reverting the fix alone fails the three cross-module checks and leaves
	    these two passing, so each says something the others do not."
	   'an_exec_body_still_keeps_compiles_filename' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'cross-module frame check failed: ' , k , ' -> ' , answer printString]
%
