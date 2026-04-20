! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------- _bisect class (C extension module via shim)
expectvalue /Class
doit
module subclass: '_bisect'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_bisect comment:
'Python _bisect C extension module.

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
'
%

expectvalue /Class
doit
_bisect category: 'Modules'
%

expectvalue /Metaclass3
doit
_bisect removeAllMethods.
_bisect class removeAllMethods.
%

! ===============================================================================
! env 0 class methods — bridge to CPythonShim
! ===============================================================================

set compile_env: 0

category: 'Private'
classmethod: _bisect
callBisect: methodName list: anOrderedCollection value: aFloat
	"Call bisect_left or bisect_right via CPythonShim.
	The C code reads the collection via PyList_GetItem."

	^ CPythonShim current
		callModule: '_bisect'
		method: methodName
		with: anOrderedCollection
		with: aFloat
%

category: 'Private'
classmethod: _bisect
callInsort: methodName list: anOrderedCollection value: aFloat
	"Call insort_left or insort_right via CPythonShim.
	The C code modifies the OrderedCollection in place via GCI."

	CPythonShim current
		callModule: '_bisect'
		method: methodName
		with: anOrderedCollection
		with: aFloat
%

! ===============================================================================
! env 1 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Python-Initialization'
method: _bisect
initialize
	"No-op. The `module>>instance` class method still calls
	`initialize` on the newly-created instance, so this stub keeps
	that contract."
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Python-Built-in Functions'
method: _bisect
bisect_right: a _: x
	"Python _bisect.bisect_right(a, x) — fast path. Returns
	the rightmost insertion point for x in sorted list a."

	^ self @env0:class @env0:callBisect: 'bisect_right' list: a value: x
%

category: 'Python-Built-in Functions'
method: _bisect
bisect_left: a _: x
	"Python _bisect.bisect_left(a, x) — fast path. Returns
	the leftmost insertion point for x in sorted list a."

	^ self @env0:class @env0:callBisect: 'bisect_left' list: a value: x
%

category: 'Python-Built-in Functions'
method: _bisect
insort_right: a _: x
	"Python _bisect.insort_right(a, x) — fast path. Inserts
	x into sorted list a at the rightmost insertion point. Modifies
	the list in place; returns None."

	self @env0:class @env0:callInsort: 'insort_right' list: a value: x.
	^ None
%

category: 'Python-Built-in Functions'
method: _bisect
insort_left: a _: x
	"Python _bisect.insort_left(a, x) — fast path. Inserts
	x into sorted list a at the leftmost insertion point. Modifies
	the list in place; returns None."

	self @env0:class @env0:callInsort: 'insort_left' list: a value: x.
	^ None
%

set compile_env: 0
