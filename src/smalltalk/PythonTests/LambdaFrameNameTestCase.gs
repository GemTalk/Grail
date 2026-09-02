! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'LambdaFrameNameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LambdaFrameNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LambdaFrameNameTestCase - the NAME of a frame whose def shares a line with a
! lambda.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LambdaFrameNameTestCase removeAllMethods.
LambdaFrameNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: LambdaFrameNameTestCase
testNestedDefKeepsItsNameBesideALambda
	"A nested def and a lambda both compile to blocks, so neither carries a
	selector to decode a name from; the name comes from the PyCode stamp codegen
	writes into the enclosing method.  Locating that stamp BY LINE cannot
	separate two functions that begin on the same line, so

	    def inner():
	        return (lambda: 1 / 0)()

	reported <lambda> for inner's own frame as well as for the lambda's.

	Fixed by asking the BLOCK instead: its compiled method knows the offset of
	its own opening bracket in the home method's source, so matching that
	bracket finds the one stamp that names this block.  A source offset is fixed
	at compile time, which is why it is used here rather than an ip -- the two
	earlier cuts at nested-def naming were both exact locally and wrong under a
	native-code gem.

	Two of the five checks are CONTROLS, and the recursion one earns its place:
	a nested def that recurses legitimately puts several frames on one line, so
	it rules out fixing this by counting position in the frame chain."

	| mod |
	importlib @env1:modules removeKey: #'lambda_frame_names' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/lambda_frame_names.py')
		name: 'lambda_frame_names'.
	#( 'a_def_sharing_a_line_with_a_lambda_keeps_its_name'
	   'a_lambda_on_its_own_line_is_unchanged'
	   "The control that rules out a frame-position rule."
	   'a_recursive_nested_def_keeps_its_own_name'
	   'two_lambdas_on_one_line_each_get_a_frame'
	   "The LIVE walk -- the one sys._getframe counts through -- shares the
	    derivation and had the same defect."
	   'the_live_stack_names_the_def_and_the_lambda' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'lambda frame name check failed: ' , k , ' -> ' , answer printString]
%
