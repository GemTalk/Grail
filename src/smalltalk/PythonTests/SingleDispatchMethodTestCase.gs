! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SingleDispatchMethodTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SingleDispatchMethodTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SingleDispatchMethodTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SingleDispatchMethodTestCase
!
! functools.singledispatchmethod, and the two gaps that had to be closed for it
! to work at all.
!
!  * A class-body decorator naming a SIBLING def.  ``@t.register(int)'' names
!    ``t'', a local of the class body in CPython.  Grail has no class-body
!    namespace, so the name fell through to the module and raised NameError --
!    swallowed by the decorator handler, leaving the decorator silently
!    inapplied.  A class body compiles differently at module scope, inside a
!    function, and inside a method, so all three are exercised: an earlier cut
!    worked at module scope and dropped every registration in the other two.
!
!  * Repeated ``def _'' in one scope.  ``_'' is not a valid Smalltalk
!    identifier and is renamed at parse time; renaming every one to the same
!    name made each definition overwrite the last, so all but the final body
!    was discarded.  That is the standard singledispatch spelling, and with
!    registration now working it would have registered several types against
!    whichever body happened to survive.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SingleDispatchMethodTestCase removeAllMethods.
SingleDispatchMethodTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SingleDispatchMethodTestCase
setUp
	"Reload tests/python/singledispatchmethod.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'singledispatchmethod' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/singledispatchmethod.py')
		name: 'singledispatchmethod'.
%

category: 'Grail-Private'
method: SingleDispatchMethodTestCase
assertDispatches: aSelector
	"The fixture's three-way probe: an int, a str, and a float with no
	registration of its own, which must fall through to the base method."

	self assert: (testModule @env1:perform: aSelector env: 1) asArray
		equals: #( 'int' 'str' 'base' ).
%

! --- Dispatch, in each of the three class-body compilation contexts ---

category: 'Grail-Tests - Dispatch'
method: SingleDispatchMethodTestCase
testExplicitTypeRegistrationAtModuleScope
	"``@t.register(int)'' on a class defined at module scope."

	self assertDispatches: #module_scope_explicit.
%

category: 'Grail-Tests - Dispatch'
method: SingleDispatchMethodTestCase
testAnnotationRegistrationAtModuleScope
	"``@t.register'' with the type taken from the first parameter's
	annotation.  The implementation reaches register() as an UnboundMethod, so
	this is also the test that that handle reports __annotations__."

	self assertDispatches: #module_scope_annotation.
%

category: 'Grail-Tests - Dispatch'
method: SingleDispatchMethodTestCase
testRegistrationInsideAFunction
	"Same class body, compiled inside a plain function."

	self assertDispatches: #in_function.
%

category: 'Grail-Tests - Dispatch'
method: SingleDispatchMethodTestCase
testRegistrationInsideAMethod
	"Same class body, compiled inside a method -- a third emission path, and
	the one CPython's own test suite uses (each test builds its class in the
	test method).  Resolving the sibling name only in the earlier two paths
	left this one dispatching to the base method with no error."

	self assertDispatches: #in_method.
%

! --- Over a @classmethod / @staticmethod ---
! Grail consumes those inner decorators at PARSE time by re-classing the def
! onto the metaclass, so the outer decorator's base has to be a class-side
! handle; an instance-side one names nothing and the decorator dies on its
! first call.  Neither kind binds an instance, so both access paths deliver the
! identical argument array -- which is what lets one call shape serve all three
! method kinds.

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testStaticMethodDispatchViaTheClass

	self assertDispatches: #static_via_class.
%

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testStaticMethodDispatchViaAnInstance
	"Nothing is prepended for a staticmethod reached through an instance, so
	it sees exactly the arguments the class-side call does."

	self assertDispatches: #static_via_instance.
%

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testStaticMethodAnnotationRegistration
	"``@t.register'' over a @staticmethod: the annotation lives on a
	class-side def, which the class's annotation table used to omit."

	self assertDispatches: #static_annotation_registration.
%

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testClassMethodDispatchViaTheClass

	self assertDispatches: #classmethod_via_class.
%

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testClassMethodDispatchViaAnInstance
	"``cls'' is supplied by the class-side handle either way, so the dispatch
	argument is the first one the caller passes."

	self assertDispatches: #classmethod_via_instance.
%

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testClassMethodOnASlottedClass
	"CPython's test_classmethod_slotted_class shape: the annotation form over
	a @classmethod, reached both ways, on a class with __slots__."

	self assert: testModule @env1:classmethod_annotation_on_slots asArray
		equals: #( 2 2 ).
%

category: 'Grail-Tests - Class-side methods'
method: SingleDispatchMethodTestCase
testClassSideDescriptorReprIsQualified

	self assert: testModule @env1:classmethod_descriptor_repr
		equals: '<single dispatch method descriptor ClassScope.t>'.
%

! --- Metadata and errors ---

category: 'Grail-Tests - Protocol'
method: SingleDispatchMethodTestCase
testCallWithNoDispatchArgumentRaisesTypeError
	"``A().t()'' -- the receiver does not count towards the one required
	positional argument, and CPython names the FUNCTION in the message."

	self assert: testModule @env1:arity_error asArray
		equals: #( 't requires at least 1 positional argument'
			't requires at least 1 positional argument' ).
%

category: 'Grail-Tests - Protocol'
method: SingleDispatchMethodTestCase
testDescriptorRepr

	self assert: testModule @env1:descriptor_repr
		equals: '<single dispatch method descriptor ModuleScope.t>'.
%

category: 'Grail-Tests - Protocol'
method: SingleDispatchMethodTestCase
testDescriptorReportsTheWrappedMethodName

	self assert: testModule @env1:descriptor_name equals: 't'.
%

! --- Repeated ``def _'' ---

category: 'Grail-Tests - Underscore defs'
method: SingleDispatchMethodTestCase
testRepeatedUnderscoreDefsStayDistinct
	"Two ``def _'' in one class body are two functions.  Collapsed to one
	name, the first was discarded and both captures answered ''second''."

	self assert: testModule @env1:two_underscore_defs_are_distinct asArray
		equals: #( 'first' 'second' ).
%

category: 'Grail-Tests - Underscore defs'
method: SingleDispatchMethodTestCase
testUnderscoreNameReadsTheLastBinding
	"Making the definitions distinct must not change what the NAME means: a
	read of ``_'' is still the most recent binding, as in CPython."

	self assert: testModule @env1:underscore_name_reads_the_last_binding
		equals: 'second'.
%

category: 'Grail-Tests - Underscore defs'
method: SingleDispatchMethodTestCase
testUnderscoreAssignmentRebindsTheName
	"A plain ``_ = ...'' after a ``def _'' rebinds the name.  The def names
	are numbered, so the read has to follow the latest binding of either kind
	rather than staying pinned to the numbered def."

	self assert: testModule @env1:underscore_assignment_rebinds_the_name
		equals: 'assigned'.
%
