! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassPrivateNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassPrivateNameTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassPrivateNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassPrivateNameTestCase
!
! PRIVATE-NAME MANGLING for class-body BINDINGS.  An identifier written in a
! class body with two or more leading underscores and not two trailing ones is
! rewritten to _<Class><name>.  Grail mangled every READ of such a name --
! ``self.__x'' (AttributeAst) and ``def __helper'' (FunctionDefAst) -- but not
! the class-body ASSIGNMENT that declares it, so
!
!     class C:
!         __x = 1
!         def get(self): return self.__x
!
! declared __x and then looked for _C__x: AttributeError, for the plain Python
! idiom of a private attribute with a class-level default.
!
! The declaration missed because ___manglePrivate___ asked the AMBIENT
! ``CallAst classBeingCompiled'', which ClassDefAst deliberately CLEARS around
! the class-body name scans (isModuleScopeClassDef reads it as its "nested inside
! another class" test) -- and those scans are exactly where the attribute names
! are decided.  Mangling is LEXICAL now, walking to the nearest enclosing
! ClassDefAst, with the ambient kept only as the fallback for synthesised nodes
! that have no parent chain.  The class-body name PRODUCERS
! (classBodyAttributePairs, ___boundTargetNames___) and the NameAst branches that
! consult them mangle together, so the declaration, the sets and the reads all
! agree; the enclosing-scope fallbacks keep the raw name, where CPython would
! raise NameError and Grail has always resolved it.
!
! In an Enum the same names must stay NORMAL ATTRIBUTES rather than members, and
! must not trip the reserved-sunder check: CPython tests _is_private BEFORE
! _is_sunder, and _Private__major_ passes for a sunder without it.  Grail's
! _is_sunder was wrong in its own right -- it asked ``not (BOTH the second and
! second-to-last characters are underscores)'' where CPython asks that NEITHER
! is, so a name underscored at just one end was rejected outright
! (test_enum test_private_variable_is_normal_attribute).
!
! Drives tests/python/class_private_names.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassPrivateNameTestCase removeAllMethods.
ClassPrivateNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassPrivateNameTestCase
setUp
	"Reload tests/python/class_private_names.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_private_names' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_private_names.py')
		name: 'class_private_names'.
%

category: 'Grail-Private'
method: ClassPrivateNameTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The binding is mangled'
method: ClassPrivateNameTestCase
testClassBodyBindingDeclaresTheMangledName
	"``__x = 1'' in class C declares _C__x and NOT __x -- the half that was
	missing, and the reason self.__x could not find it."

	self assert: (self resultAt: 'mangled') equals: 1.
	self assert: (self resultAt: 'unmangled') asString equals: 'MISSING'.
%

category: 'Grail-Tests - The binding is mangled'
method: ClassPrivateNameTestCase
testMethodReadsTheClassLevelDefault
	"The idiom the gap broke: a private attribute with a class-body default,
	read through self."

	self assert: (self resultAt: 'via_method') equals: 1.
	self assert: (self resultAt: 'via_method_y') equals: 2.
%

category: 'Grail-Tests - The binding is mangled'
method: ClassPrivateNameTestCase
testLaterClassBodyReferenceSeesIt
	"``__y = __x + 1'' -- a bare name read in the same body.  The name SETS the
	NameAst branches consult are mangled too, so the read finds the accessor
	instead of falling through to the module global."

	self assert: (self resultAt: 'prior_ref') equals: 2.
%

category: 'Grail-Tests - The binding is mangled'
method: ClassPrivateNameTestCase
testAnnotatedAssignmentMangles
	"``__a: int = 5'' declares _Annotated__a, as the plain assignment does."

	self assert: (self resultAt: 'annotated') asString equals: '5/5'.
%

category: 'Grail-Tests - The binding is mangled'
method: ClassPrivateNameTestCase
testPrivateMethodStillReachable
	"``def __helper'' already mangled; pin it, since ___boundTargetNames___ now
	reports the mangled name and the sibling-name sets are matched against it."

	self assert: (self resultAt: 'private_method') asString equals: 'helped'.
%

category: 'Grail-Tests - Per-class, which is the point'
method: ClassPrivateNameTestCase
testSubclassGetsItsOwnSlot
	"Mangling is what makes a private attribute per-class: Derived's __slot is a
	different name from Base's, so Base's method keeps reading Base's."

	self assert: (self resultAt: 'base_sees_base') asString equals: 'base'.
	self assert: (self resultAt: 'derived_sees_derived') asString equals: 'derived'.
	self assert: (self resultAt: 'both_slots') asString equals: 'base/derived'.
%

category: 'Grail-Tests - Per-class, which is the point'
method: ClassPrivateNameTestCase
testInstanceStoreShadowsTheClassDefault
	"``self.__n = self.__n + 1'' reads the class default the first time and
	writes an INSTANCE attribute; the class attribute is untouched."

	self assert: (self resultAt: 'bump') asString equals: '1,2'.
	self assert: (self resultAt: 'class_default_intact') equals: 0.
%

category: 'Grail-Tests - Names that must NOT mangle'
method: ClassPrivateNameTestCase
testSingleUnderscoreAndDunderUntouched
	"One leading underscore is not private, and a dunder never mangles -- which
	is what keeps __init__ / __slots__ / Grail's own ___internal___ names, and
	every read of them, working."

	self assert: (self resultAt: 'single_underscore') equals: 3.
	self assert: (self resultAt: 'dunder') equals: 4.
%

category: 'Grail-Tests - Enums'
method: ClassPrivateNameTestCase
testEnumPrivateNamesAreAttributesNotMembers
	"CPython's _is_private, checked BEFORE _is_sunder.  Both of these used to
	raise: __major_ read as a reserved sunder."

	self assert: (self resultAt: 'enum_corporal') asString equals: 'Radar'.
	self assert: (self resultAt: 'enum_major') asString equals: 'Hoolihan'.
	self assert: (self resultAt: 'enum_members') asString equals: 'ONE'.
%

category: 'Grail-Tests - Enums'
method: ClassPrivateNameTestCase
testGenuineSunderStillRejected
	"The corrected _is_sunder must still catch a real one."

	self assert: (self resultAt: 'sunder_rejected') asString equals: 'ValueError'.
%
