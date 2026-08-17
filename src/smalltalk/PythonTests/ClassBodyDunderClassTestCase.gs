! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyDunderClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyDunderClassTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyDunderClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyDunderClassTestCase
!
! ``__class__'' IN A CLASS BODY IS THE ENCLOSING CLASS.
!
! Not the class being defined -- that class does not exist yet while its body is
! running, which is exactly why it cannot be the answer.  CPython makes
! ``__class__'' a free variable of the enclosing SCOPE, so for a class nested in
! a method it is the class that METHOD was defined in:
!
!     class Host:
!         def run(self):
!             class X:
!                 x = __class__          # Host, not X
!
! Grail's ``__class__'' branch stood down inside a class body -- correctly, since
! the inner class is not the answer -- but nothing took over, so the read fell
! all the way through to a module-attribute lookup and came back as a BoundMethod
! for ``builtins.__class__'': an object with no relationship to any class at all.
! Nothing errored.  ``X.x is type(self)'' was simply False (test_super's
! test_various___class___pathologies).
!
! WHY THE ENCLOSING CLASS WAS NOT SIMPLY AVAILABLE.  ClassDefAst overwrites
! classBeingCompiled with the INNER class before emitting its body, keeping the
! outer value only in a method-local.  So the enclosing class is published for
! the duration of the body emit, at the one point where the slots still describe
! it -- which is why it is set beside inClassBodyValueEmit and restored beside it.
! Three things travel together (CallAst >> enclosingClassContext), and the third
! is the one that is easy to miss: a method-local enclosing class is reached
! through its CLOSURE CELL, and the cell store is only emitted for names in that
! class's captured set, so the read has to register itself in the ENCLOSING
! class's set.  Registering in the live one would file it under the inner class,
! whose stores are emitted where the name means nothing.
!
! printDefiningClassOn: is deliberately NOT reused with the context swapped: it
! also sets classNeedsClassCell and registers a captured name, and both of those
! slots belong to the INNER class at that moment, so it would flag the wrong
! class twice over.
!
! TWO SHAPES HAVE NO ENCLOSING CLASS, and CPython raises ``name '__class__' is
! not defined'' for both: a class body at MODULE scope, and a class body nested
! DIRECTLY inside another class body.  The second is the one worth stating -- a
! class body is not a scope that names resolve through, so ``class Outer: class
! Inner: x = __class__'' does NOT see Outer.  inClassBodyValueEmit answers
! exactly that question at the publish point, since it still holds the outer
! value there: true means we arrived from a class body rather than through a
! method.  Both raise explicitly, because falling through does NOT raise --
! ``__class__'' resolves as a builtins attribute and yields that BoundMethod.
!
! WHAT THIS DOES NOT FIX.  test_various___class___pathologies now fails only on
! its LAST assertion, ``nonlocal __class__'' in a class body.  That is not a
! __class__ problem: ``nonlocal'' in a class body is silently a NO-OP in Grail for
! ANY name --
!     def outer():
!         marker = 1
!         class X:
!             nonlocal marker
!             marker = 42
!         return marker          # Grail: 1, CPython: 42
! -- so the write never reaches the enclosing local.  A separate bug with a wider
! blast radius than this one, and no error to announce it.
!
! Measured: every expectation below is CPython 3.14.6's own output for
! tests/python/class_body_dunder_class.py.  No regression across the corpus.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyDunderClassTestCase removeAllMethods.
ClassBodyDunderClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyDunderClassTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_dunder_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/class_body_dunder_class.py')
		name: 'class_body_dunder_class'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: ClassBodyDunderClassTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: ClassBodyDunderClassTestCase
testAClassBodyReadsTheEnclosingModuleScopeClass
	"The shape the whole change is about, and the one test_super asserts:
	``X.x is type(self)'' for a class defined inside a method.  Answered a
	BoundMethod for builtins.__class__ before -- not a class at all, and no error
	to say so."

	self assert: (self at: 'enclosing_is_module_scope_class') equals: true.
%

category: 'Grail-Tests'
method: ClassBodyDunderClassTestCase
testAClassBodyReadsTheEnclosingMethodLocalClass
	"The other way of reaching an enclosing class, and it compiles differently:
	a method-local class is read through its closure cell rather than off the
	module instance.  The cell STORE is only emitted for names registered as
	captured, so this passes only when the read registers itself against the
	enclosing class's captured set -- the inner class's set is the wrong one."

	self assert: (self at: 'enclosing_is_method_local_class') equals: true.
%

category: 'Grail-Tests'
method: ClassBodyDunderClassTestCase
testTheClassBeingDefinedIsNotTheAnswer
	"Stated as its own test because it is the trap: the obvious reading of
	``__class__'' in a class body is the class being defined, and it is wrong --
	that class does not exist while its body runs."

	self assert: (self at: 'inner_class_is_not_the_answer') equals: true.
%

category: 'Grail-Tests'
method: ClassBodyDunderClassTestCase
testAMethodOfTheInnerClassStillGetsTheInnerClass
	"The guard on all of it.  ``__class__'' in a METHOD is the ORDINARY rule --
	the class the method was defined in -- and widening the class-BODY case must
	not disturb it."

	self assert: (self at: 'inner_method_still_gets_inner_class') equals: true.
%

category: 'Grail-Tests - No enclosing class'
method: ClassBodyDunderClassTestCase
testAModuleScopeClassBodyRaisesNameError
	"``name '__class__' is not defined''.  Raised explicitly: falling through
	does not raise, because ``__class__'' resolves as a builtins attribute and
	comes back as a BoundMethod."

	self assert: (self at: 'module_scope_body') @env0:asString equals: 'NameError'.
%

category: 'Grail-Tests - No enclosing class'
method: ClassBodyDunderClassTestCase
testAClassBodyInsideAClassBodyRaisesNameError
	"A class body is NOT a scope names resolve through, so ``class Outer: class
	Inner: x = __class__'' does not see Outer.  Getting this wrong is the natural
	failure of the fix itself -- the enclosing class IS sitting right there in the
	compile context, and publishing it unconditionally answers Outer."

	self assert: (self at: 'class_body_in_class_body') @env0:asString
		equals: 'NameError'.
%
