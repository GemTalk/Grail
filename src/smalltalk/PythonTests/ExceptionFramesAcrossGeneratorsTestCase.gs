! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptionFramesAcrossGeneratorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionFramesAcrossGeneratorsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExceptionFramesAcrossGeneratorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptionFramesAcrossGeneratorsTestCase - tracebacks and __context__ across a
! generator boundary
! ===============================================================================
! Found closing test.test_contextlib_async, whose remaining failures were Grail
! defects in the exception machinery, not in contextlib.  A generator body --
! and so a coroutine's -- runs on a FORKED GsProcess, and an exception still in
! flight is re-raised through a CARRIER (BaseException ___signalCarrying___:).
! Each group below is a place where one of those lost what CPython keeps:
!
!   * context   -- BaseException ___runFinally___:during: installed the CARRIER
!                  as the current exception, so a finally that raised during a
!                  throw() from inside a handler chained to a blank Exception().
!   * caught    -- ___buildFramesWalk___ flushed a generator body's pending frame
!                  only at a generator/consumer boundary, so an exception CAUGHT
!                  inside the body had no frame, and __traceback__ None.
!   * stop      -- ___pushTracebackFrame___ refused every StopIteration, a
!                  user's ``except StopIteration'' included; and
!                  ___applyImplicitContext___ released the capture of an
!                  exception whose traceback had not been built yet, which the
!                  StopIteration ending an awaited __aexit__ did to anything an
!                  ``async with'' body raised.
!   * re-raise  -- ``raise exc'' on an exception with a traceback added no frame
!                  for the raise, and a bare ``raise'' out of a generator's
!                  except clause dropped the consumer's frames (the stash was
!                  keyed by the carrier, and the carrier's capture never reached
!                  its payload).
!   * file      -- a class-body def's frame took the CATCHING code's file, which
!                  is contextlib.py when an @asynccontextmanager catches first.
!   * slots     -- a class whose SECONDARY base declares ``__slots__ = ()'' was
!                  made strict by importlib ___mergeSecondaryBases___.
!
! tests/python/exception_frames_across_generators.py holds the 10 checks, run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExceptionFramesAcrossGeneratorsTestCase removeAllMethods.
ExceptionFramesAcrossGeneratorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExceptionFramesAcrossGeneratorsTestCase
setUp

	importlib @env1:modules removeKey: #'exception_frames_across_generators' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_frames_across_generators.py')
		name: 'exception_frames_across_generators'
%

category: 'Grail-Helpers'
method: ExceptionFramesAcrossGeneratorsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ExceptionFramesAcrossGeneratorsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - context'
method: ExceptionFramesAcrossGeneratorsTestCase
testAFinallyChainsToTheExceptionThrownIn

	self assertAll: #('finally_raising_during_a_throw_chains_to_the_thrown_exception'
		'contextmanager_cleanup_chains_every_link')
%

category: 'Grail-Tests - tracebacks'
method: ExceptionFramesAcrossGeneratorsTestCase
testAnExceptionCaughtInsideTheBodyHasATraceback

	self assertAll: #('an_exception_caught_inside_a_generator_has_a_traceback'
		'an_exception_caught_inside_a_coroutine_has_a_traceback')
%

category: 'Grail-Tests - tracebacks'
method: ExceptionFramesAcrossGeneratorsTestCase
testStopExceptionsKeepTheirTraceback

	self assertAll: #('a_caught_stop_iteration_has_a_traceback'
		'an_async_with_keeps_the_traceback_of_what_its_body_raised')
%

category: 'Grail-Tests - tracebacks'
method: ExceptionFramesAcrossGeneratorsTestCase
testReRaisingKeepsEveryFrame

	self assertAll: #('raise_exc_adds_the_frame_of_the_raise'
		'a_bare_raise_out_of_a_generator_keeps_the_consumer_frames')
%

category: 'Grail-Tests - tracebacks'
method: ExceptionFramesAcrossGeneratorsTestCase
testAMethodFrameNamesItsOwnFile

	self assertAll: #('a_method_frame_names_its_own_file_when_contextlib_catches_first')
%

category: 'Grail-Tests - slots'
method: ExceptionFramesAcrossGeneratorsTestCase
testASlottedSecondaryBaseKeepsTheDict

	self assertAll: #('a_slotted_secondary_base_does_not_remove_the_dict')
%

category: 'Grail-Tests - slots'
method: ExceptionFramesAcrossGeneratorsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 10 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10
%
