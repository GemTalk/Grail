! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PyexpatDocumentEncodingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PyexpatDocumentEncodingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PyexpatDocumentEncodingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PyexpatDocumentEncodingTestCase - how pyexpat.py chooses a document's encoding
! ===============================================================================
!   * declared      -- ``encoding='' in the XML declaration is honoured, as
!                      test_pulldom's Latin-1 test.xml needs.
!   * incremental   -- one incremental decoder, so a character split across
!                      Parse calls decodes.
!   * detected      -- UTF-16 with or without a byte-order mark; a
!                      declaration the bytes contradict is ``incorrect''.
!   * undecodable   -- reported at the bad byte, after the events before it;
!                      a truncated sequence is a partial character.
!   * supported     -- only single-byte encodings beyond expat's own.
!
! tests/python/pyexpat_document_encoding.py holds the 7 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PyexpatDocumentEncodingTestCase removeAllMethods.
PyexpatDocumentEncodingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PyexpatDocumentEncodingTestCase
setUp

	importlib @env1:modules removeKey: #'pyexpat_document_encoding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pyexpat_document_encoding.py')
		name: 'pyexpat_document_encoding'
%

category: 'Grail-Helpers'
method: PyexpatDocumentEncodingTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: PyexpatDocumentEncodingTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - encoding'
method: PyexpatDocumentEncodingTestCase
testTheDeclaredEncodingIsUsed

	self assertAll: #('the_declared_encoding_is_used'
		'pulldom_parses_a_latin_1_document')
%

category: 'Grail-Tests - encoding'
method: PyexpatDocumentEncodingTestCase
testACharacterSplitAcrossChunksDecodes

	self assertAll: #('a_character_split_across_chunks_decodes')
%

category: 'Grail-Tests - encoding'
method: PyexpatDocumentEncodingTestCase
testUtf16DetectionAndIncorrectDeclarations

	self assertAll: #('utf_16_is_detected_with_or_without_a_byte_order_mark'
		'a_declaration_the_bytes_contradict_is_incorrect')
%

category: 'Grail-Tests - encoding'
method: PyexpatDocumentEncodingTestCase
testUndecodableBytesAndUnsupportedEncodings

	self assertAll: #('an_undecodable_byte_is_reported_where_it_is'
		'only_single_byte_encodings_are_supported')
%

category: 'Grail-Tests - encoding'
method: PyexpatDocumentEncodingTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7
%
