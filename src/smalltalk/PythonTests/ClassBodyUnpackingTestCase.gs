! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyUnpackingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyUnpackingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyUnpackingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyUnpackingTestCase
!
! Names a CLASS BODY binds by UNPACKING.
!
! A class body has no Smalltalk temps to bind -- ClassDefAst emits its statements
! straight into the class-build code -- so every name it binds is stored ON THE
! CLASS: in an accessor pair when the name is assigned unconditionally, in the
! per-class dynamic-attr holder otherwise.  THREE places have to agree on which
! names those are: the parser (which registers writes), the store emitters, and
! the read emitter.  For a plain ``for i in ...:'' they did.  For anything that
! unpacks, they did not, and each disagreement failed differently:
!
!   * READ side.  ``for t, ss in d.items():'' stored both names on the class and
!     read them back as MODULE globals, because ClassDefAst's name collector
!     tested ``isKindOf: NameAst'' and stopped there.  The store side unpacked
!     correctly all along, which is why this surfaced as a NameError from a LATER
!     statement rather than as anything wrong at the loop.
!   * STORE side.  ``with cm() as (u, v):'' did not COMPILE: the tuple-unpack
!     leaf knew the module home but not the class-body one, emitted a bare
!     ``u := ...'', and an undefined symbol takes the whole enclosing MODULE
!     down rather than failing at the statement.
!   * EMITTED AT ALL.  ``if flag: p, q = 5, 6'' was SILENTLY DROPPED -- the
!     if-branch emitter handled simple NAME = value and documented "anything else
!     is dropped".  No error; the binding just never happened, so a later line
!     raised NameError naming a variable the reader can see being assigned two
!     lines above.  That is the worst of the four, because nothing points at it.
!   * ORDER.  ``x = 1; del x; x = 2'' died with a doesNotUnderstand on the
!     setter.  A class-body ``del'' REMOVES the accessor pair (nilling it would
!     leave hasattr answering true), so the re-assignment has to reach the holder
!     -- and the holder's accessor is compiled AFTER the attribute-value section,
!     so it did not exist yet.  A body that dels now gets the holder emitted
!     early as well; the later site is nil-guarded and so a no-op.
!
! Found by porting CPython's pydoc, whose Helper class body needs three of the
! four at once:
!
!     for topic, symbols_ in _symbols_inverse.items():
!         for symbol in symbols_:
!             topics = symbols.get(symbol, topic)
!     del topic, symbols_, symbol, topics
!     topics = { ... }
!
! KNOWN GAP, found while writing this and NOT fixed: the same class bodies
! compiled through ``exec(compile(src, ...))'' rather than loaded as a module
! still emit bare assignments and fail with undefined symbols.  The exec path
! does not establish the class-body runtime scope the module path does.  Its own
! piece of work; the fixture is driven as a module, as every other one is.
!
! Drives tests/python/class_body_unpacking.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyUnpackingTestCase removeAllMethods.
ClassBodyUnpackingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyUnpackingTestCase
setUp
	"Reload tests/python/class_body_unpacking.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_unpacking' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_unpacking.py')
		name: 'class_body_unpacking'.
%

category: 'Grail-Private'
method: ClassBodyUnpackingTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Loop targets'
method: ClassBodyUnpackingTestCase
testATupleLoopTargetBindsEveryNameItUnpacks
	"The read half.  Both names were stored and neither could be read."

	self assert: (self resultAt: 'for_tuple_target') asString
		equals: '[(''A'', 1), (''A'', 2)]'.
	self assert: (self resultAt: 'for_tuple_binds_after_loop') asString
		equals: '(3, 4)'.
%

category: 'Grail-Tests - Loop targets'
method: ClassBodyUnpackingTestCase
testStarAndNestedLoopTargetsBindToo
	"The collector recurses, so a star target and a nested tuple are covered by
	construction rather than by three separate branches."

	self assert: (self resultAt: 'for_star_target') asString equals: '[(1, [2, 3])]'.
	self assert: (self resultAt: 'for_nested_target') asString equals: '[(1, 2, 3)]'.
%

category: 'Grail-Tests - with-as targets'
method: ClassBodyUnpackingTestCase
testATupleWithAsTargetCompilesAndBinds
	"This one was a COMPILE error, not a NameError: a bare ``u := ...'' names an
	undefined symbol and takes the whole enclosing module down, so the class
	that used it made its module unimportable."

	self assert: (self resultAt: 'with_tuple_as') asString equals: '3'.
%

category: 'Grail-Tests - if branches'
method: ClassBodyUnpackingTestCase
testAnIfBranchAssignmentToANonNameTargetIsNotDropped
	"Silently dropped before -- no error, no binding.  Both a tuple target and a
	subscript target, since the emitter's test was ``all targets are plain
	names'' and so discarded either."

	self assert: (self resultAt: 'if_branch_tuple_assign') asString equals: '11'.
	self assert: (self resultAt: 'if_branch_subscript_assign') asString
		equals: '[(''k'', ''v'')]'.
%

category: 'Grail-Tests - del'
method: ClassBodyUnpackingTestCase
testANameCanBeDeletedAndAssignedAgain
	self assert: (self resultAt: 'del_then_reassign') asString equals: '2'.
%

category: 'Grail-Tests - del'
method: ClassBodyUnpackingTestCase
testADeletedNameStaysDeleted
	"The paired half: routing a del-ed name's stores through the definitional
	store must not resurrect it.  Asserted because the fix reorders when the
	holder is created, and getting that wrong makes hasattr answer true."

	self assert: (self resultAt: 'del_stays_deleted') asString equals: 'False'.
%

category: 'Grail-Tests - del'
method: ClassBodyUnpackingTestCase
testThePydocHelperShapeWholeWorks
	"All of it together, which is how it was found: a nested loop over an
	unpacking target, reads of both names inside, a del of four, and a
	re-assignment of one of them afterwards."

	self assert: (self resultAt: 'pydoc_helper_shape') asString
		equals: '[(''"'', ''STRINGS''), (''%'', ''OPERATORS''), ("''", ''STRINGS''), (''j'', ''COMPLEX'')]'.
	self assert: (self resultAt: 'pydoc_helper_topics') asString
		equals: '{''TYPES'': ''types''}'.
%

category: 'Grail-Tests - Already worked'
method: ClassBodyUnpackingTestCase
testTheShapesThatAlreadyWorkedStillDo
	"An unconditional tuple assignment at class-body level, and a plain loop
	target.  Both go through different emitters than the four above and are
	asserted so a regression says which side moved."

	self assert: (self resultAt: 'toplevel_tuple_assign') asString equals: '(7, 8)'.
	self assert: (self resultAt: 'simple_for_target') asString equals: '(6, 3)'.
%

set compile_env: 0
