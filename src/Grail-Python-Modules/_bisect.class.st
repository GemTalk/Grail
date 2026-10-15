"Python _bisect C extension module.

Provides bisection algorithms: bisect_right, bisect_left, insort_right,
insort_left. This wrapper delegates to CPythonShim which calls the C
implementation compiled against cpython.h.

The C module operates on float lists. Python lists passed from Grail
are converted to/from float arrays at the boundary.

Methods on this class are real env-1 fast-path methods, dispatched
directly via `_bisect.method(args)` Python calls compiled to
`((_bisect) method: a _: x)` Smalltalk sends.

Usage (from Python source):
    import _bisect
    idx = _bisect.bisect_right([1.0, 2.0, 3.0, 4.0, 5.0], 3.0)   # => 3

"
Class {
	#name : '_bisect',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
_bisect class >> callBisect: methodName list: anOrderedCollection value: aFloat [
	"Call bisect_left or bisect_right via CPythonShim.
	The C code reads the collection via PyList_GetItem."

	^ CPythonShim current
		callModule: '_bisect'
		method: methodName
		with: anOrderedCollection
		with: aFloat

]

{ #category : 'Grail-Private' }
_bisect class >> callInsort: methodName list: anOrderedCollection value: aFloat [
	"Call insort_left or insort_right via CPythonShim.
	The C code modifies the OrderedCollection in place via GCI."

	CPythonShim current
		callModule: '_bisect'
		method: methodName
		with: anOrderedCollection
		with: aFloat

]
