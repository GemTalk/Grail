! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InspectGetmembersTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InspectGetmembersTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InspectGetmembersTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InspectGetmembersTestCase
!
! inspect.getmembers -- the two things it does beyond walking dir().
!
! Grail's version was dir() + getattr(), dropping anything getattr refused.
! CPython's does two more things, and both exist for attributes dir() alone
! cannot reach:
!
!   * a name dir() offers but getattr() REFUSES is looked up in the MRO's
!     __dict__s rather than dropped.  A descriptor may decline to produce a
!     value while still being a real member -- CPython's own comment is "some
!     descriptors don't return meaningful values and are only implemented for
!     the sake of __dir__".
!
!   * every DynamicClassAttribute in a base's __dict__ is ADDED to the candidate
!     names.  Such a descriptor deliberately HIDES itself from the class (it
!     routes class access to the metaclass), so dir() never offers it.
!
! HOW FAR THIS GOES.  test_enum's test_inspect_getmembers wants ``name'' and
! ``value'' reported for an enum class, and this does NOT close it.  In CPython
! those two are DynamicClassAttributes in Enum.__dict__; in Grail they are
! compiled Smalltalk accessors, so Enum.__dict__['name'] is an UnboundMethod and
! the sweep finds nothing to add.  Closing that means giving Enum real descriptor
! instances -- a change to enum's attribute machinery, not to inspect.  The
! machinery here is right and demonstrably works for a descriptor that IS one,
! which is what the fixture pins.
!
! The fixture is self-running (docs/Testing_Guide.md): all six checks answer True
! under CPython 3.14 as well as under Grail, so the agreement is machine-checked
! by scripts/check_python_fixtures.sh rather than by hand.
!
! Drives tests/python/inspect_getmembers.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InspectGetmembersTestCase removeAllMethods.
InspectGetmembersTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectGetmembersTestCase
setUp
	"Reload tests/python/inspect_getmembers.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_getmembers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_getmembers.py')
		name: 'inspect_getmembers'.
%

category: 'Grail-Private'
method: InspectGetmembersTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - DynamicClassAttribute sweep'
method: InspectGetmembersTestCase
testADynamicClassAttributeIsReported
	"It hides from dir(), so only the sweep over the bases' __dict__ finds it."

	self assert: (self check: #'dynamic_class_attribute_is_reported') equals: true.
%

category: 'Grail-Tests - DynamicClassAttribute sweep'
method: InspectGetmembersTestCase
testTheDescriptorItselfIsReported
	"Not the value it would compute: getattr on the CLASS produces none, so the
	__dict__ entry is what is reported.  This is the identity test_enum's
	version relies on (``result['name'] == Enum.__dict__['name']'')."

	self assert: (self check: #'the_descriptor_itself_is_reported') equals: true.
%

category: 'Grail-Tests - The MRO fallback'
method: InspectGetmembersTestCase
testANameNothingBacksIsSkipped
	"A __dir__ offering a name with no attribute and no __dict__ entry is
	discarded rather than raising -- the ``else'' of CPython's for/else."

	self assert: (self check: #'a_name_nothing_backs_is_skipped') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: InspectGetmembersTestCase
testOrdinaryMembersAndPredicateAreUnaffected
	"Guard rail: the common path still answers what it always did, and a
	predicate still filters."

	self assert: (self check: #'ordinary_members_are_unaffected') equals: true.
	self assert: (self check: #'predicate_still_filters') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: InspectGetmembersTestCase
testGetmroAnswersTheMro
	"inspect.getmro is CPython's public spelling of cls.__mro__, and getmembers
	needs it for the fallback walk."

	self assert: (self check: #'getmro_answers_the_mro') equals: true.
%
