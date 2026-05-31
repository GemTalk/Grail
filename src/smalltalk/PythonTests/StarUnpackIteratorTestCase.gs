! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StarUnpackIteratorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StarUnpackIteratorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
StarUnpackIteratorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StarUnpackIteratorTestCase — ``*expr'' unpacking where expr is a Python
! ITERATOR (reversed / iter / dict.keys() / generator), not a list/tuple.  The
! splat codegen now materializes any iterable via ___pyStarToArray___ instead
! of a bare asArray.  flask's preprocess_request does
! ``(None, *reversed(request.blueprints))''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StarUnpackIteratorTestCase removeAllMethods.
StarUnpackIteratorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-StarUnpack'
method: StarUnpackIteratorTestCase
loadFixture
	"Load tests/python/star_unpack_iterator.py fresh."

	importlib @env1:modules @env0:removeKey: #'star_unpack_iterator' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/star_unpack_iterator.py')
		name: 'star_unpack_iterator'
%

category: 'Grail-Tests-StarUnpack'
method: StarUnpackIteratorTestCase
testReversedInTuple
	"``(0, *reversed([1,2,3]))`` — the flask preprocess_request shape."

	| r |
	r := self loadFixture @env1:reversed_in_tuple.
	self assert: r @env0:size equals: 4.
	self assert: (r @env1:__getitem__: 0) equals: 0.
	self assert: (r @env1:__getitem__: 1) equals: 3.
	self assert: (r @env1:__getitem__: 2) equals: 2.
	self assert: (r @env1:__getitem__: 3) equals: 1
%

category: 'Grail-Tests-StarUnpack'
method: StarUnpackIteratorTestCase
testIterInList
	"``[*iter([4,5,6]), 7]``."

	| r |
	r := self loadFixture @env1:iter_in_list.
	self assert: r @env0:size equals: 4.
	self assert: (r @env1:__getitem__: 0) equals: 4.
	self assert: (r @env1:__getitem__: 3) equals: 7
%

category: 'Grail-Tests-StarUnpack'
method: StarUnpackIteratorTestCase
testDictKeysInCall
	"``f(*d.keys())`` — dict keys splatted into call args.  Grail's
	dict isn't insertion-ordered, so assert membership, not position."

	| r |
	r := self loadFixture @env1:dict_keys_in_call.
	self assert: r @env0:size equals: 2.
	self assert: (r @env1:__contains__: 'a').
	self assert: (r @env1:__contains__: 'b')
%

category: 'Grail-Tests-StarUnpack'
method: StarUnpackIteratorTestCase
testGeneratorInList
	"``[*gen(), 3]`` — a generator splatted into a list literal."

	| r |
	r := self loadFixture @env1:generator_in_list.
	self assert: r @env0:size equals: 3.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) equals: 2.
	self assert: (r @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests-StarUnpack'
method: StarUnpackIteratorTestCase
testListStillWorks
	"The existing list/tuple splat fast path is unaffected."

	| r |
	r := self loadFixture @env1:list_still_works.
	self assert: r @env0:size equals: 4.
	self assert: (r @env1:__getitem__: 0) equals: 0.
	self assert: (r @env1:__getitem__: 1) equals: 1.
	self assert: (r @env1:__getitem__: 2) equals: 2.
	self assert: (r @env1:__getitem__: 3) equals: 3
%
