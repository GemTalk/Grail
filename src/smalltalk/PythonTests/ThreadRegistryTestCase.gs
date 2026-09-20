! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ThreadRegistryTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ThreadRegistryTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ThreadRegistryTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ThreadRegistryTestCase - threading knows which threads are alive
! ===============================================================================
! Grail's threading had no registry of live threads at all -- no _active, no
! _limbo -- so active_count() and enumerate() did not exist, and current_thread()
! answered the main thread unconditionally, even when the caller was
! demonstrably somewhere else.
!
! active_count() is DEFINED by CPython as the length of enumerate(), so the
! registry is the subject here and the counter is a consequence.  That is why
! these tests ask what is IN the registry rather than only how big it is.
!
! THREE THINGS IN THE TREE ALREADY DEPENDED ON WHAT WAS MISSING:
!   * test.support.threading_helper.threading_setup() is
!     ``return (threading.active_count(),)'', so every corpus module whose
!     setUpModule calls it failed its fixture outright -- which is how this was
!     found, once PR #1031 made a failing module fixture say so;
!   * asgiref.current_thread_executor guards on
!     ``current_thread() != self._work_thread'', which could only ever be false;
!   * django's postgresql backend reads current_thread().ident, and the main
!     thread object had no ident to read.
!
! A gem is single-OS-threaded, so these are cooperative GsProcess green threads.
! Neither a dict store nor a dict delete yields, which is why the registry needs
! no lock where CPython's needs one -- the same reasoning threading.local is
! already built on.
!
! tests/python/thread_registry.py holds the 12 checks below and is run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ThreadRegistryTestCase removeAllMethods.
ThreadRegistryTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - thread registry'
method: ThreadRegistryTestCase
testEveryThreadRegistryCheckAgreesWithCPython
	"Every check in tests/python/thread_registry.py, which the fixture gate also
	runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'thread_registry' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/thread_registry.py')
		name: 'thread_registry'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_finished_thread_is_no_longer_counted'
	  'a_finished_thread_is_no_longer_enumerated'
	  'a_finished_thread_is_not_alive'
	  'a_quiet_program_has_one_live_thread'
	  'a_running_thread_is_counted'
	  'a_running_thread_is_enumerated'
	  'active_count_is_the_length_of_enumerate'
	  'current_thread_inside_a_thread_is_not_the_main_thread'
	  'current_thread_inside_a_thread_is_that_thread'
	  'current_thread_is_the_main_thread_here'
	  'the_main_thread_has_an_ident'
	  'the_main_thread_is_in_the_registry').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 12
%

category: 'Grail-Tests - thread registry'
method: ThreadRegistryTestCase
testTheCorpusFixtureHelperCanRunAgain
	"The measurement that started this: threading_setup() is the first thing
	test.test_urllib2_localnet's setUpModule does, and it raised AttributeError
	on active_count -- so the module's fixture never ran.

	Pinned HERE rather than in the CPython-measured fixture on purpose: Grail's
	threading_helper is a cut-down copy that answers a 1-tuple, where CPython
	3.14's answers (_thread._count(), _dangling.copy()).  A check written
	against Grail's shape could not run green under CPython, and a fixture that
	cannot is worse than no fixture."

	self assert: (self eval:
'from test.support import threading_helper
threading_helper.threading_setup()[0]
') equals: 1
%

category: 'Grail-Tests - thread registry'
method: ThreadRegistryTestCase
testAThreadIsCountedFromStartRatherThanFromFirstRun
	"Under Grail start() returns before the new GsProcess runs at all -- measured,
	not assumed -- and a thread in that window is alive.  That window is what
	CPython's second dict (_limbo) exists for, and here it is wide enough to
	observe directly, so registering only once a thread is on its feet would
	undercount every thread between start() and its first slice.

	Grail-specific on purpose, and not a check in the CPython-measured fixture:
	CPython's own answer is a race, because its start() waits for the thread to
	be running and a short target may already have finished."

	self assert: (self eval:
'import threading
worker = threading.Thread(target=lambda: None)
worker.start()
counted = threading.active_count()
worker.join()
counted
') equals: 2
%
