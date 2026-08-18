! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassQualnameStoreTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassQualnameStoreTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassQualnameStoreTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassQualnameStoreTestCase
!
! ``cls.__qualname__ = 'Outer.Inner''' is a WRITABLE slot in CPython, and pickle
! depends on it.  A class defined in a function body is pickled by walking its
! dotted qualname from the module, so the idiom is to attach the class somewhere
! reachable and then say where it now lives:
!
!     self.__class__.NestedEnum = NestedEnum
!     NestedEnum.__qualname__ = 'TestSpecial.NestedEnum'
!
! Grail dropped that store SILENTLY: the assignment appeared to work, the read
! still answered the old name, and pickle went looking for a top-level
! ``NestedEnum'' that was not there.
!
! The class-side READ of __qualname__ always performs the getter -- it has to,
! so ``type(x).__qualname__'' is a string rather than a bound method -- and the
! getter reads a DIFFERENT slot: ___qualname___, which ClassDefAst fills for a
! nested class at build time.  The store is routed to that slot, so an
! assignment overrides the build-time value through the one path the getter
! already honours.
!
! Drives tests/python/class_qualname_store.py.  test_enum
! TestSpecial.test_pickle_nested_class.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassQualnameStoreTestCase removeAllMethods.
ClassQualnameStoreTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassQualnameStoreTestCase
setUp
	"Reload tests/python/class_qualname_store.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_qualname_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_qualname_store.py')
		name: 'class_qualname_store'.
%

category: 'Grail-Private'
method: ClassQualnameStoreTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The store takes effect'
method: ClassQualnameStoreTestCase
testAssigningQualnameIsVisible
	"The defect in one line: the assignment used to be dropped silently.

	``before'' is the FUNCTION-nested qualname, not the bare name: every class
	this fixture mutates is built inside a function (a module-level class is
	canonical, so the assignment would leak into the next test), and CPython
	reports ``_plain.<locals>.Plain'' for such a class.  This asserted ``Plain''
	while Grail could not see lexical nesting at all -- pinning Grail's limit
	rather than CPython's answer.  Verified by running the fixture."

	self assert: (self resultAt: 'before') asString equals: '_plain.<locals>.Plain'.
	self assert: (self resultAt: 'after') asString equals: 'Holder.Plain'.
%

category: 'Grail-Tests - The store takes effect'
method: ClassQualnameStoreTestCase
testOnlyTheQualifiedNameMoves
	"__name__ is a separate slot and is untouched."

	self assert: (self resultAt: 'name_unchanged') asString equals: 'Plain'.
%

category: 'Grail-Tests - The store takes effect'
method: ClassQualnameStoreTestCase
testABuildTimeNestedQualnameCanBeOverridden
	"ClassDefAst writes the nested name into the same slot, so the two agree
	rather than competing.

	``Outer'' is itself built inside a function here, so the build-time default
	is the WHOLE chain -- ``_outer.<locals>.Outer.Inner'', which is what CPython
	answers.  It read ``Outer.Inner'' while Grail truncated to one level."

	self assert: (self resultAt: 'nested_default') asString
		equals: '_outer.<locals>.Outer.Inner'.
	self assert: (self resultAt: 'nested_override') asString equals: 'Somewhere.Else'.
%

category: 'Grail-Tests - What the store is for'
method: ClassQualnameStoreTestCase
testAClassDefinedInAFunctionPicklesOnceItSaysWhereItLives
	"Attach it, name it, and the dotted lookup finds it -- both the member and
	the class itself."

	self assert: (self resultAt: 'qualname') asString equals: 'Holder.NestedEnum'.
	self assert: (self resultAt: 'roundtrip').
	self assert: (self resultAt: 'roundtrip_class').
%

category: 'Grail-Tests - Known gaps'
method: ClassQualnameStoreTestCase
testAnUnattachedClassStillPicklesIsAKnownGap
	"Recorded, NOT endorsed.  CPython raises PicklingError for a class that was
	never attached anywhere, because its qualname resolves to nothing; Grail's
	pickle is more permissive.  Unrelated to the store above, and pinned so it
	is not mistaken for part of it."

	self assert: (self resultAt: 'unattached_is_a_known_gap') asString equals: 'NO ERROR'.
%
