! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IRDefIdStableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IRDefIdStableTestCase'
  instVarNames: #( )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IRDefIdStableTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IRDefIdStableTestCase
!
! THE CLASS-BODY DEF REGISTRATION ID MUST NOT BE A PER-SESSION COUNTER.
!
! importlib registers each class-body def in a session table and compiles the
! id as a LITERAL into the class-build statement.  That statement lives in a
! method which is COMMITTED — a deployed framework, a canonical module — and is
! re-run in later sessions.  While the id was a counter, a later session's
! counter restarted at 1 and the baked-in id named whatever THAT session had
! registered in the same position, so a class was built from another class's
! method.  Measured on suite shard 5: `chain' took `SeqIter''s __init__,
! because a selector check cannot tell them apart — both are named __init__.
!
! ___irInstallDef:on:or:category: guards an UNKNOWN id by falling back to the
! text source.  It cannot guard a KNOWN AND WRONG one, which is why the id
! itself has to carry the identity rather than a lookup having to validate it.
!
! The property under test is STABILITY, because that is what a counter cannot
! have and what a cross-session lookup needs: the same logical def must produce
! the same id however many times, and in whatever order, a session registers it.
! Two defs that merely SHARE A NAME must still differ, or the fix would trade a
! shifted table for a collapsed one.
!
! ONE OF THESE FOUR DISCRIMINATES; the rest are guards, and it is worth knowing
! which is which before reading a green run as evidence.  Measured against the
! unfixed tree, testIdIsStableAcrossSeparateCompilations FAILS (1 then 2) and
! the other three PASS -- a counter separates same-named defs, separates
! modules and separates doits perfectly well.  They are here to stop the fix
! overshooting into a collapsed key, not to detect the defect.
! ===============================================================================

doit
IRDefIdStableTestCase removeAllMethods.
IRDefIdStableTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - support'
method: IRDefIdStableTestCase
statementsOf: aNode
	"A node's ``body'' is a SuiteAst (a BlockAst for a module or a def), not the
	statement collection -- and a SuiteAst's own ``body'' is the collection. So
	unwrap rather than assuming either shape."

	| b |
	b := aNode body.
	[b isKindOf: SuiteAst] whileTrue: [b := b body].
	^ b
%

category: 'Grail-Tests - support'
method: IRDefIdStableTestCase
classDefNamed: aName in: aModuleAst
	"The first top-level ClassDefAst in aModuleAst called aName."

	^ (self statementsOf: aModuleAst) detect: [:each |
		(each isKindOf: ClassDefAst) and: [each name asString = aName asString]]
%

category: 'Grail-Tests - support'
method: IRDefIdStableTestCase
defNamed: aName in: aClassDefAst
	"The first FunctionDefAst in aClassDefAst's body called aName."

	^ (self statementsOf: aClassDefAst) detect: [:each |
		(each isKindOf: FunctionDefAst) and: [each name asString = aName asString]]
%

category: 'Grail-Tests - support'
method: IRDefIdStableTestCase
idFor: aDefName inClass: aClassName of: aModuleAst as: aModuleNameOrNil
	"The id importlib actually registers, through the real seam --
	___irRegisterDef:forClass:name:classSide: -- rather than through the id
	function alone.  THAT CHOICE IS THE TEST'S DISCRIMINATING POWER: a test
	calling the id function directly cannot fail for the right reason against a
	tree that does not have it, because the failure is a DNU whatever the ids
	would have been.  The seam exists in both versions, so the assertion is
	about the ids.

	classDefIsModuleScope is set true to take the DEFERRED registration branch,
	which stores an AST plus a context snapshot and builds nothing -- a
	method-local class would compile IR here, which this test has no business
	doing.  Both it and the module name are compile-time context, so both are
	restored; otherwise one test seeds the next."

	| cls def savedMod savedScope |
	cls := self classDefNamed: aClassName in: aModuleAst.
	def := self defNamed: aDefName in: cls.
	savedMod := CallAst moduleNameBeingCompiled.
	savedScope := CallAst classDefIsModuleScope.
	^ [CallAst moduleNameBeingCompiled: aModuleNameOrNil.
		CallAst classDefIsModuleScope: true.
		importlib ___irRegisterDef: def forClass: cls name: aDefName
			classSide: false]
			ensure: [
				CallAst moduleNameBeingCompiled: savedMod.
				CallAst classDefIsModuleScope: savedScope]
