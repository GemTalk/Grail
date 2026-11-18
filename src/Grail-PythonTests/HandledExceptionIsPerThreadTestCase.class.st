Class {
	#name : 'HandledExceptionIsPerThreadTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
HandledExceptionIsPerThreadTestCase >> testHandledExceptionIsPerThreadAsCPythonsIs [
	"tests/python/handled_exception_is_per_thread.py: a thread sitting in an
	except block is invisible to the others -- their sys.exception(), bare
	raise and implicit __context__ -- a new thread starts with nothing handled,
	a generator body sees the thread that resumed it (first run included), and
	two threads interleaving handler entry and exit keep their own clauses.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'handled_exception_is_per_thread' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/handled_exception_is_per_thread.py')
		name: 'handled_exception_is_per_thread'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
HandledExceptionIsPerThreadTestCase >> testSysCurrentExceptionsMapsEachThread [
	"sys._current_exceptions(): the caller, the main thread and every running
	started thread, each mapped to the exception it is handling or None.  Run
	from the main thread while a worker waits inside ``except ValueError'',
	as test_sys's test_current_exceptions does.  (Its walk from the
	exception's tb_frame out to the worker's callers is
	TracebackFrameReachesItsCallersTestCase.)"

	| result |
	result := self eval: 'import sys, threading
inside, leave = threading.Event(), threading.Event()
ident = []
def worker():
    ident.append(threading.get_ident())
    try:
        raise ValueError("oops")
    except ValueError:
        inside.set()
        leave.wait()
t = threading.Thread(target=worker)
t.start()
inside.wait()
try:
    d = sys._current_exceptions()
    main = threading.get_ident()
    out = [main in d, ident[0] in d, d.get(main), repr(d.get(ident[0])),
           all(isinstance(k, int) and k > 0 for k in d)]
finally:
    leave.set()
    t.join()
out.append(ident[0] in sys._current_exceptions())
repr(out)'.
	self
		assert: result asString
		equals: '[True, True, None, "ValueError(''oops'')", True, False]'

]
