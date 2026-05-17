! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NextIterTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NextIterTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NextIterTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
NextIterTestCase removeAllMethods.
NextIterTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! NextIterTestCase — bare iter() and next() builtins
!
! re/__init__.py's `next(iter(_cache))` LRU-pop pattern needs both.
! ===============================================================================

category: 'Grail-Setup'
method: NextIterTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'next_iter' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/next_iter.py')
		name: 'next_iter'.
%

category: 'Grail-Tests - iter()/next()'
method: NextIterTestCase
testIterAndNextOnList
	"iter([1,2,3]) yields the list elements in order via next()."

	self assert: (testModule @env1:first) equals: 10.
	self assert: (testModule @env1:second) equals: 20.
	self assert: (testModule @env1:third) equals: 30.
%

category: 'Grail-Tests - iter()/next()'
method: NextIterTestCase
testNextWithDefault
	"next(it, default) returns default instead of raising
	StopIteration when the iterator is exhausted."

	self assert: (testModule @env1:default_result) equals: 'no_more'.
%

category: 'Grail-Tests - iter()/next()'
method: NextIterTestCase
testIterOnDict
	"iter(dict) yields a key (re/__init__.py's
	`next(iter(_cache))` LRU pattern works regardless of which key
	comes out — though CPython's insertion-order guarantee would
	give the actual oldest)."

	self assert: (testModule @env1:some_key_is_valid) equals: true.
%

category: 'Grail-Tests - iter()/next()'
method: NextIterTestCase
testIterOnString
	"Strings are iterable, yielding one-character strings."

	self assert: (testModule @env1:c1) equals: 'a'.
	self assert: (testModule @env1:c2) equals: 'b'.
	self assert: (testModule @env1:c3) equals: 'c'.
%

category: 'Grail-Tests - iter()/next()'
method: NextIterTestCase
testNextRaisesStopIteration
	"next(it) without a default propagates StopIteration when the
	iterator is exhausted."

	self assert: (testModule @env1:raised) equals: true.
%
