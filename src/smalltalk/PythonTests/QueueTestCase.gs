! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for QueueTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'QueueTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
QueueTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
QueueTestCase removeAllMethods: 0.
QueueTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - queue'
method: QueueTestCase
testFifoOrder
	| result |
	result := self eval: 'import queue
q = queue.Queue()
q.put(1)
q.put(2)
q.put(3)
out = [q.get(), q.get(), q.get()]
out == [1, 2, 3] and q.empty()'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testGetNowaitEmptyRaises
	"Catch at the Python level - queue.Empty is a module-defined class."

	| result |
	result := self eval: 'import queue
q = queue.Queue()
try:
    q.get_nowait()
    caught = False
except queue.Empty:
    caught = True
caught'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testPutNowaitFullRaises
	| result |
	result := self eval: 'import queue
q = queue.Queue(2)
q.put_nowait("a")
q.put_nowait("b")
try:
    q.put_nowait("c")
    caught = False
except queue.Full:
    caught = True
caught and q.full() and q.qsize() == 2'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testGetTimeoutRaisesEmpty
	| result |
	result := self eval: 'import queue
q = queue.Queue()
try:
    q.get(True, 0.05)
    caught = False
except queue.Empty:
    caught = True
caught'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testLifoQueue
	| result |
	result := self eval: 'import queue
q = queue.LifoQueue()
q.put(1)
q.put(2)
q.put(3)
[q.get(), q.get(), q.get()] == [3, 2, 1]'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testPriorityQueue
	| result |
	result := self eval: 'import queue
q = queue.PriorityQueue()
q.put(5)
q.put(1)
q.put(3)
[q.get(), q.get(), q.get()] == [1, 3, 5]'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testTaskDoneAndJoin
	"join() returns immediately once every put has a matching
	task_done; extra task_done raises ValueError."

	| result |
	result := self eval: 'import queue
q = queue.Queue()
q.put("a")
q.put("b")
q.get()
q.task_done()
q.get()
q.task_done()
q.join()
try:
    q.task_done()
    extra = False
except ValueError:
    extra = True
extra'.
	self assert: result
%

category: 'Grail-Tests - queue'
method: QueueTestCase
testProducerThreadConsumerMain
	"Cross-thread handoff: a producer green thread puts while the main
	thread blocks in get() - the poll sleep must yield to the producer."

	| result |
	result := self eval: 'import queue
import threading
q = queue.Queue()
def producer():
    q.put("x")
    q.put("y")
t = threading.Thread(target=producer)
t.start()
a = q.get(True, 2.0)
b = q.get(True, 2.0)
t.join()
(a, b) == ("x", "y")'.
	self assert: result
%
