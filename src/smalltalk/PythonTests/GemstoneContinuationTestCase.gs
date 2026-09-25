! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GemstoneContinuationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GemstoneContinuationTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GemstoneContinuationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GemstoneContinuationTestCase
! The in-session half of the continuation primitives on the gemstone module
! (gemstone.gs, 'Grail-Continuations'), which stdlib ``durable'' stands on.
! Capture is done inside a FORKED process on purpose: a continuation copies the
! whole stack from its base, and resuming one captured in this test method
! directly would run a copy of the SUnit runner's frames.  The cross-gem half
! -- commit, log out, resume elsewhere -- and the refusal of a session-bound
! object need fresh gems, and live in tests/scripts/run_durable_test.sh: a
! refused commit disables commits until the session aborts, which a shard
! session sharing later tests must not do.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GemstoneContinuationTestCase removeAllMethods.
GemstoneContinuationTestCase class removeAllMethods.
%

category: 'Grail-Tests'
method: GemstoneContinuationTestCase
testCaptureThenResumeReturnsTheValueFromTheSameCall
	"The first return of ___captureContinuation___ is the continuation; a
	later ``value: 42'' from another process returns 42 from that same call,
	with the frame's locals as they were."

	| g result sem k |
	g := gemstone @env1:instance.
	result := Array new: 3.
	sem := Semaphore new.
	[ | c local |
		local := 'kept'.
		c := g @env1:___captureContinuation___.
		(g @env1:___isContinuation___: c) == true
			ifTrue: [result at: 1 put: c]
			ifFalse: [result at: 2 put: c. result at: 3 put: local].
		sem signal ] fork.
	sem wait.
	k := result at: 1.
	self assert: k notNil.
	self assert: (k isKindOf: GsProcess).
	self assert: k isContinuation.
	self assert: (result at: 2) isNil.
	"Resuming replaces the resuming process's stack, so give it one of its own."
	[ k value: 42 ] fork.
	sem wait.
	self assert: (result at: 2) equals: 42.
	self assert: (result at: 3) equals: 'kept'.
%

category: 'Grail-Tests'
method: GemstoneContinuationTestCase
testIsContinuationIsFalseForAnythingElse
	| g |
	g := gemstone @env1:instance.
	self assert: (g @env1:___isContinuation___: 42) == false.
	self assert: (g @env1:___isContinuation___: 'a string') == false.
	self assert: (g @env1:___isContinuation___: nil) == false.
	self assert: (g @env1:___isContinuation___: ([ 1 ] newProcess)) == false.
%

category: 'Grail-Tests'
method: GemstoneContinuationTestCase
testAContinuationIsMultiShot
	"Resuming the same continuation twice restores the captured locals each
	time (Seaside's back button; durable's crash recovery)."

	| g result sem k |
	g := gemstone @env1:instance.
	result := OrderedCollection new.
	sem := Semaphore new.
	[ | c n |
		n := 0.
		c := g @env1:___captureContinuation___.
		n := n + 1.
		(g @env1:___isContinuation___: c) == true
			ifTrue: [result add: c]
			ifFalse: [result add: c -> n].
		sem signal ] fork.
	sem wait.
	k := result removeFirst.
	[ k value: #first ] fork.
	sem wait.
	[ k value: #second ] fork.
	sem wait.
	self assert: result asArray equals: { #first -> 1. #second -> 1 }.
%
