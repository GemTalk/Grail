! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalParamWriteTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonlocalParamWriteTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NonlocalParamWriteTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonlocalParamWriteTestCase
!
! A NESTED SCOPE'S ``nonlocal'' WRITE THAT BINDS AN ENCLOSING DEF'S PARAMETER.
!
! Smalltalk method arguments are read-only, so Grail copies a parameter into a
! block temp whenever the body rebinds it -- FunctionDefAst >>
! paramNeedsTemp:assigned:instVars:, driven by the parser's ``writes'' set for
! that def.  A write performed by a NESTED scope through a ``nonlocal''
! declaration is not in that set: the parser records it against the scope that
! performed it, not the scope that owns the name.
!
! So the store was emitted against the Smalltalk METHOD ARGUMENT and died with
! CompileError 1001, ``expected an assignable variable'' -- which takes the
! whole MODULE down, not just the def.
!
! The ``del'' half of exactly this problem was already handled, and its comment
! states the principle: ``def outer(a): def inner(): nonlocal a; del a'' unbinds
! OUTER's parameter, so outer is the def that has to carry the temp.  The
! assignment half simply had not been done, and
! nonlocalDeclaredNamesInSubtree is its twin -- over-approximating in the same
! way and for the same reason, since the cost of a false positive is one
! needless temp copy and the cost of a miss is a module that will not compile.
!
! WHY NO CORPUS TEST SAW IT.  test_scope's ``testNonLocalClass'' is the obvious
! candidate and it passes: there the def owning the parameter is nested inside a
! TestCase METHOD, which compiles as a block whose parameters are already temps.
! The failure needs the owning def compiled as a MODULE METHOD -- written at
! module level -- which is the one spelling the upstream test does not use.
! Measured both ways: nested in a method it compiles, at module level it does
! not.
!
! Fixture: tests/python/nonlocal_write_to_enclosing_param.py (self-verifying
! under CPython 3.14).
! ===============================================================================

doit
NonlocalParamWriteTestCase removeAllMethods.
NonlocalParamWriteTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NonlocalParamWriteTestCase
setUp
	probe := self ___loadProbe___: 'nonlocal_write_to_enclosing_param'.
%

category: 'Grail-Private'
method: NonlocalParamWriteTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: NonlocalParamWriteTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: NonlocalParamWriteTestCase
testANestedDefWritesTheEnclosingParameter
	"The headline shape.  Nothing in the def's own body writes ``x'', so before
	this fix no temp was allocated for it and the nested write compiled against
	the method argument."

	self assert: (self at: 'via_nested_def') equals: 1.
%

category: 'Grail-Tests'
method: NonlocalParamWriteTestCase
testAClassBodyWritesTheEnclosingParameter
	"test_scope's testNonLocalClass construct with the owning def at MODULE
	level -- the spelling that makes the parameter a method argument rather
	than a block temp, and the reason the upstream test passes while this
	failed."

	self assert: (self at: 'via_class_body') equals: 1.
	self assert: (self at: 'class_gets_no_attribute').
%

category: 'Grail-Tests'
method: NonlocalParamWriteTestCase
testAPlainAssignmentCountsToo
	"``x = 99'', not ``x += 1''.  The augmented form also READS the name, so on
	its own it cannot distinguish a missing temp from a missing read."

	self assert: (self at: 'plain_assignment') equals: 99.
%

category: 'Grail-Tests'
method: NonlocalParamWriteTestCase
testTwoLevelsDownAndAnUndeclaredSibling
	"The collector descends through intermediate scopes, and its deliberate
	over-approximation does not change an answer: ``y'' is never declared
	nonlocal and comes back untouched."

	self
		assert: (((self at: 'two_levels') @env1:__repr__) @env0:asString)
		equals: '(11, ''untouched'')'.
%

category: 'Grail-Tests'
method: NonlocalParamWriteTestCase
testTheShapesThatAlreadyWorkedStillDo
	"A parameter its own def also writes already had a temp, and a nested
	``del'' was already covered by deletedNamesInSubtree.  Both share the
	assignedNames computation this fix extends, so both are pinned here rather
	than left to a later reader to assume."

	self assert: (self at: 'also_written_directly') equals: 2.
	self assert: (self at: 'nested_del') equals: 'unbound'.
%
