! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- functools class (Python 'functools' module)
expectvalue /Class
doit
module subclass: 'functools'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools comment:
'Python functools module.

Provides higher-order functions and operations on callable objects.
Currently implements lru_cache as a pass-through (no caching) and reduce.
See https://docs.python.org/3/library/functools.html
'
%

expectvalue /Class
doit
functools category: 'Modules'
%

expectvalue /Metaclass3
doit
functools removeAllMethods: 1.
functools class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Initialization'
method: functools
initialize
	"No-op — all methods are real fast-path methods."
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Python-Built-in Functions'
method: functools
lru_cache: maxsize
	"lru_cache(maxsize) -> decorator.
	Stub: returns a decorator that passes the function through unchanged
	(no caching). The decorator is a block that takes positional args
	and returns the first arg (the function)."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

category: 'Python-Built-in Functions'
method: functools
reduce: function _: iterable
	"reduce(function, iterable) -> value.
	Apply function of two arguments cumulatively to the items of
	iterable, from left to right."

	| result iter item |
	iter := iterable __iter__.
	result := iter __next__.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

category: 'Python-Built-in Functions'
method: functools
reduce: function _: iterable _: initial
	"reduce(function, iterable, initial) -> value.
	Like reduce/2 but uses initial as the starting value."

	| result iter item |
	iter := iterable __iter__.
	result := initial.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

set compile_env: 0