%

category: 'Grail-Tests - support'
method: IRDefIdStableTestCase
twoClassSource
	"Two classes, each with an __init__ — the shape a selector check cannot
	tell apart, and the one that was actually observed swapping."

	^ 'class Alpha:
    def __init__(self):
        self.x = 1

class Beta:
    def __init__(self):
        self.y = 2
'
%

category: 'Grail-Tests - the IR def-registration id'
method: IRDefIdStableTestCase
testIdIsStableAcrossSeparateCompilations
	"THE REGRESSION.  Two compilations of the same module must register the
	same def under the same id — that is precisely what a committed method
	carrying the id as a literal depends on, and precisely what a per-session
	counter cannot provide: it answered 1 then 2."

	| first second |
	first := self idFor: '__init__' inClass: 'Alpha'
		of: (ModuleAst parseSource: self twoClassSource) as: 'grail_id_probe'.
	second := self idFor: '__init__' inClass: 'Alpha'
		of: (ModuleAst parseSource: self twoClassSource) as: 'grail_id_probe'.
	self assert: first = second
		description: 'the id for one def is not stable across compilations: '
			, first printString , ' then ' , second printString
%

category: 'Grail-Tests - the IR def-registration id'
method: IRDefIdStableTestCase
testTwoDefsNamedTheSameGetDifferentIds
	"The other half, and the reason the key carries OFFSETS rather than just a
	name: Alpha.__init__ and Beta.__init__ are distinct defs with one name.
	Collapsing them would swap methods just as surely as the counter did."

	| modAst alpha beta |
	modAst := ModuleAst parseSource: self twoClassSource.
	alpha := self idFor: '__init__' inClass: 'Alpha' of: modAst as: 'grail_id_probe'.
	beta := self idFor: '__init__' inClass: 'Beta' of: modAst as: 'grail_id_probe'.
	self deny: alpha = beta
		description: 'two same-named defs in different classes share an id: '
			, alpha printString
%

category: 'Grail-Tests - the IR def-registration id'
method: IRDefIdStableTestCase
testIdIsNamespacedByModule
	"The same source compiled as two different modules must not collide: the
	offsets are identical, so the module name is the only thing separating
	them."

	| src here there |
	src := self twoClassSource.
	here := self idFor: '__init__' inClass: 'Alpha'
		of: (ModuleAst parseSource: src) as: 'grail_id_probe_one'.
	there := self idFor: '__init__' inClass: 'Alpha'
		of: (ModuleAst parseSource: src) as: 'grail_id_probe_two'.
	self deny: here = there
		description: 'the same def in two modules shares an id: ' , here printString
%

category: 'Grail-Tests - the IR def-registration id'
method: IRDefIdStableTestCase
testADoitStillGetsAUniqueId
	"A doit has no module name, so there is nothing to make a deterministic key
	unique — two exec''d strings can each hold a class at offset 10 with an
	__init__ at offset 30.  It keeps the counter, and that is safe because a
	doit''s method is not committed and so is never re-run in a later session.
	What it must NOT do is hand two different doits one id."

	| modAst first second |
	modAst := ModuleAst parseSource: self twoClassSource.
	first := self idFor: '__init__' inClass: 'Alpha' of: modAst as: nil.
	second := self idFor: '__init__' inClass: 'Alpha' of: modAst as: nil.
	self deny: first = second
		description: 'two doit registrations share an id: ' , first printString
%
