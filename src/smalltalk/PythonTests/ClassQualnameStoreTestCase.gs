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
	"The defect in one line: the assignment used to be dropped silently."

	self assert: (self resultAt: 'before') asString equals: 'Plain'.
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
	rather than competing."

	self assert: (self resultAt: 'nested_default') asString equals: 'Outer.Inner'.
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
