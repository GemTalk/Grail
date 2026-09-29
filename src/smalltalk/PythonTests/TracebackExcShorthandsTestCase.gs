! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TracebackExcShorthandsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TracebackExcShorthandsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TracebackExcShorthandsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TracebackExcShorthandsTestCase - the exc_info() shorthands act on limit/chain
! ===============================================================================
! format_exception honoured both all along; only the sys.exc_info() shorthands
! were wrong, in three ways and one of them loudly:
!
!     format_exc(1)            the limit was DROPPED -- whole traceback
!     format_exc(limit=1)      TypeError: unexpected keyword argument 'limit'
!     format_exc(chain=False)  TypeError: unexpected keyword argument 'chain'
!     print_exc(limit=1)       dropped, silently
!     print_exc(chain=False)   dropped, silently
!     print_last(chain=False)  dropped, silently
!
! format_exc(limit=N) is a common way to keep a logged traceback short, and the
! TypeError came from INSIDE an except block, so it replaced the exception being
! reported (#1263).
!
! print_exception was dropping `chain' too, which the issue did not list.  That
! one is load-bearing beyond its own call: print_exc delegates to it, so the
! issue's own suggested fix for print_exc would have left print_exc(chain=False)
! still broken.
!
! format_exc took *args because a zero-parameter function read as a module
! attribute used to be INVOKED on read -- the unary form returned the string and
! the caller's `()' then tried to call it.  That no longer happens (a
! zero-parameter module function now reads as a BoundMethod), so CPython's own
! signature works.  testReadingTheFunctionOffTheModuleStillGivesACallable is what
! pins it, being the regression the varargs hack existed to prevent.
!
! Measured against CPython 3.14 on the same machine, all twelve shapes of the
! issue's table agreeing exactly.
!
! tests/python/traceback_exc_shorthands_honour_limit_and_chain.py holds the 17
! checks and is self-running, so scripts/check_python_fixtures.sh runs it under
! real CPython too.  WITHOUT the fix it does not merely fail -- it does not LOAD,
! because format_exc(limit=1) raises the TypeError while the fixture is still
! being imported.  The silently-dropped rows (print_exc, print_exception) were
! measured separately against CPython before and after, since a module that
! cannot load cannot report them one by one.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TracebackExcShorthandsTestCase removeAllMethods.
TracebackExcShorthandsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TracebackExcShorthandsTestCase
setUp

	importlib @env1:modules
		removeKey: #'traceback_exc_shorthands_honour_limit_and_chain'
		ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir ,
			'/tests/python/traceback_exc_shorthands_honour_limit_and_chain.py')
		name: 'traceback_exc_shorthands_honour_limit_and_chain'
%

category: 'Grail-Helpers'
method: TracebackExcShorthandsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: TracebackExcShorthandsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - format_exc'
method: TracebackExcShorthandsTestCase
testFormatExcHonoursLimitPositionallyAndByKeywordAndChain
	"The loud half: the two keyword spellings used to raise TypeError from
	inside the except block they were reporting on."

	self assertAll: #('format_exc_default_renders_everything'
		'format_exc_honours_a_positional_limit'
		'format_exc_honours_a_keyword_limit'
		'format_exc_honours_chain_false')
%

category: 'Grail-Tests - print_exc'
method: TracebackExcShorthandsTestCase
testPrintExcHonoursLimitAndChainAndTakesLimitFirst
	"The quiet half: these raised nothing and printed the whole traceback."

	self assertAll: #('print_exc_default_renders_everything'
		'print_exc_honours_a_keyword_limit'
		'print_exc_honours_chain_false'
		'print_exc_takes_limit_then_file_positionally')
%

category: 'Grail-Tests - print_exception'
method: TracebackExcShorthandsTestCase
testPrintExceptionForwardsChainToFormatException
	"Not in the issue, and the reason fixing the shorthand alone was not
	enough -- print_exc renders through this function."

	self assertAll: #('print_exception_honours_chain_false'
		'print_exception_honours_limit')
%

category: 'Grail-Tests - unchanged'
method: TracebackExcShorthandsTestCase
testTheDelegateAndTheLimitEdgesAreUnchanged
	"format_exception was already right, so it is asserted here: a ``fix'' that
	broke it could not pass.  limit=0 shows no frames and a negative limit
	counts from the END of the traceback, which is CPython's rule."

	self assertAll: #('format_exception_was_and_is_correct'
		'limit_zero_shows_no_frames'
		'a_negative_limit_counts_from_the_end'
		'chain_false_is_a_noop_without_a_context'
		'no_active_exception_still_reads_nonetype_none'
		'print_last_without_a_last_exception_still_raises')
%

category: 'Grail-Tests - module read'
method: TracebackExcShorthandsTestCase
testReadingTheFunctionOffTheModuleStillGivesACallable
	"The regression *args existed to prevent.  format_exc now has all-default
	parameters, which is the shape that used to be invoked on attribute read,
	so reading it and calling the handle -- with and without the keyword --
	is the check that licences the new signature."

	self assertAll: #('read_then_call_still_works')
%

category: 'Grail-Tests - unchanged'
method: TracebackExcShorthandsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 17 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 17
%
