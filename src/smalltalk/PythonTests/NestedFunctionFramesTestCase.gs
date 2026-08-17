! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NestedFunctionFramesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedFunctionFramesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedFunctionFramesTestCase - a nested def gets its own traceback frame.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedFunctionFramesTestCase removeAllMethods.
NestedFunctionFramesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Data Model'
method: NestedFunctionFramesTestCase
testNestedFunctionFrames
	"A nested ``def'' must get its own traceback frame.

	Grail compiles a nested ``def'' to a BLOCK -- it has to: only a block can
	close over the enclosing function's locals, only a block has no class to
	live in, and only a fresh block copy per execution gives CPython's distinct
	function object per ``def''.  ___buildFramesFromCapturedStack___ merged
	every block into its home method, which is RIGHT for the other things
	blocks are used for -- a comprehension body, a ``try'' body, an ``except''
	handler -- because CPython has no frame for any of those.  The cost was
	that nested functions had NO frames at all: ``outer'' calling ``inner''
	reported ONE frame where CPython reports two, and three levels still
	reported one.

	Told apart by ARGUMENT COUNT.  Codegen calls a Python function block as
	``[:___positional___ :___kwargs___ | ...]'', and nothing else in env 1
	emits a two-argument block -- comprehension bodies, ``try'' bodies,
	``except'' handlers and the generator machinery are all zero-argument
	(measured across all of them).  The ``___pyNamed___'' / ``___pyCode___''
	stamps would be the obvious test and are NOT usable: they live on the block
	OBJECT, while the stack walk sees only compiled methods.

	The NAME checks carry as much weight as the counts.  A block has no
	selector, so the frame's name is recovered by scanning the home method's
	source for the ``PyCode name:'' its codegen emitted; a wrong scan yields a
	frame of the right shape under a misleading name, which a count alone
	would not catch.  The LINE checks are the third leg: they run BACKWARDS
	down the traceback (the outer frame sits at the ``inner()'' call, which
	FOLLOWS the nested body), so a frame that borrowed its home method's
	position would come out ascending or all-equal.

	``comprehension_adds_no_frame'' is the negative control -- it is what
	stops the fix over-reaching into the blocks that must stay merged.

	All twelve checks answer identically under real CPython 3.14.6.  See
	tests/python/nested_function_frames.py."

	| mod results |
	importlib @env1:modules removeKey: #'nested_function_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_function_frames.py')
		name: 'nested_function_frames'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'module_level_frames' 'reads_a_local_frames' 'takes_a_parameter_frames'
	   'two_deep_frames' 'in_a_method_frames'
	   'module_level_names' 'two_deep_names' 'takes_a_parameter_names'
	   'in_a_method_names'
	   'module_level_lines' 'two_deep_lines'
	   'comprehension_adds_no_frame' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'nested-function frame check failed: ' , k]
%
