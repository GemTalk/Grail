Class {
	#name : 'ThreadRegistryTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - thread registry' }
ThreadRegistryTestCase >> testAThreadIsCountedFromStartRatherThanFromFirstRun [
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

]

{ #category : 'Grail-Tests - thread registry' }
ThreadRegistryTestCase >> testEveryThreadRegistryCheckAgreesWithCPython [
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

]

{ #category : 'Grail-Tests - thread registry' }
ThreadRegistryTestCase >> testTheCorpusFixtureHelperCanRunAgain [
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

]
