"Abstract base for CPython test cases. Provides:

  - Resource pool (track: and pyX: factory methods) for CPythonObject lifecycle.
  - gc.garbage assertion after each test (checkNoLeaks).

Do not override setUp or tearDown without sending to super."
Class {
	#name : 'CPythonTestCase',
	#superclass : 'TestCase',
	#instVars : [
		'pool',
		'pythonLibrary'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Testing' }
CPythonTestCase class >> isAbstract [

	^ self sunitName = #CPythonTestCase

]

{ #category : 'Grail-Teardown' }
CPythonTestCase >> checkNoLeaks [
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

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> importModule: aString [
	
	| result |
	
	result := self track: (pythonLibrary importModule: aString).
	pythonLibrary runStatements: 'import ' , aString.
	
	^ result

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyBoolean: aBoolean [

	^ self track: (CPythonObject fromBoolean: aBoolean)

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyDict [

	^ self track: CPythonObject newDict

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyFloat: aFloat [

	^ self track: (CPythonObject fromFloat: aFloat)

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyInteger: anInteger [

	^ self track: (CPythonObject fromInteger: anInteger)

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyList: size [

	^ self track: (CPythonObject newList: size)

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyNone [

	^ self track: CPythonObject none

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyString: aString [

	^ self track: (CPythonObject fromString: aString)

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> pyTuple: size [

	^ self track: (CPythonObject newTuple: size)

]

{ #category : 'Grail-Setup' }
CPythonTestCase >> setUp [

	pool := OrderedCollection new.
	pythonLibrary := CPythonLibrary current.

]

{ #category : 'Grail-Teardown' }
CPythonTestCase >> tearDown [

	pool reverseDo: [ :obj | obj release ].
	self checkNoLeaks.

]

{ #category : 'Grail-Test Support' }
CPythonTestCase >> track: aCPythonObject [

	aCPythonObject ifNotNil: [ pool add: aCPythonObject ].
	
	^ aCPythonObject

]
