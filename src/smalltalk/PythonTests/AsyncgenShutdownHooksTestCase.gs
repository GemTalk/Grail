! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncgenShutdownHooksTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsyncgenShutdownHooksTestCase comment:
'The asyncgen hooks and the shutdown sweep: how a loop learns which
generators to close, and closes them.

sys.set_asyncgen_hooks stores its keywords independently (sys.gs -- note
the ``_name: positional kw: kwargs'' selector convention: the underscored
:kw: form is what a kwargs call dispatches to, and the plain-name shapes
are what the attribute resolver finds; getting that wrong made the first
install of this work take four asyncio modules down at once).  The runtime
fires FIRSTITER once per async generator at its first drive
(PythonAsyncGenerator >> ___fireFirstiterIfNeeded___, hook in
SessionTemps); the loop''s hook registers the generator in a WeakSet, and
loop.shutdown_asyncgens() closes whatever is still alive, reporting close
errors through the exception handler with CPython''s message without
stopping the sweep.  asyncio.run awaits the sweep at teardown, after
cancelling tasks -- and reports a cancelled task that died of its own
cleanup, with CPython''s shutdown-phase label.

The FINALIZER hook fires too: it is bound at the first drive, and a
generator collected unfinished is handed to it (a FinalizerEphemeron,
WeakReference.gs), so asyncio schedules its aclose() on the loop.  Only
possible since a suspended generator is collectable at all
(PythonGenerator >> ___unrootParkedProducer___, WeakReference class >>
_flushProcessStackAreas) -- which testCollection pins, sync generators and
the for loop''s iterator included.  An undriven step object warns that it
was never awaited, from the same kind of hook.

Also pinned: Task.get_stack (one frame suspended, [] done) and the asend
value-through -- it.__anext__().send(10) delivers 10 to a STARTED
generator''s suspended yield.

See tests/python/asyncgen_shutdown_hooks.py (11 checks, CPython-validated
first).'
%

expectvalue /Class
doit
AsyncgenShutdownHooksTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsyncgenShutdownHooksTestCase removeAllMethods: 0.
AsyncgenShutdownHooksTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncgenShutdownHooksTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncgen_shutdown_hooks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asyncgen_shutdown_hooks.py')
		name: 'asyncgen_shutdown_hooks'.
%

category: 'Grail-Helpers'
method: AsyncgenShutdownHooksTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsyncgenShutdownHooksTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AsyncgenShutdownHooksTestCase
testHooksAndTheSweep
	self assertAll: #('set_asyncgen_hooks_updates_each_keyword_independently'
		'firstiter_fires_once_at_the_first_drive'
		'asyncio_run_sweeps_abandoned_generators'
		'the_sweep_reports_a_close_error_and_continues')
%

category: 'Grail-Tests'
method: AsyncgenShutdownHooksTestCase
testCollection
	"A suspended generator is garbage once nothing refers to it -- it used to
	be pinned for the session by its parked producer process -- and a for
	loop drops its iterator at exit, as CPython's does."

	self assertAll: #('a_suspended_generator_is_collected'
		'a_for_loop_releases_its_iterator_at_exit')
%

category: 'Grail-Tests'
method: AsyncgenShutdownHooksTestCase
testTheFinalizerHook
	"PEP 525's finalizer: handed an unfinished generator at collection, never
	a finished or never-started one; asyncio's closes it on the loop, with no
	shutdown sweep involved."

	self assertAll: #('the_finalizer_hook_gets_only_an_unfinished_generator'
		'an_abandoned_generator_is_closed_by_the_finalizer_hook')
%

category: 'Grail-Tests'
method: AsyncgenShutdownHooksTestCase
testAnUndrivenStepWarns
	self assertAll: #('an_undriven_step_warns_it_was_never_awaited')
%

category: 'Grail-Tests'
method: AsyncgenShutdownHooksTestCase
testGetStackAndAsendValueThrough
	self assertAll: #('get_stack_one_frame_suspended_empty_done'
		'asend_first_drive_delivers_the_sent_value')
%
