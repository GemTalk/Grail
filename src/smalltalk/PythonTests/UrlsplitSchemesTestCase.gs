! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UrlsplitSchemesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UrlsplitSchemesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UrlsplitSchemesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UrlsplitSchemesTestCase - urlsplit reads a scheme with no authority
! ===============================================================================
! urlsplit split on "://" alone, so every URL whose scheme carries no authority
! lost its scheme and answered the whole string as a PATH -- "mailto:me@x",
! "file:/tmp/x", "data:text/plain,hi", "urn:isbn:1".  A scheme is everything
! before the first colon when that is a letter followed by letters, digits,
! "+", "-" or "."; the authority is still only read after "//".
!
! urlunsplit had the matching defect: it wrote "scheme://" unconditionally,
! turning "mailto:me@x" into "mailto://me@x".  It now writes "//" only where
! there is an authority, or where the scheme always carries one (uses_netloc,
! the list Werkzeug appends to at import time).
!
! Found through pathlib: url2pathname builds "file:" + url and splits it.
!
! tests/python/urlsplit_schemes.py holds the 14 checks, run under real CPython 3.14 by
! scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UrlsplitSchemesTestCase removeAllMethods.
UrlsplitSchemesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: UrlsplitSchemesTestCase
setUp

	importlib @env1:modules removeKey: #'urlsplit_schemes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/urlsplit_schemes.py')
		name: 'urlsplit_schemes'
%

category: 'Grail-Helpers'
method: UrlsplitSchemesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: UrlsplitSchemesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - urlsplit_schemes'
method: UrlsplitSchemesTestCase
testASchemeCarryingNoAuthorityIsStillRead

	self assertAll: #('a_scheme_with_no_authority_is_still_a_scheme'
		'mailto_data_and_urn_keep_their_schemes'
		'a_scheme_is_lowercased_and_the_authority_is_not'
		'a_scheme_cannot_start_with_a_digit'
		'a_scheme_may_hold_plus_minus_and_dot'
		'a_path_with_a_colon_in_it_is_not_a_scheme'
		'the_default_scheme_argument_still_applies')
%

category: 'Grail-Tests - urlsplit_schemes'
method: UrlsplitSchemesTestCase
testAnAuthorityIsReadOnlyAfterADoubleSlash

	self assertAll: #('an_authority_needs_the_double_slash'
		'the_query_and_fragment_are_taken_off_after_the_authority')
%

category: 'Grail-Tests - urlsplit_schemes'
method: UrlsplitSchemesTestCase
testUrlunsplitWritesAnAuthorityOnlyWhereThereIsOne

	self assertAll: #('urlunsplit_writes_an_authority_only_where_there_is_one'
		'urlunsplit_gives_a_netloc_scheme_its_empty_authority'
		'urlunsplit_keeps_a_path_that_looks_like_an_authority_apart')
%

category: 'Grail-Tests - urlsplit_schemes'
method: UrlsplitSchemesTestCase
testAUrlSurvivesTheRoundTrip

	self assertAll: #('every_url_survives_a_round_trip'
		'a_scheme_relative_file_url_gains_its_empty_authority')
%

category: 'Grail-Tests - urlsplit_schemes'
method: UrlsplitSchemesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14
%
