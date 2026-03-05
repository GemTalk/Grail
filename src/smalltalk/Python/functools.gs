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
'Python functools module (stub).

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

category: 'Python-Accessors'
method: functools
lru_cache
	^ self ___at___: #lru_cache
%

category: 'Python-Accessors'
method: functools
reduce
	^ self ___at___: #reduce
%

category: 'Python-Initialization'
method: functools
initialize
	self
		initialize_lru_cache;
		initialize_reduce;
		yourself
%

category: 'Python-Initialization'
method: functools
initialize_lru_cache
	"lru_cache(maxsize=128) -> decorator
	Stub: returns the function unwrapped (no caching)."

	self ___at___: #lru_cache put: [:positional :keywords |
		"lru_cache(maxsize) returns a decorator.
		 The decorator returns the function unchanged (no caching yet)."
		[:positional2 :keywords2 |
			positional2 ___at___: 1
		]
	]
%

category: 'Python-Initialization'
method: functools
initialize_reduce
	"reduce(function, iterable[, initial]) -> value"

	self ___at___: #reduce put: [:positional :keywords |
		| function iterable result iter item hasInitial |
		function := positional ___at___: 1.
		iterable := positional ___at___: 2.
		hasInitial := positional __len__ ___gt___: 2.
		iter := iterable __iter__.
		hasInitial ifTrue: [
			result := positional ___at___: 3.
		] ifFalse: [
			result := iter __next__.
		].
		[
			[
				item := iter __next__.
				result := function value: { result. item } value: nil.
			] repeat.
		] ___on___: StopIteration do: [:ex | "done" ].
		result
	]
%

set compile_env: 0
