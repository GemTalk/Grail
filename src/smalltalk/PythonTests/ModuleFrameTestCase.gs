! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFrameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleFrameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleFrameTestCase - CPython's ``<module>'' frame, for a real module body and
! for an exec()/eval() one.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleFrameTestCase removeAllMethods.
ModuleFrameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: ModuleFrameTestCase
testModuleScopeFrames
	"An exception caught at MODULE SCOPE had no traceback at all -- not one
	missing its ``<module>'' entry, but an empty one, with the frames of every
	function the exception passed through missing too.

	The cause was one omission with a wide reach: the walk IDENTIFIES a Python
	frame by finding a ``___curPos___'' store in it, and codegen emitted that
	store only inside functions.  A script whose exception was caught in its own
	top level printed the exception line and nothing else.

	exec() and eval() bodies are the same question -- they ARE module bodies, as
	compiled doits -- with two things knowable only at the exec: the filename,
	which is compile()'s second argument, and the names the body can see, which
	live in the scope it was compiled against rather than in any Smalltalk
	temporary."

	| mod |
	importlib @env1:modules removeKey: #'module_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_frames.py')
		name: 'module_frames'.
	#( 'a_module_scope_catch_has_frames'
	   'a_module_scope_raise_names_the_module'
	   'an_exec_body_is_a_module_frame'
	   "The frames OUTSIDE an exec used to be lost with it: the exec'd body
	    became the walk's pending frame, nothing ever matched it, and everything
	    beyond was skipped as already-unwound."
	   'an_exec_body_keeps_the_frames_around_it'
	   'an_eval_suggests_a_name_from_its_own_scope' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'module frame check failed: ' , k , ' -> ' , answer printString]
%
