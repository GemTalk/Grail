Class {
	#name : 'TypingSurfaceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypingSurfaceTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
TypingSurfaceTestCase >> setUp [
	"Reload tests/python/typing_surface.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'typing_surface' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/typing_surface.py')
		name: 'typing_surface'.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testAForwardRefDeclaresItsSlots [
	"typing_extensions line 161 reads the slot NAMES as a version-detection API."

	self assert: (self check: #'a_forwardref_declares_its_slots') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testAForwardRefReportsItsArgument [
	self assert: (self check: #'a_forwardref_reports_its_argument') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testAGenericAliasCanStandOnEitherSideOfABar [
	self assert: (self check: #'a_generic_alias_can_stand_on_either_side_of_a_bar') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testAGenericAliasReprsAsItself [
	"Needs annotationlib.type_repr.  Without it get_args worked and repr raised."

	self assert: (self check: #'a_generic_alias_reprs_as_itself') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testAGenericClassParameterises [
	self assert: (self check: #'a_generic_class_parameterises') equals: true.

]

{ #category : 'Grail-Tests - PEP 562' }
TypingSurfaceTestCase >> testAModuleGetattrDoesNotShadowARealName [
	"The hook is consulted only after the ordinary lookup fails."

	self assert: (self check: #'a_module_getattr_does_not_shadow_a_real_name') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testANamedTupleIsATuple [
	self assert: (self check: #'a_namedtuple_is_a_tuple') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testANestedUnionIsFlattened [
	self assert: (self check: #'a_nested_union_is_flattened') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testANewTypeIsCallableAndIsTheIdentity [
	"``__call__ = _idfunc'' -- a dunder ASSIGNED in a class body.  Grail found no __call__ among the class's own methods and died on an uncatchable MessageNotUnderstood."

	self assert: (self check: #'a_newtype_is_callable_and_is_the_identity') equals: true.

]

{ #category : 'Grail-Tests - PEP 562' }
TypingSurfaceTestCase >> testAnUnknownNameStillRaisesAttributeError [
	"And the message names the module -- it read ``module '?' ...'' for every module before."

	self assert: (self check: #'an_unknown_name_still_raises_attributeerror') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testAnyStrIsAConstrainedTypeVar [
	"Present is not enough -- anyio, h11 and httpcore all read its constraints."

	self assert: (self check: #'anystr_is_a_constrained_typevar') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testARuntimeCheckableProtocolChecksAtRuntime [
	self assert: (self check: #'a_runtime_checkable_protocol_checks_at_runtime') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testATypedDictReportsItself [
	self assert: (self check: #'a_typeddict_reports_itself') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testATypeVarCanStandOnEitherSideOfABar [
	"``T | None''.  Both directions: the left form reaches __or__, the right only __ror__."

	self assert: (self check: #'a_typevar_can_stand_on_either_side_of_a_bar') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testAUnionIsATypesUnionType [
	"types.UnionType was a stub class, so this answered False for a real union -- the one thing the name is used for."

	self assert: (self check: #'a_union_is_a_types_uniontype') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testAUnionOfNoTypesIsRefused [
	"Guard rail: the constructor still says no."

	self assert: (self check: #'a_union_of_no_types_is_refused') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testAUnionOfOneCollapses [
	self assert: (self check: #'a_union_of_one_collapses') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testEveryPublicNameIsPresent [
	"Twenty-two of typing.__all__'s 105 names were absent under the stub, AnyStr among them."

	self assert: (self check: #'every_public_name_is_present') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testGetTypeHintsResolvesAForwardReferenceToALaterClass [
	self assert: (self check: #'get_type_hints_resolves_a_forward_reference_to_a_later_class') equals: true.

]

{ #category : 'Grail-Tests - Machinery' }
TypingSurfaceTestCase >> testGetTypeHintsResolvesAStringAnnotation [
	"ForwardRef.evaluate raised NotImplementedError, so get_type_hints on ANY quoted annotation was unreachable."

	self assert: (self check: #'get_type_hints_resolves_a_string_annotation') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testOptionalIsAUnionWithNone [
	self assert: (self check: #'optional_is_a_union_with_none') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testTextIsStr [
	self assert: (self check: #'text_is_str') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testTheCollectionAliasesCarryTheirOrigins [
	"Checking __origin__ and not the name is what tells a real alias from a placeholder."

	self assert: (self check: #'the_collection_aliases_carry_their_origins') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testTheHelperFunctionsAreCallable [
	self assert: (self check: #'the_helper_functions_are_callable') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testThePrivateNamesPackagesReachForArePresent [
	"``_Final'' is the name the census error message carried; typing_extensions imports seven of these directly."

	self assert: (self check: #'the_private_names_packages_reach_for_are_present') equals: true.

]

{ #category : 'Grail-Tests - PEP 562' }
TypingSurfaceTestCase >> testTheSoftDeprecatedNamesResolve [
	"Five names typing serves from a module-level __getattr__.  The stub typing HAD them, so vendoring without PEP 562 would have regressed."

	self assert: (self check: #'the_soft_deprecated_names_resolve') equals: true.

]

{ #category : 'Grail-Tests - Unions' }
TypingSurfaceTestCase >> testTheSubscriptAndTheOperatorAgree [
	"One object, not two.  A Union built by a separate route passes every isinstance check and fails this."

	self assert: (self check: #'the_subscript_and_the_operator_agree') equals: true.

]

{ #category : 'Grail-Tests - The surface' }
TypingSurfaceTestCase >> testTheTypeNarrowingFormsArePresent [
	self assert: (self check: #'the_type_narrowing_forms_are_present') equals: true.

]
