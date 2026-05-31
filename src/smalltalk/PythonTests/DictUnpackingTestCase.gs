! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictUnpackingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictUnpackingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DictUnpackingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DictUnpackingTestCase — ``{**mapping}`` dict-literal unpacking.  The parser
! marks an unpack element with a None key (the mapping in `values`); DictAst
! codegen merges it via `update:`.  Before the fix the nil key was sent
! `printSmalltalkWithParenthesisOn:` and codegen crashed.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DictUnpackingTestCase removeAllMethods.
DictUnpackingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
loadFixture
	"Load tests/python/dict_unpacking.py fresh."

	importlib @env1:modules @env0:removeKey: #'dict_unpacking' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/dict_unpacking.py')
		name: 'dict_unpacking'
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testBasicUnpack
	"``{**a}`` copies all of a's items."

	| d |
	d := self loadFixture @env1:basic_unpack.
	self assert: (d @env1:__getitem__: 'x') equals: 1.
	self assert: (d @env1:__getitem__: 'y') equals: 2.
	self assert: d @env0:size equals: 2
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testMergeTwo
	"``{**a, **b}`` merges both mappings."

	| d |
	d := self loadFixture @env1:merge_two.
	self assert: (d @env1:__getitem__: 'x') equals: 1.
	self assert: (d @env1:__getitem__: 'y') equals: 2.
	self assert: d @env0:size equals: 2
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testUnpackBetweenLiterals
	"``{'before': 0, **a, 'after': 9}`` interleaves literal and
	unpacked entries."

	| d |
	d := self loadFixture @env1:unpack_between_literals.
	self assert: (d @env1:__getitem__: 'before') equals: 0.
	self assert: (d @env1:__getitem__: 'mid') equals: 5.
	self assert: (d @env1:__getitem__: 'after') equals: 9.
	self assert: d @env0:size equals: 3
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testLaterKeyOverwrites
	"A literal key after an unpack overwrites the unpacked value
	(CPython left-to-right evaluation)."

	| d |
	d := self loadFixture @env1:later_key_overwrites.
	self assert: (d @env1:__getitem__: 'x') equals: 99.
	self assert: d @env0:size equals: 1
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testUnpackEmpty
	"Unpacking an empty mapping is a no-op."

	| d |
	d := self loadFixture @env1:unpack_empty.
	self assert: (d @env1:__getitem__: 'keep') equals: 1.
	self assert: d @env0:size equals: 1
%
