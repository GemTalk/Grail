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
! env 2 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Python-Initialization'
method: _bisect
initialize
	self
		initialize_bisect_right;
		initialize_bisect_left;
		initialize_insort_right;
		initialize_insort_left
%

category: 'Python-Initialization'
method: _bisect
initialize_bisect_right
	"bisect_right(a, x) -> int"
	self ___at___: #bisect_right put: [:positional :keywords |
		self ___class___ perform: #'callBisect:list:value:' env: 0
			withArguments: { 'bisect_right' . positional ___at___: 1 . positional ___at___: 2 }
	]
%

category: 'Python-Initialization'
method: _bisect
initialize_bisect_left
	"bisect_left(a, x) -> int"
	self ___at___: #bisect_left put: [:positional :keywords |
		self ___class___ perform: #'callBisect:list:value:' env: 0
			withArguments: { 'bisect_left' . positional ___at___: 1 . positional ___at___: 2 }
	]
%

category: 'Python-Initialization'
method: _bisect
initialize_insort_right
	"insort_right(a, x) -> None (modifies a in place)"
	self ___at___: #insort_right put: [:positional :keywords |
		self ___class___ perform: #'callInsort:list:value:' env: 0
			withArguments: { 'insort_right' . positional ___at___: 1 . positional ___at___: 2 }.
		None
	]
%

category: 'Python-Initialization'
method: _bisect
initialize_insort_left
	"insort_left(a, x) -> None (modifies a in place)"
	self ___at___: #insort_left put: [:positional :keywords |
		self ___class___ perform: #'callInsort:list:value:' env: 0
			withArguments: { 'insort_left' . positional ___at___: 1 . positional ___at___: 2 }.
		None
	]
%

category: 'Python-Accessors'
method: _bisect
bisect_right
	^ self ___at___: #bisect_right
%

category: 'Python-Accessors'
method: _bisect
bisect_left
	^ self ___at___: #bisect_left
%

category: 'Python-Accessors'
method: _bisect
insort_right
	^ self ___at___: #insort_right
%

category: 'Python-Accessors'
method: _bisect
insort_left
	^ self ___at___: #insort_left
%

set compile_env: 0
