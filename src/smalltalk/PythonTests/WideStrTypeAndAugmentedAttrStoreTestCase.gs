! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WideStrTypeAndAugmentedAttrStoreTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WideStrTypeAndAugmentedAttrStoreTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WideStrTypeAndAugmentedAttrStoreTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WideStrTypeAndAugmentedAttrStoreTestCase - the gaps behind test_codecencodings_kr
! ===============================================================================
!   * type          -- ``type(s) is str'' for a wide (Unicode16/32) or
!                      lone-surrogate str (CharacterCollection >> __class__,
!                      PyStrSurrogate >> __class__); a str subclass is itself.
!   * augmented     -- ``obj.x op= v'' stores through __setattr__:_:, so a
!                      nested function's attribute, a __setattr__ override and
!                      a @property setter all see it (AugAssignAst).
!   * handler       -- a multibyte codec's error handler must answer
!                      (str or bytes, int) (_cjk.py).
!   * errors        -- a multibyte codec object's ``errors'' refuses a delete
!                      and a non-str (_multibytecodec.py).
!
! tests/python/wide_str_type_and_augmented_attr_store.py holds the 4 checks,
! run under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WideStrTypeAndAugmentedAttrStoreTestCase removeAllMethods.
WideStrTypeAndAugmentedAttrStoreTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: WideStrTypeAndAugmentedAttrStoreTestCase
setUp

	importlib @env1:modules removeKey: #'wide_str_type_and_augmented_attr_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/wide_str_type_and_augmented_attr_store.py')
		name: 'wide_str_type_and_augmented_attr_store'
%

category: 'Grail-Helpers'
method: WideStrTypeAndAugmentedAttrStoreTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: WideStrTypeAndAugmentedAttrStoreTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - type'
method: WideStrTypeAndAugmentedAttrStoreTestCase
testEveryStrsTypeIsStr

	self assertAll: #('every_str_s_type_is_str_and_a_subclass_s_is_itself')
%

category: 'Grail-Tests - augmented'
method: WideStrTypeAndAugmentedAttrStoreTestCase
testAugmentedAttributeStoreGoesThroughSetattr

	self assertAll: #('an_augmented_attribute_store_goes_through_setattr')
%

category: 'Grail-Tests - codecs'
method: WideStrTypeAndAugmentedAttrStoreTestCase
testMultibyteCodecHandlerAndErrors

	self assertAll: #('a_multibyte_error_handler_must_answer_str_or_bytes_and_int'
		'a_multibyte_codec_s_errors_cannot_be_deleted')
%

category: 'Grail-Tests - codecs'
method: WideStrTypeAndAugmentedAttrStoreTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 4 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 4
%
