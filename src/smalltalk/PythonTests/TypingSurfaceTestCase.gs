! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypingSurfaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypingSurfaceTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypingSurfaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypingSurfaceTestCase
!
! Grail answered ``import typing'' with a hand-written stub: 975 lines, 104
! names, of which 83 of CPython 3.14's 105 PUBLIC ones.  CPython's own file is
! 3858 lines and 210 names.  The gap was the top-ranked blocker in the package
! census (docs/Package_Census.md): seven of the fifty most-downloaded pip
! projects stopped on it, four of them on ``typing._Final'' -- a PRIVATE name,
! which is why "the public API" was never a sufficient target.
!
! Grail now ships CPython 3.14.6's typing.py UNMODIFIED, over a pure-Python
! stand-in for the ``_typing'' C accelerator (src/python/stdlib/_typing.py).
! That module is thin on purpose: the C types are not self-contained -- every
! decision that needs to know what a type IS calls back out to a module-level
! function in typing.py -- so the accelerator's real job is to hold attributes
! and route six calls, and re-deriving the rules would only mean disagreeing
! with the file next to it.
!
! Vendoring the real file rather than growing the stub is the same bet
! argparse took in PR #749, and it paid the same way: it delivered the whole
! surface at once AND exposed genuine Grail defects instead of hiding them
! behind a subset.  Five, each with a minimal repro in docs/Issues.md:
!
!   * a module-level ``__getattr__'' (PEP 562) was never consulted;
!   * ``__call__ = some_function'' in a class body did not make instances
!     callable -- an uncatchable MessageNotUnderstood, not a TypeError;
!   * ``X | Y'' refused typing's own objects as operands, so ``T | None''
!     bounced into ``Union[...]'' and back forever;
!   * ``types.UnionType'' was a stub class, so ``isinstance(int | str,
!     types.UnionType)'' was False for a real union;
!   * ``annotationlib'' had no ``type_repr'', so an alias could be built and
!     inspected but not printed, and ``ForwardRef.evaluate'' raised
!     NotImplementedError, which put ``get_type_hints'' on any quoted
!     annotation out of reach.
!
! The fixture is self-running (docs/Testing_Guide.md): all 28 checks answer
! True under CPython 3.14.6 too, so the agreement is machine-checked rather
! than asserted.
!
! Drives tests/python/typing_surface.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypingSurfaceTestCase removeAllMethods.
TypingSurfaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypingSurfaceTestCase
setUp
	"Reload tests/python/typing_surface.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'typing_surface' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/typing_surface.py')
		name: 'typing_surface'.
%

