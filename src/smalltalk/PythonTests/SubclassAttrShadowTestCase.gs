! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SubclassAttrShadowTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubclassAttrShadowTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubclassAttrShadowTestCase
!
! A MULTIPLE-INHERITANCE SUBCLASS MUST SEE A SECONDARY BASE'S CURRENT CLASS
! ATTRIBUTE, NOT A STALE COPY OF THE VALUE ITS OWN BASE DECLARED.
!
! Grail implements multiple inheritance by COPY-DOWN: ``class C(S1, B)'' inherits
! ONE base through Smalltalk single inheritance (the storage base, chosen by
! chain depth) and importlib >> ___mergeSecondaryBases___ copies the OTHER bases'
! methods and class attributes onto C.  The class-attribute value pass walked
! each secondary base's chain to find the ancestor whose METACLASS declares the
! Grail-Class Attrs accessor -- and then read the value from THAT ancestor.
!
! That is the wrong class.  A Grail class attribute compiled from ``x = 'from-A'''
! is an accessor pair ``x ^ x'' over a CLASSINSTVAR, and classInstVars are
! PER-CLASS storage: one compiled accessor on ``A class'' serves every subclass,
! but each subclass reads its OWN slot.  After a later ``B.x = 'from-B''' the two
! reads therefore differ -- ``A perform: #x'' answers 'from-A' and ``B perform: #x''
! answers 'from-B'' -- and the merge, asking A, copied 'from-A' onto C's
! ___dynInstVars___ holder.  Being ON C, that copy is nearer than anything on B
! and won every subsequent read.  SILENTLY WRONG DATA, not an error.
!
! WHY THE OBVIOUS MINIMAL REPRO DOES NOT REPRODUCE.  If B is the deepest base in
! the header it becomes C's Smalltalk superclass, no copy is made at all, and the
! read walks the real chain -- correct.  Four earlier attempts at a minimal repro
! all had that shape and all four passed, which made the bug look absent.  A base
! of EQUAL OR GREATER depth listed AHEAD of B is what pushes B off the primary
! chain; testShallowFirstBaseWasAlwaysCorrect pins that distinction so the
! discriminator cannot be lost.
!
! Found in pyyaml 6.0.3, where ``BaseResolver'' declares
! ``yaml_implicit_resolvers = {}'', ``Resolver.add_implicit_resolver'' fills
! Resolver's slot with 30 entries at import time, and
! ``class SafeLoader(Reader, Scanner, Parser, Composer, SafeConstructor, Resolver)''
! copied BaseResolver's EMPTY dict down.  Every YAML scalar then resolved to
! ``tag:yaml.org,2002:str'': ``yaml.safe_load('a: 1')'' answered ``{'a': '1'}''
! instead of ``{'a': 1}''.
!
! The fix is importlib >> ___classAttrValueSeenFrom___:upTo:name:, which reads the
! value as Python's MRO sees it FROM THE BASE NAMED IN THE HEADER, walking
! nearest-first and probing all THREE homes a Grail class attribute can live in
! (session overlay, ___dynInstVars___ holder, accessor pair) at each step -- the
! same completeness PRs #739 and #750 established for the load and store paths.
!
! Fixture: tests/python/subclass_attr_shadow.py -- 14/14 under CPython 3.14.6
! unchanged, and it needs no pip package.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: SubclassAttrShadowTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'subclass_attr_shadow' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subclass_attr_shadow.py')
		name: 'subclass_attr_shadow'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'
%

category: 'Grail-Private'
method: SubclassAttrShadowTestCase
resultAt: aKey
	"True when the fixture's check agreed with CPython; otherwise the
	``got X, want Y'' string, which is what the failure message should say."

	| v |
	v := probe @env1:__getitem__: aKey.
	v == true ifTrue: [^ 'ok'].
	^ v @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: SubclassAttrShadowTestCase
testMiChildSeesNearestBase
	"THE BUG.  ``class C(S1, B)'' where B was reassigned after its class body:
	C.x must answer B's value, not the value B's own base declared."

	self assert: (self resultAt: 'mi_child_sees_nearest_base') equals: 'ok'.
	self assert: (self resultAt: 'base_keeps_its_own_value') equals: 'ok'.
	self assert: (self resultAt: 'subclass_sees_reassignment') equals: 'ok'.
%

category: 'Grail-Tests'
method: SubclassAttrShadowTestCase
testYamlShapeClassmethodMutatingCls
	"pyyaml's actual shape, reduced: a @classmethod doing ``cls.tbl = ...'' at
	import time populates the MIDDLE class's storage, leaving the declaring
	base's empty.  This is the one that made every YAML scalar a str."

	self assert: (self resultAt: 'yaml_shape_base_untouched') equals: 'ok'.
	self assert: (self resultAt: 'yaml_shape_middle_populated') equals: 'ok'.
	self assert: (self resultAt: 'yaml_shape_loader_sees_middle') equals: 'ok'.
	self assert: (self resultAt: 'yaml_shape_loader_contents') equals: 'ok'.
%

category: 'Grail-Tests'
method: SubclassAttrShadowTestCase
testDepthOfTheNamedBase
	"The value comes from the base NAMED IN THE HEADER -- neither from the class
	that declares the accessor nor from whatever sits between them.  A three-deep
	chain with a distinct value at each level is what tells those three apart; a
	two-level chain cannot."

	self assert: (self resultAt: 'deepest_named_base_wins') equals: 'ok'.
	self assert: (self resultAt: 'middle_named_base_wins') equals: 'ok'.
%

category: 'Grail-Tests'
method: SubclassAttrShadowTestCase
testShallowFirstBaseWasAlwaysCorrect
	"THE DISCRIMINATOR, kept as a standing check.  With a SHALLOW first base, B
	is the deepest base and becomes the storage base, so nothing is copied and
	the read was already right.  That is the shape four earlier minimal repros
	had, and it is why the defect read as absent.  If this ever becomes the only
	passing row again, the repro has lost its teeth."

	self assert: (self resultAt: 'shallow_first_base_is_correct') equals: 'ok'.
%

category: 'Grail-Tests'
method: SubclassAttrShadowTestCase
testPrecedenceControls
	"The other direction: reading the nearer value must not start OVERRIDING
	things that legitimately outrank it.  An attribute never reassigned still
	resolves to its declaring class; a value on the leftmost (storage) base
	still beats a secondary base's; and the child's own class body beats both."

	self assert: (self resultAt: 'unreassigned_attr_still_inherits') equals: 'ok'.
	self assert: (self resultAt: 'leftmost_base_wins') equals: 'ok'.
	self assert: (self resultAt: 'own_body_outranks_bases') equals: 'ok'.
%

category: 'Grail-Tests'
method: SubclassAttrShadowTestCase
testMutableAttrIsSharedNotCopied
	"CPython does not copy a base's attribute into a subclass at all, so a
	mutable one is the SAME OBJECT seen from both.  Grail's copy-down stores the
	value, not a clone, so mutating it through the merged class is visible on the
	base -- asserted rather than assumed, because a fix that cloned instead of
	referencing would pass every other check here."

	self assert: (self resultAt: 'mutable_attr_is_shared_not_copied') equals: 'ok'.
%
