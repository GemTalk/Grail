! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ListSortKwargsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ListSortKwargsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ListSortKwargsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ListSortKwargsTestCase — list.sort(*, key=None, reverse=False) in place.  The
! 0-arg ``sort`` existed; the keyword-only ``key''/``reverse'' form (varargs
! ``_sort:kw:'') is what flask routing's rule sort needs.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ListSortKwargsTestCase removeAllMethods.
ListSortKwargsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ListSort'
method: ListSortKwargsTestCase
loadFixture
	"Load tests/python/list_sort_kwargs.py fresh."

	importlib @env1:modules @env0:removeKey: #'list_sort_kwargs' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/list_sort_kwargs.py')
		name: 'list_sort_kwargs'
%

category: 'Grail-Tests-ListSort'
method: ListSortKwargsTestCase
testSortByKey
	"``xs.sort(key=fn)`` orders by the key value, ascending."

	| r |
	r := self loadFixture @env1:sort_by_key.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) equals: 2.
	self assert: (r @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests-ListSort'
method: ListSortKwargsTestCase
testSortReverse
	"``xs.sort(reverse=True)`` sorts descending."

	| r |
	r := self loadFixture @env1:sort_reverse.
	self assert: (r @env1:__getitem__: 0) equals: 3.
	self assert: (r @env1:__getitem__: 1) equals: 2.
	self assert: (r @env1:__getitem__: 2) equals: 1
%

category: 'Grail-Tests-ListSort'
method: ListSortKwargsTestCase
testSortKeyAndReverse
	"``xs.sort(key=len, reverse=True)`` — longest first."

	| r |
	r := self loadFixture @env1:sort_key_and_reverse.
	self assert: (r @env1:__getitem__: 0) equals: 'ccc'.
	self assert: (r @env1:__getitem__: 1) equals: 'bb'.
	self assert: (r @env1:__getitem__: 2) equals: 'a'
%

category: 'Grail-Tests-ListSort'
method: ListSortKwargsTestCase
testSortReturnsNone
	"``list.sort()`` is in-place and returns None."

	| r |
	r := self loadFixture @env1:sort_returns_none.
	self assert: (r @env1:__getitem__: 0) equals: true.
	self assert: ((r @env1:__getitem__: 1) @env1:__getitem__: 0) equals: 1
%
