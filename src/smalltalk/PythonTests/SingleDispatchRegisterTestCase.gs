! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SingleDispatchRegisterTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SingleDispatchRegisterTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SingleDispatchRegisterTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SingleDispatchRegisterTestCase — functools.singledispatch wrapper metadata and
! the annotation form of register().
!
! Grail keeps annotations as PEP 563 SOURCE STRINGS.  That is what makes most of
! this both possible and delicate: register() must resolve a string to a class,
! and then tell apart three cases that all look like "a string I could not
! resolve":
!
!   * SUBSCRIPTED (``list[int]'', ``typing.List[float] | bytes'') -- never a
!     class, so reject.  Only the source string reveals this; the runtime value
!     is useless because Grail's __class_getitem__ is an identity stub and
!     ``list[int] is list''.
!   * A BARE UNRESOLVED NAME -- an unresolved forward reference, so reject with a
!     different message.
!   * A UNION OF PLAIN CLASSES (``typing.Union[int, str]'') -- VALID CPython that
!     Grail cannot dispatch on yet, so it must NOT raise.
!
! That last case is why the rejection cannot simply test for a bracket: a union
! has brackets too, and rejecting it would turn working user code into a hard
! TypeError.  Falling through to the default keeps the failure soft.
!
! Also pinned: the wrapper now carries the wrapped function's metadata (CPython's
! singledispatch ends with update_wrapper), and the inference reads the FIRST
! parameter's annotation.  It used to keep the LAST one -- the loop overwrote its
! candidate on the belief that annotation dicts were hash-ordered.  They are
! insertion-ordered, so ``def _(arg: str, arg2: undefined = None)'' inferred from
! arg2, whose unresolvable annotation became the registry key and the
! registration silently never matched.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SingleDispatchRegisterTestCase removeAllMethods.
SingleDispatchRegisterTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
loadFixture
	"Load tests/python/singledispatch_register.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'singledispatch_register' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/singledispatch_register.py')
		name: 'singledispatch_register'
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testWrapperCarriesFunctionMetadata
	"CPython's singledispatch ends with update_wrapper(wrapper, func); without
	it g.__name__ / g.__doc__ raised AttributeError on the wrapper."

	self assert: self loadFixture @env1:wrapper_carries_function_metadata
		equals: true
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testArityErrorNamesTheFunction
	"``f requires at least 1 positional argument'' -- the FUNCTION's name, not
	a generic label.  Depends on the update_wrapper copy above."

	| r |
	r := (self loadFixture @env1:arity_error_names_the_function) @env0:asString.
	self assert: r equals: 'ok'
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testFirstParameterAnnotationWins
	"The inference kept the LAST annotated parameter, not the first, so an
	unresolvable annotation on a LATER parameter silently became the registry
	key and the registration never matched."

	self assert: self loadFixture @env1:first_parameter_annotation_wins
		equals: true
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testUnresolvedForwardReferenceRaises
	"A bare name resolving to nothing is a TypeError, not a silent
	registration under an unusable string key."

	| r |
	r := (self loadFixture @env1:unresolved_forward_reference_raises) @env0:asString.
	self assert: r equals: 'ok'
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testSubscriptedAnnotationRaises
	"A subscripted generic is never a class.  The fixture answers the LIST of
	annotations that behaved wrongly, so a failure names them."

	| r |
	r := (self loadFixture @env1:subscripted_annotation_raises) @env0:asString.
	self assert: r equals: 'ok'
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testUnionOfPlainClassesDispatches
	"THE guard that makes the rejection above safe.  A union of plain classes
	is valid CPython; a bare ``contains a bracket'' rejection would break it,
	since typing.Union[int, str] has brackets too.

	This used to assert only that registering did not RAISE: the union was
	left unregistered and every call fell through to the default, the softer
	of two wrong answers while dispatch was missing.  CPython registers the
	implementation once per member, and so does Grail, so a member now
	dispatches and a non-member still does not."

	self assert: self loadFixture @env1:union_of_plain_classes_dispatches
		asArray equals: #( 'union' 'union' 'default' )
%

category: 'Grail-Tests-SingleDispatchRegister'
method: SingleDispatchRegisterTestCase
testPlainClassAnnotationStillRegisters
	"Guard: the ordinary annotation form keeps working."

	self assert: self loadFixture @env1:plain_class_annotation_still_registers
		equals: true
%
