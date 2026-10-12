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
	   'an_exec_body_still_keeps_compiles_filename'
	   "...and the function an exec'd body DEFINED, which is neither a method on a
	    module class nor the body carrying the stamp, so it borrowed the CATCHING
	    module's file until ___pythonFileForDoitOf___ (design log 9.56)."
	   'an_exec_defined_function_keeps_compiles_filename' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'cross-module frame check failed: ' , k , ' -> ' , answer printString]
%

category: 'Grail-Tests - Traceback Runtime'
method: CrossModuleFrameTestCase
testTracebackEndsAtTheCatchingActivation
	"A traceback ends at the frame that CAUGHT, not at the first frame on the way
	out that carries the catcher's name (#1401): a module body imported inside a
	module-level try (both are <module>), a recursive call of the catching
	function, a same-named function defined by exec.  The walk took the first
	such frame for the catcher, gave it the catcher's line and file, and stopped.

	See tests/python/catching_frame_identity.py (CPython 3.14's values)."

	| mod results expected b keys |
	importlib @env1:modules removeKey: #'catching_frame_identity' ifAbsent: [].
	importlib @env1:modules removeKey: #'catching_frame_module_helper' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/catching_frame_identity.py')
		name: 'catching_frame_identity'.
	 results := mod @env1:___pyAttrLoad___: #'r'.
	 expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	 keys := mod @env1:___pyAttrLoad___: #'KEYS'.
	 b := builtins @env1:instance.
	 self assert: (keys @env1:__len__) equals: 7.
	 0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (results @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'catching_frame_identity' ifAbsent: [].
			importlib @env1:modules removeKey: #'catching_frame_module_helper' ifAbsent: []]
%
