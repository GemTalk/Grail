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
SessionTemps); the loop''s hook registers the generator in a STRONG set
(no weakrefs -- the platform gap), and loop.shutdown_asyncgens() closes
everything registered, reporting close errors through the exception
handler with CPython''s message without stopping the sweep.  asyncio.run
awaits the sweep at teardown, after cancelling tasks -- and now also
reports a cancelled task that died of its own cleanup, with CPython''s
shutdown-phase label.

The sweep is the working substitute for the FINALIZER hook Grail cannot
fire; the finalizer keyword is stored, never called, and the two tests
that need collection-time firing are counted into the platform-gap entry.

Also pinned: Task.get_stack (one frame suspended, [] done) and the asend
value-through -- it.__anext__().send(10) delivers 10 to a STARTED
generator''s suspended yield.

See tests/python/asyncgen_shutdown_hooks.py (6 checks, CPython-validated
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
testGetStackAndAsendValueThrough
	self assertAll: #('get_stack_one_frame_suspended_empty_done'
		'asend_first_drive_delivers_the_sent_value')
%
