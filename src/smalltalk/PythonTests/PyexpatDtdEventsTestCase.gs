! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PyexpatDtdEventsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PyexpatDtdEventsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PyexpatDtdEventsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PyexpatDtdEventsTestCase - what pyexpat.py reports to handlers
! ===============================================================================
!   * pieces        -- character data in expat's pieces: each newline and
!                      each reference its own call, unless buffer_text.
!   * namespaces    -- namespace_prefixes is a third name part; xmlns is
!                      never an attribute under namespace processing.
!   * DTD           -- the internal subset's comments, PIs, entities and
!                      notations reach their handlers; internal entities
!                      expand as markup.
!   * external      -- external entities and the external subset go to
!                      ExternalEntityRefHandler, and the parser
!                      ExternalEntityParserCreate answers reads them.
!   * undefined     -- skipped only behind an external subset.
!
! tests/python/pyexpat_dtd_events.py holds the 8 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PyexpatDtdEventsTestCase removeAllMethods.
PyexpatDtdEventsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PyexpatDtdEventsTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/pyexpat_dtd_events.py'
		name: 'pyexpat_dtd_events'
%

category: 'Grail-Helpers'
method: PyexpatDtdEventsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: PyexpatDtdEventsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - handlers'
method: PyexpatDtdEventsTestCase
testCharacterDataComesInExpatsPieces

	self assertAll: #('character_data_comes_in_expats_pieces')
%

category: 'Grail-Tests - handlers'
method: PyexpatDtdEventsTestCase
testNamespacePrefixesIsAThirdNamePart

	self assertAll: #('namespace_prefixes_is_a_third_name_part')
%

category: 'Grail-Tests - handlers'
method: PyexpatDtdEventsTestCase
testTheInternalSubsetIsReported

	self assertAll: #('the_internal_subset_is_reported'
		'internal_entities_expand_as_markup')
%

category: 'Grail-Tests - handlers'
method: PyexpatDtdEventsTestCase
testExternalEntitiesGoToTheHandler

	self assertAll: #('an_external_entity_goes_to_the_handler'
		'the_external_subset_is_asked_for_with_param_parsing')
%

category: 'Grail-Tests - handlers'
method: PyexpatDtdEventsTestCase
testEntityReferencesThatAreErrors

	self assertAll: #('an_undefined_entity_is_an_error_without_an_external_subset'
		'entity_references_that_cannot_be_used')
%

category: 'Grail-Tests - handlers'
method: PyexpatDtdEventsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8
%
