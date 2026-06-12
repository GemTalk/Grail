! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HeapqTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HeapqTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
HeapqTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
HeapqTestCase removeAllMethods: 0.
HeapqTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - heapq'
method: HeapqTestCase
testHeappushHeappop
	"Pushing arbitrary order, popping yields ascending order."

	| result |
	result := self eval: 'import heapq
h = []
for v in [5, 1, 4, 1, 3]:
    heapq.heappush(h, v)
out = []
while h:
    out.append(heapq.heappop(h))
out == [1, 1, 3, 4, 5]'.
	self assert: result
%

category: 'Grail-Tests - heapq'
method: HeapqTestCase
testHeapify
	| result |
	result := self eval: 'import heapq
h = [9, 7, 5, 3, 1]
heapq.heapify(h)
first = h[0]
out = []
while h:
    out.append(heapq.heappop(h))
first == 1 and out == [1, 3, 5, 7, 9]'.
	self assert: result
%

category: 'Grail-Tests - heapq'
method: HeapqTestCase
testHeapreplaceAndHeappushpop
	| result |
	result := self eval: 'import heapq
h = [2, 4, 6]
heapq.heapify(h)
a = heapq.heapreplace(h, 5)
b = heapq.heappushpop(h, 1)
c = heapq.heappushpop(h, 7)
a == 2 and b == 1 and c == 4 and sorted(h) == [5, 6, 7]'.
	self assert: result
%

category: 'Grail-Tests - heapq'
method: HeapqTestCase
testNsmallestNlargest
	| result |
	result := self eval: 'import heapq
data = [4, 2, 9, 1, 7]
small = heapq.nsmallest(3, data)
large = heapq.nlargest(2, data)
bykey = heapq.nsmallest(2, ["bbb", "a", "cc"], key=len)
small == [1, 2, 4] and large == [9, 7] and bykey == ["a", "cc"]'.
	self assert: result
%

category: 'Grail-Tests - heapq'
method: HeapqTestCase
testMerge
	| result |
	result := self eval: 'import heapq
out = list(heapq.merge([1, 4, 7], [2, 5], [3]))
out == [1, 2, 3, 4, 5, 7]'.
	self assert: result
%
