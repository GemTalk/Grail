! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OpenCodecsAndDescriptorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OpenCodecsAndDescriptorsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OpenCodecsAndDescriptorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OpenCodecsAndDescriptorsTestCase - open()'s encoding, errors, bytes-path and descriptor arguments
! ===============================================================================
!   * codecs        -- any registered encoding and errors handler in text
!                      mode, through _pyio's TextIOWrapper; ascii is ascii.
!   * bytes path    -- a filesystem name, not its repr.
!   * descriptors   -- open(f.fileno(), closefd=False) shares f's file.
!
! tests/python/open_codecs_and_descriptors.py holds the 5 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OpenCodecsAndDescriptorsTestCase removeAllMethods.
OpenCodecsAndDescriptorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OpenCodecsAndDescriptorsTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/open_codecs_and_descriptors.py'
		name: 'open_codecs_and_descriptors'
%

category: 'Grail-Helpers'
method: OpenCodecsAndDescriptorsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OpenCodecsAndDescriptorsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - open'
method: OpenCodecsAndDescriptorsTestCase
testTextModeEncodesThroughTheCodec

	self assertAll: #('text_mode_encodes_through_the_codec'
		'a_codec_text_file_reports_mode_and_encoding')
%

category: 'Grail-Tests - open'
method: OpenCodecsAndDescriptorsTestCase
testABytesPathIsAFilesystemName

	self assertAll: #('a_bytes_path_is_a_filesystem_name')
%

category: 'Grail-Tests - open'
method: OpenCodecsAndDescriptorsTestCase
testOpenFdSharesTheFile

	self assertAll: #('open_fd_shares_the_file'
		'open_refuses_what_cpython_refuses')
%

category: 'Grail-Tests - open'
method: OpenCodecsAndDescriptorsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 5 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 5
%
