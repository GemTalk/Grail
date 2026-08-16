! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InspectSignatureObjectsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InspectSignatureObjectsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InspectSignatureObjectsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InspectSignatureObjectsTestCase
!
! inspect.Signature / inspect.Parameter as VALUES -- built by hand, compared and
! rendered.  Three faults, all in how the objects are CONSTRUCTED rather than in
! what introspection produces:
!
! 1. ``Signature([Parameter(...), ...])'' -- the spelling every caller writing an
!    EXPECTED signature uses -- stashed the list as pre-rendered TEXT, because
!    Grail's first positional argument was ``text'' where CPython's is
!    ``parameters''.  __str__ handed the list back unrendered and __repr__ then
!    concatenated a string with it:
!
!        TypeError: unsupported operand type(s) for +:
!                   'Unicode7' and 'OrderedCollection'
!
!    so a hand-built signature could not even be PRINTED.  The text form is kept,
!    now keyword-only, which is how the one internal caller passes it.
!
! 2. ``Parameter('module', KEYWORD_ONLY, default=None)'' meant "no default".
!    None was the marker for absent, so a parameter whose default genuinely IS
!    None rendered as a bare ``module'' -- indistinguishable from one with none.
!    CPython uses a distinct ``empty'' sentinel, and now so does this.
!
! 3. Neither class defined __eq__, so two of them compared by IDENTITY and an
!    expected signature could never equal an introspected one.  _DefaultText
!    gained the other half of that: an introspected default is the SOURCE TEXT
!    the def wrote, an expected one is a value, and they compare by rendered
!    form -- the only bridge available, since re-evaluating the text is what
!    _DefaultText exists to avoid.
!
! test_enum's test_inspect_signatures moves ERROR -> FAIL on this: it builds its
! expectation exactly this way, so it died in the comparison before ever
! reaching the assertion.  It still fails -- signature(Enum) answers () rather
! than the functional API's parameters, and enum.FlagBoundary does not exist --
! but now on the assertion, which is what the difference actually is.
!
! The fixture is self-running (docs/Testing_Guide.md): all seven checks answer
! True under CPython 3.14 too, so the agreement is machine-checked.
!
! Drives tests/python/inspect_signature_objects.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InspectSignatureObjectsTestCase removeAllMethods.
InspectSignatureObjectsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectSignatureObjectsTestCase
setUp
	"Reload tests/python/inspect_signature_objects.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_signature_objects' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_signature_objects.py')
		name: 'inspect_signature_objects'.
%

category: 'Grail-Private'
method: InspectSignatureObjectsTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - Constructing'
method: InspectSignatureObjectsTestCase
testAHandBuiltSignatureRenders
	"The crash: Signature(list) stored the list where the rendered TEXT goes,
	and repr then added a string to a list."

	self assert: (self check: #'a_hand_built_signature_renders') equals: true.
%

category: 'Grail-Tests - Constructing'
method: InspectSignatureObjectsTestCase
testADefaultOfNoneIsNotTheSameAsNoDefault
	"Both spellings are legal and they mean different things.  None cannot be
	the marker for absent when it is also a perfectly good default."

	self assert: (self check: #'a_default_of_none_is_not_the_same_as_no_default') equals: true.
%

category: 'Grail-Tests - Constructing'
method: InspectSignatureObjectsTestCase
testTheEmptyMarkerIsShared
	"Parameter.empty and Signature.empty are one object, as upstream."

	self assert: (self check: #'the_empty_marker_is_shared') equals: true.
%

category: 'Grail-Tests - Comparing'
method: InspectSignatureObjectsTestCase
testSignaturesCompareByValue
	self assert: (self check: #'signatures_compare_by_value') equals: true.
%

category: 'Grail-Tests - Comparing'
method: InspectSignatureObjectsTestCase
testParametersCompareByValue
	self assert: (self check: #'parameters_compare_by_value') equals: true.
%

category: 'Grail-Tests - Comparing'
method: InspectSignatureObjectsTestCase
testAnIntrospectedSignatureEqualsTheSameOneBuiltByHand
	"The whole point, and what test_inspect_signatures does.  Bridges Grail's
	source-text defaults to the values an expected signature is written with."

	self assert: (self check: #'an_introspected_signature_equals_the_same_one_built_by_hand')
		equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: InspectSignatureObjectsTestCase
testAnIntrospectedSignatureStillRenders
	"Guard rail: the introspection path is untouched by all of this."

	self assert: (self check: #'an_introspected_signature_still_renders') equals: true.
%
