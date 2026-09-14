! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InferredSlotsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InferredSlotsTestCase'
  instVarNames: #( registrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
InferredSlotsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InferredSlotsTestCase
!
! INFERRED INSTANCE SLOTS (GRAIL_INFERRED_SLOTS=1), stage 1 of the object-model
! refactor.  With the flag on, ClassDefAst infers a named instVar
! ``___slot_x___'' for every attribute a class's own instance methods assign
! through ``self'', and compiles ``self.x'' / ``self.x = v'' in those methods to
! the accessor SENDS ``self ___pyslot_x___'' / ``self ___pyslot_x___: v''.  The
! accessors are compiled on the class at build time by object class >>
! ___grailInstallInferredSlots___:properties:, which also decides -- at run
! time, once the class and its parent exist -- when NOT to compile one: an
! ancestor owns the slot, or forwards the name to a @property / __setattr__ /
! __getattribute__ of its own.  Non-strict: a name not inferred keeps going to
! dynamic-instVar storage.
!
! Drives tests/python/inferred_slots.py, whose checks are plain Python
! attribute semantics (read / write / del, AttributeError on an unassigned
! attribute, a class-level default, a subclass @property overriding a parent's
! inferred attribute, __getattr__ fallback, dynamic attributes, __dict__ / vars()
! / dir(), inheritance, __slots__ beside inferred names, setattr / getattr /
! hasattr / delattr, copy / pickle, __setattr__ hooks).  The fixture is
! SELF-RUNNING (scripts/check_python_fixtures.sh), so every expectation is
! measured against CPython.  The same checks run with the flag OFF: nothing in
! them may depend on where an attribute lives.  The structural tests then look
! at the backing class to confirm the flag actually changed the shape.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InferredSlotsTestCase removeAllMethods.
InferredSlotsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InferredSlotsTestCase
setUp
	"Snapshot the canonical-class registry: the fixture is loaded once per flag
	state under distinct module names, and a class minted under one state must
	not be identity-reused under the other."

	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
%

category: 'Grail-Setup'
method: InferredSlotsTestCase
tearDown
	importlib ___inferredSlotsInvalidate___.
	#('inferred_slots_on' 'inferred_slots_off') do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
%

category: 'Grail-Private'
method: InferredSlotsTestCase
loadFixtureWithFlag: aBoolean
	"tests/python/inferred_slots.py, freshly compiled with GRAIL_INFERRED_SLOTS
	forced to aBoolean."

	| name |
	name := aBoolean ifTrue: ['inferred_slots_on'] ifFalse: ['inferred_slots_off'].
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	importlib ___inferredSlotsForce___: aBoolean.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inferred_slots.py')
		name: name
%

