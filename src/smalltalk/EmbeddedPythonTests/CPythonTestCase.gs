fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonTestCase
expectvalue /Class
doit
TestCase subclass: 'CPythonTestCase'
  instVarNames: #( pool pythonLibrary)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPythonTests
  options: #()

%
expectvalue /Class
doit
CPythonTestCase comment: 
'Abstract base for CPython test cases. Provides:

  - Resource pool (track: and pyX: factory methods) for CPythonObject lifecycle.
  - gc.garbage assertion after each test (checkNoLeaks).

Do not override setUp or tearDown without sending to super.'
%
expectvalue /Class
doit
CPythonTestCase category: 'Grail-SUnit'
%
! ------------------- Remove existing behavior from CPythonTestCase
removeallmethods CPythonTestCase
removeallclassmethods CPythonTestCase
! ------------------- Class methods for CPythonTestCase
category: 'Grail-Testing'
classmethod: CPythonTestCase
isAbstract

	^ self sunitName = #CPythonTestCase
%
! ------------------- Instance methods for CPythonTestCase
category: 'Grail-Teardown'
method: CPythonTestCase
checkNoLeaks
	"Force a CPython GC collection and assert no cyclic garbage remains."

	pythonLibrary runStatements: '

import sys as _sys, gc as _gc

# sys.last_* pin the last uncaught exception''s frame chain, keeping any
# cycles it references reachable and hidden from the gc.garbage check.
for _n in ("last_exc", "last_type", "last_value", "last_traceback"):
    if hasattr(_sys, _n): delattr(_sys, _n)

_gc.collect()
_gc.collect()

assert _gc.garbage == [], f"CPython GC garbage: {_gc.garbage}"

'.
%
category: 'Grail-Test Support'
method: CPythonTestCase
importModule: aString
	
	| result |
	
	result := self track: (pythonLibrary importModule: aString).
	pythonLibrary runStatements: 'import ' , aString.
	
	^ result
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyBoolean: aBoolean

	^ self track: (CPythonObject fromBoolean: aBoolean)
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyDict

	^ self track: CPythonObject newDict
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyFloat: aFloat

	^ self track: (CPythonObject fromFloat: aFloat)
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyInteger: anInteger

	^ self track: (CPythonObject fromInteger: anInteger)
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyList: size

	^ self track: (CPythonObject newList: size)
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyNone

	^ self track: CPythonObject none
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyString: aString

	^ self track: (CPythonObject fromString: aString)
%
category: 'Grail-Test Support'
method: CPythonTestCase
pyTuple: size

	^ self track: (CPythonObject newTuple: size)
%
category: 'Grail-Setup'
method: CPythonTestCase
setUp

	pool := OrderedCollection new.
	pythonLibrary := CPythonLibrary current.
%
category: 'Grail-Teardown'
method: CPythonTestCase
tearDown

	pool reverseDo: [ :obj | obj release ].
	self checkNoLeaks.
%
category: 'Grail-Test Support'
method: CPythonTestCase
track: aCPythonObject

	aCPythonObject ifNotNil: [ pool add: aCPythonObject ].
	
	^ aCPythonObject
%
