! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'TestSupportShimTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TestSupportShimTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TestSupportShimTestCase - the API shape of Grail's trimmed test.support shims.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TestSupportShimTestCase removeAllMethods.
TestSupportShimTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - CPython Harness Support'
method: TestSupportShimTestCase
testTrimmedSupportShimsKeepTheirUpstreamShape
	"Grail vendors a TRIMMED test.support, grown as modules need names -- and
	the growth signal was broken.  Every name checked here is read only from a
	CLASS-BODY DECORATOR position, where Grail silently drops a decorator whose
	expression raises, so a missing symbol produced an undecorated method rather
	than the error the shim's own header tells the maintainer to watch for.

	The cost was measured, not guessed: with the swallow removed, twelve of the
	102 curated modules failed to import, and the four largest shared ONE cause
	-- requires_working_threading aliased to a one-argument passthrough, while
	upstream CALLS it.  A passthrough that is dropped behaves exactly like one
	that is applied, which is why it survived.

	test_netrc is the row that moved.  Its test_security is decorated
	skipUnless(hasattr(os, 'getuid')) UNDER os_helper.skip_unless_working_chmod;
	the missing chmod symbol took the whole stack down, so a test that should
	have been skipped ran and failed on a NetrcParseError Grail cannot raise
	without os.getuid.  FAIL -> OK, with the skip count going 1 -> 2.

	Driven from a fixture with no __main__ guard: the assertion is about the
	SHAPE Grail's shim offers, and the CPython-comparison gate would be
	comparing against a different installation's test package."

	| mod |
	importlib @env1:modules removeKey: #'test_support_shim_api' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/test_support_shim_api.py')
		name: 'test_support_shim_api'.
	#( "The cluster of four: functools, itertools, enum, super."
	   'a_called_threading_decorator_takes_its_keyword'
	   'the_threading_decorator_handles_module_scope'
	   "The sibling that must NOT become a factory."
	   'reap_threads_is_still_used_bare'
	   'chmod_skip_is_a_decorator_and_chmod_works'
	   "The netrc shape in miniature -- the mark has to survive the outer
	    decorator, which is what a raising expression destroyed."
	   'a_stacked_skip_survives_the_chmod_decorator'
	   'no_tracing_wraps_and_still_calls'
	   'the_gil_flag_is_a_bool' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'test.support shim check failed: ' , k , ' -> ' , answer printString]
%