category: 'Grail-Private'
method: InferredSlotsTestCase
assertAllChecksPassIn: aModule
	"run_all() answers the names of the checks that did not answer True."

	| failed |
	failed := (aModule @env1:___pyAttrLoad___: #run_all) @env1:value: #() value: nil.
	self assert: (failed @env1:__len__) equals: 0
		description: 'failing checks: ' , (failed @env1:__repr__) asString.
%

category: 'Grail-Private'
method: InferredSlotsTestCase
classNamed: aSymbol in: aModule
	^ aModule @env1:___pyAttrLoad___: aSymbol
%

category: 'Grail-Tests - Semantics'
method: InferredSlotsTestCase
testAllChecksPassWithInferredSlotsOn
	"THE TEST THIS EXISTS FOR: every attribute-semantics check in the fixture
	holds when the class's attributes live in inferred slots behind accessor
	sends."

	self assertAllChecksPassIn: (self loadFixtureWithFlag: true).
%

category: 'Grail-Tests - Semantics'
method: InferredSlotsTestCase
testAllChecksPassWithInferredSlotsOff
	"The control: the same checks hold on the unchanged dynamic-instVar
	model, so the fixture pins Python semantics rather than a storage
	layout.  ONE known exception, pre-existing and not touched by this
	change: an augmented self-store (``self.x += 1'') in a parent's method
	is written straight to dynamic-instVar storage by the flag-off codegen
	(AugAssignAst), so a SUBCLASS __setattr__ does not see it; CPython -- and
	the flag-on accessor forwarder -- route it through the hook.  Listed
	here so the day the flag-off path is fixed this test says so."

	| failed |
	failed := ((self loadFixtureWithFlag: false) @env1:___pyAttrLoad___: #run_all)
		@env1:value: #() value: nil.
	self assert: (failed @env1:__repr__) asString
		equals: '[''subclass_setattr_hook_intercepts_parent_augassign'']'.
%

category: 'Grail-Tests - Shape'
method: InferredSlotsTestCase
testInferredNamesBecomeNamedInstVarsWithAccessors
	"Point assigns x and y through self: both are named instVars on the
	backing class, both have the accessor pair, and a method body reads
	through the SEND rather than the instVar."

	| mod point src |
	mod := self loadFixtureWithFlag: true.
	point := self classNamed: #Point in: mod.
	self assert: (point allInstVarNames includes: #'___slot_x___').
	self assert: (point allInstVarNames includes: #'___slot_y___').
	self assert: (point whichClassIncludesSelector: #'___pyslot_x___' environmentId: 1) == point.
	self assert: (point whichClassIncludesSelector: #'___pyslot_x___:' environmentId: 1) == point.
	self assert: (point whichClassIncludesSelector: #'___pyHasSlots___' environmentId: 1) == point.
	"Non-strict: no ___pySlotsStrict___ marker of its own."
	self assert: (point whichClassIncludesSelector: #'___pySlotsStrict___' environmentId: 1) isNil.
	src := (point compiledMethodAt: #total environmentId: 1) sourceString.
	self assert: (src includesString: 'self ___pyslot_x___').
	self deny: (src includesString: 'dynamicInstVarAt:').
	self assert: (point @env1:___pyInferredSlotNames___) asArray equals: #(#x #y).
%

category: 'Grail-Tests - Shape'
method: InferredSlotsTestCase
testSubclassReusesTheParentsSlotAndAccessor
	"B(A) assigns a (A's slot) and b (its own): the instVar for a is not
	redeclared, the accessor for a is inherited, b gets both on B."

	| mod a b |
	mod := self loadFixtureWithFlag: true.
	a := self classNamed: #A in: mod.
	b := self classNamed: #B in: mod.
	self assert: (b instVarNames includes: #'___slot_b___').
	self deny: (b instVarNames includes: #'___slot_a___').
	self assert: (b whichClassIncludesSelector: #'___pyslot_a___' environmentId: 1) == a.
	self assert: (b whichClassIncludesSelector: #'___pyslot_b___' environmentId: 1) == b.
	self assert: (b @env1:___pyInferredSlotNames___) asArray equals: #(#b #a).
%

category: 'Grail-Tests - Shape'
method: InferredSlotsTestCase
testPropertyAndSetattrSubclassesGetForwarders
	"Sub's @property x and HookedSub's __setattr__ shadow Point/Base slots:
	each compiles its own forwarding accessor so the parent's compiled sends
	reach the property / the hook."

	| mod sub hooked |
	mod := self loadFixtureWithFlag: true.
	sub := self classNamed: #Sub in: mod.
	hooked := self classNamed: #HookedSub in: mod.
	self assert: (sub whichClassIncludesSelector: #'___pyslot_x___' environmentId: 1) == sub.
	self assert: (sub whichClassIncludesSelector: #'___pyslot_x___:' environmentId: 1) == sub.
	self assert: (hooked whichClassIncludesSelector: #'___pyslot_x___:' environmentId: 1) == hooked.
	self assert: (hooked whichClassIncludesSelector: #'___pyslot_y___:' environmentId: 1) == hooked.
	"...but the getter is still Point's: __setattr__ only intercepts stores."
	self assert: (hooked whichClassIncludesSelector: #'___pyslot_x___' environmentId: 1)
		== (self classNamed: #Point in: mod).
%

category: 'Grail-Tests - Shape'
method: InferredSlotsTestCase
testFlagOffChangesNothing
	"With the flag off the backing class has no slot instVars, no accessors
	and no marker, and the method body is the dynamic-instVar probe."

	| mod point src |
	mod := self loadFixtureWithFlag: false.
	point := self classNamed: #Point in: mod.
	self deny: (point allInstVarNames includes: #'___slot_x___').
	self assert: (point whichClassIncludesSelector: #'___pyslot_x___' environmentId: 1) isNil.
	self assert: (point whichClassIncludesSelector: #'___pyHasSlots___' environmentId: 1) isNil.
	src := (point compiledMethodAt: #total environmentId: 1) sourceString.
	self assert: (src includesString: 'dynamicInstVarAt:').
	self deny: (src includesString: '___pyslot_').
%
