Class {
	#name : 'SignalRaiseSignalDeliversAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SignalRaiseSignalDeliversAsCPythonsTestCase >> testRaiseSignalDeliversAsCPythonsDoes [
	"tests/python/signal_raise_signal_delivers_as_cpythons.py: raise_signal
	runs the handler before it returns, with the number and the caller's
	frame, and what the handler raises comes out of it; SIG_IGN and a
	discarding SIG_DFL run nothing; the number is checked as raise(3) checks
	it; the wakeup fd gets the number first, and a failed write is
	unraisable.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'signal_raise_signal_delivers_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signal_raise_signal_delivers_as_cpythons.py')
		name: 'signal_raise_signal_delivers_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
SignalRaiseSignalDeliversAsCPythonsTestCase >> testRaiseSignalFromAnotherThreadIsRefused [
	"A DELIBERATE DIVERGENCE.  CPython runs a Python signal handler only on
	the main thread: raised from another, the signal is noted and the main
	thread runs the handler at its next bytecode boundary.  Grail has no such
	point at which to interrupt the main thread, so raise_signal refuses with
	NotImplementedError rather than run the handler on the wrong thread --
	where, for SIGINT, the KeyboardInterrupt would land in the worker.  The
	same signal raised on the main thread afterwards is delivered, so the
	refusal is the thread's, not raise_signal's."

	| result |
	result := self eval: 'import signal, threading
seen = []
out = []
def handler(signalnum, frame):
    seen.append(threading.current_thread() is threading.main_thread())
def worker():
    try:
        signal.raise_signal(signal.SIGUSR1)
        out.append("delivered")
    except NotImplementedError:
        out.append("refused")
old = signal.signal(signal.SIGUSR1, handler)
try:
    t = threading.Thread(target=worker)
    t.start()
    t.join()
    signal.raise_signal(signal.SIGUSR1)
finally:
    signal.signal(signal.SIGUSR1, old)
repr((out, seen))'.
	self assert: result asString equals: '([''refused''], [True])'

]

{ #category : 'Grail-Tests' }
SignalRaiseSignalDeliversAsCPythonsTestCase >> testRaiseSignalRefusesADefaultActionThatWouldEndTheGem [
	"A DELIBERATE DIVERGENCE.  Under SIG_DFL, CPython's raise_signal(SIGTERM)
	ends the process.  Grail's process is the gem, whose own SIGTERM handler
	shuts it down (hostsignal_unix.c, sigtermHandler), so raise_signal refuses
	with NotImplementedError instead.  A signal whose default action discards it (SIGCHLD) still runs
	nothing, as in CPython."

	| result |
	result := self eval: 'import signal
outcomes = []
for signalnum in (signal.SIGTERM, signal.SIGCHLD):
    old = signal.signal(signalnum, signal.SIG_DFL)
    try:
        outcomes.append(repr(signal.raise_signal(signalnum)))
    except NotImplementedError:
        outcomes.append("refused")
    finally:
        signal.signal(signalnum, old)
repr(outcomes)'.
	self assert: result asString equals: '[''refused'', ''None'']'

]