category: 'Grail-Private'
method: TypingSurfaceTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testEveryPublicNameIsPresent
	"Twenty-two of typing.__all__'s 105 names were absent under the stub, AnyStr among them."

	self assert: (self check: #'every_public_name_is_present') equals: true.
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testThePrivateNamesPackagesReachForArePresent
	"``_Final'' is the name the census error message carried; typing_extensions imports seven of these directly."

	self assert: (self check: #'the_private_names_packages_reach_for_are_present') equals: true.
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testAnyStrIsAConstrainedTypeVar
	"Present is not enough -- anyio, h11 and httpcore all read its constraints."

	self assert: (self check: #'anystr_is_a_constrained_typevar') equals: true.
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testTextIsStr
	self assert: (self check: #'text_is_str') equals: true.
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testTheCollectionAliasesCarryTheirOrigins
	"Checking __origin__ and not the name is what tells a real alias from a placeholder."

	self assert: (self check: #'the_collection_aliases_carry_their_origins') equals: true.
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testTheTypeNarrowingFormsArePresent
	self assert: (self check: #'the_type_narrowing_forms_are_present') equals: true.
%

category: 'Grail-Tests - The surface'
method: TypingSurfaceTestCase
testTheHelperFunctionsAreCallable
	self assert: (self check: #'the_helper_functions_are_callable') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testATypeVarCanStandOnEitherSideOfABar
	"``T | None''.  Both directions: the left form reaches __or__, the right only __ror__."

	self assert: (self check: #'a_typevar_can_stand_on_either_side_of_a_bar') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testAGenericAliasCanStandOnEitherSideOfABar
	self assert: (self check: #'a_generic_alias_can_stand_on_either_side_of_a_bar') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testTheSubscriptAndTheOperatorAgree
	"One object, not two.  A Union built by a separate route passes every isinstance check and fails this."

	self assert: (self check: #'the_subscript_and_the_operator_agree') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testOptionalIsAUnionWithNone
	self assert: (self check: #'optional_is_a_union_with_none') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testAUnionOfOneCollapses
	self assert: (self check: #'a_union_of_one_collapses') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testANestedUnionIsFlattened
	self assert: (self check: #'a_nested_union_is_flattened') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testAUnionIsATypesUnionType
	"types.UnionType was a stub class, so this answered False for a real union -- the one thing the name is used for."

	self assert: (self check: #'a_union_is_a_types_uniontype') equals: true.
%

category: 'Grail-Tests - Unions'
method: TypingSurfaceTestCase
testAUnionOfNoTypesIsRefused
	"Guard rail: the constructor still says no."

	self assert: (self check: #'a_union_of_no_types_is_refused') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testAGenericClassParameterises
	self assert: (self check: #'a_generic_class_parameterises') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testARuntimeCheckableProtocolChecksAtRuntime
	self assert: (self check: #'a_runtime_checkable_protocol_checks_at_runtime') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testANamedTupleIsATuple
	self assert: (self check: #'a_namedtuple_is_a_tuple') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testATypedDictReportsItself
	self assert: (self check: #'a_typeddict_reports_itself') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testANewTypeIsCallableAndIsTheIdentity
	"``__call__ = _idfunc'' -- a dunder ASSIGNED in a class body.  Grail found no __call__ among the class's own methods and died on an uncatchable MessageNotUnderstood."

	self assert: (self check: #'a_newtype_is_callable_and_is_the_identity') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testGetTypeHintsResolvesAStringAnnotation
	"ForwardRef.evaluate raised NotImplementedError, so get_type_hints on ANY quoted annotation was unreachable."

	self assert: (self check: #'get_type_hints_resolves_a_string_annotation') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testGetTypeHintsResolvesAForwardReferenceToALaterClass
	self assert: (self check: #'get_type_hints_resolves_a_forward_reference_to_a_later_class') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testAForwardRefDeclaresItsSlots
	"typing_extensions line 161 reads the slot NAMES as a version-detection API."

	self assert: (self check: #'a_forwardref_declares_its_slots') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testAForwardRefReportsItsArgument
	self assert: (self check: #'a_forwardref_reports_its_argument') equals: true.
%

category: 'Grail-Tests - Machinery'
method: TypingSurfaceTestCase
testAGenericAliasReprsAsItself
	"Needs annotationlib.type_repr.  Without it get_args worked and repr raised."

	self assert: (self check: #'a_generic_alias_reprs_as_itself') equals: true.
%

category: 'Grail-Tests - PEP 562'
method: TypingSurfaceTestCase
testTheSoftDeprecatedNamesResolve
	"Five names typing serves from a module-level __getattr__.  The stub typing HAD them, so vendoring without PEP 562 would have regressed."

	self assert: (self check: #'the_soft_deprecated_names_resolve') equals: true.
%

category: 'Grail-Tests - PEP 562'
method: TypingSurfaceTestCase
testAModuleGetattrDoesNotShadowARealName
	"The hook is consulted only after the ordinary lookup fails."

	self assert: (self check: #'a_module_getattr_does_not_shadow_a_real_name') equals: true.
%

category: 'Grail-Tests - PEP 562'
method: TypingSurfaceTestCase
testAnUnknownNameStillRaisesAttributeError
	"And the message names the module -- it read ``module '?' ...'' for every module before."

	self assert: (self check: #'an_unknown_name_still_raises_attributeerror') equals: true.
%
