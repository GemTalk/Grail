! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DecoratorEvalOrderTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DecoratorEvalOrderTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DecoratorEvalOrderTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DecoratorEvalOrderTestCase
!
! THE ORDER IN WHICH A DECORATOR CHAIN IS EVALUATED AND APPLIED.
!
! Decorating is TWO PHASES, not one.  CPython evaluates every decorator
! EXPRESSION first, top-down in source order, and only then APPLIES the
! resulting decorators, bottom-up.  The language reference spells the four steps
! out per decorator-maker -- evaluate the name, evaluate the arguments, call the
! maker, call the decorator -- and test_decorators' test_eval_order pins the
! exact interleaving of them across a chain of three.
!
! GRAIL FUSED THE TWO PHASES for a def inside a function or a method.  It
! emitted one statement per decorator,
!
!     foo := <deco 3 expr> value: { foo } value: nil.
!     foo := <deco 2 expr> value: { foo } value: nil.
!
! walking decorator_list in reverse -- which evaluates AND applies each
! decorator before it looks at the next, giving
! makedec3/calldec3/makedec2/calldec2 where CPython gives
! makedec2/makedec3/calldec3/calldec2.
!
! A SINGLE DECORATOR CANNOT SHOW THE BUG.  With one decorator the fused and
! split orders are identical, so the difference needs a chain of two, AND a
! decorator expression with an observable side effect -- the fixture threads its
! log through __getattr__ as well as through the maker and the decorator, which
! is how the ``evalname''/``evalargs'' steps become visible at all.  That is also
! why the fix leaves the one-decorator path exactly as it was: there is nothing
! to reorder, and no reason to put a new emit shape in front of the common case.
!
! THREE EMITTERS, and only the middle one was wrong.  A MODULE-LEVEL def goes
! through printModuleDecoratorsOn:, which already nested the whole chain into a
! single expression A(B(f)) -- Smalltalk's own receiver-then-argument evaluation
! then happens to give CPython's order, so top-level decorators were correct all
! along.  A CLASS-BODY method goes through printMethodDecoratorChainOn:, nested
! the same way and likewise correct.  Only the function-local path emitted
! statements.  That asymmetry is the trap: the same code written at module level
! passes, so a fixture written at module level reports this as working.  Both
! spellings are in the fixture for exactly that reason.
!
! THE FIX NEEDS SOMEWHERE TO PUT THE EVALUATED DECORATORS, and there is no way
! to declare a Smalltalk temp at that point in the emit.  A BLOCK PARAMETER is
! that somewhere, so the whole chain becomes one statement:
!
!     foo := [:___grailDecoFns___ |
!         ((___grailDecoFns___ @env0:at: 1) value: {
!             ((___grailDecoFns___ @env0:at: 2) value: { foo } value: nil) }
!                 value: nil)
!     ] @env0:value: { <deco 1 expr>. <deco 2 expr> }.
!
! THE BRACE ARRAY IS THE MECHANISM: its elements evaluate left-to-right, in
! source order, and all of them before the block is entered -- so every
! decorator-maker call happens before any decorator is applied.  The block then
! nests the applications the other way up, so the decorator nearest the def is
! called first.  It also scales to any chain length, which a fixed
! ``value:value:'' arity would not.
!
! Fixture: tests/python/decorator_eval_order.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: DecoratorEvalOrderTestCase
setUp
	probe := self ___loadProbe___: 'decorator_eval_order'.
%

category: 'Grail-Private'
method: DecoratorEvalOrderTestCase
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
method: DecoratorEvalOrderTestCase
reprAt: aKey
	"The fixture's entries are nested Python lists; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: DecoratorEvalOrderTestCase
___chainedRepr___
	"CPython's order for a chain of three: all three makers, then the
	decorators bottom-up."

	^ '[42, [''evalname1'', ''evalargs1'', ''makedec1'', ''evalname2'', ''evalargs2'', ''makedec2'', ''evalname3'', ''evalargs3'', ''makedec3'', ''calldec3'', ''calldec2'', ''calldec1'']]'
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testNestedDefEvaluatesAllMakersBeforeApplyingAny
	"The headline.  A def inside a FUNCTION: previously
	makedec3/calldec3/makedec2/... because each decorator was evaluated and
	applied by its own statement."

	self assert: (self reprAt: 'nested') equals: self ___chainedRepr___.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testNestedInsideAMethodIsTheUpstreamShape
	"test_decorators' own nesting -- its class and defs live inside the test
	METHOD.  Kept separate from the plain nested case because a method body is
	a different enclosing scope, and it is the spelling the CPython suite
	actually exercises."

	self assert: (self reprAt: 'nested_in_method') equals: self ___chainedRepr___.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testModuleLevelChainIsUnchanged
	"The path that was already correct, through printModuleDecoratorsOn:.  It
	is here as a REGRESSION guard, and as the reason the bug was easy to miss:
	the same source at module level always passed."

	self assert: (self reprAt: 'module_level') equals: self ___chainedRepr___.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testTwoDecoratorsAreEnoughToShowTheOrder
	"The shortest chain that distinguishes fused from split.  Worth pinning on
	its own: a fix that only handled three-deep chains, or that special-cased
	the outermost decorator, would pass the three-deep test and fail here."

	self assert: (self reprAt: 'nested_pair')
		equals: '[7, [''evalname1'', ''evalargs1'', ''makedec1'', ''evalname2'', ''evalargs2'', ''makedec2'', ''calldec2'', ''calldec1'']]'.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testSingleDecoratorPathIsLeftAlone
	"One decorator: the fused and split orders coincide, so this is the control
	on the guard that keeps the new emit shape off the common case."

	self assert: (self reprAt: 'nested_single')
		equals: '[9, [''evalname2'', ''evalargs2'', ''makedec2'', ''calldec2'']]'.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testClassBodyMethodChainIsUnchanged
	"A method decorated in a class BODY -- printMethodDecoratorChainOn:, a
	third emitter, also already nested and correct."

	self assert: (self reprAt: 'in_class_body')
		equals: '[3, [''evalname1'', ''evalargs1'', ''makedec1'', ''evalname3'', ''evalargs3'', ''makedec3'', ''calldec3'', ''calldec1'']]'.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testTheSugarMatchesTheHandWrittenNesting
	"Chapter 7's equivalence claim: ``@A @B def f'' must behave exactly like
	``f = A(B(f))''.  Both spellings are measured through the same tracer, so
	this compares Grail against Grail as well as against CPython."

	self assert: (self reprAt: 'manual') equals: self ___chainedRepr___.
%

category: 'Grail-Tests'
method: DecoratorEvalOrderTestCase
testTheChainStillThreadsWrappers
	"The order checks all use decorators that return func UNCHANGED, so they
	would pass even if the applications were reordered into nothing.  These
	return a real wrapper, so the nesting has to thread: outer(inner(f))."

	self assert: (self reprAt: 'decorators_actually_wrap')
		equals: '''outer(inner(f))'''.
%
