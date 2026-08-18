! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassSubclassesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassSubclassesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassSubclassesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassSubclassesTestCase
!
! ``cls.__subclasses__()'' did not exist, and could not simply be added, because
! Grail's classes are ANONYMOUS.  Class.gs's ___subclass___ creates every Python
! class with ``inDictionary: nil'', and GemStone's own ``Behavior>>subclasses''
! is ``ClassOrganizer new subclassesOf: self'' -- a scan of the SYMBOL
! DICTIONARIES.  So the machinery already present answered a correct list for
! the Smalltalk-defined Python classes and an EMPTY one for every class any
! Python module defines, which is all of them.
!
! That was not only a missing feature.  functools' ABC _compose_mro walk uses the
! same computation to find the concrete classes under an abstract one, so
! ``class MySeq(Sequence)'' in a module was invisible to the walk whose entire
! purpose is finding exactly that.  Both now read importlib's subclass registry,
! written at ___subclass___ -- the one point every Python class creation passes
! through, ``type(name, bases, ns)'' included.
!
! THE REGISTRY IS SESSION-LOCAL, matching ___miRegistry___ and
! ___mroOverrideRegistry___, and it holds a STRONG reference where CPython's
! tp_subclasses list is weak: a test building throwaway classes in a loop keeps
! them alive until logout.  That is the tradeoff the other two registries already
! make, and a session is one test module long.
!
! BOTH SPELLINGS are asserted.  pydoc's docclass reaches for the UNBOUND one --
! ``type.__subclasses__(object)'', where ``object'' is its local name for the
! class being documented -- and that could not come from the same place as the
! bound one: reading __subclasses__ off the ``type'' CLASS OBJECT finds the
! Behavior method on type's own metaclass chain and binds the receiver to
! ``type'', so the explicit class arrived as a surplus argument.  The read has to
! answer the DESCRIPTOR, which is what CPython's type.__subclasses__ is.
!
! Source fixture: tests/python/class_subclasses.py
! ===============================================================================

doit
ClassSubclassesTestCase comment:
'Tests cls.__subclasses__() and its unbound spelling type.__subclasses__(cls):
direct subclasses only, module-level and function-local classes alike, and a
multiple-inheritance class visible from its SECONDARY base.  Drives
tests/python/class_subclasses.py.'
%

doit
ClassSubclassesTestCase removeAllMethods.
ClassSubclassesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassSubclassesTestCase
setUp
	"Reload tests/python/class_subclasses.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_subclasses' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_subclasses.py')
		name: 'class_subclasses'.
%

category: 'Grail-Private'
method: ClassSubclassesTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests'
method: ClassSubclassesTestCase
testAClassNamesItsDirectSubclasses
	"Three of them, and the third is the point: ``Local'' is defined inside a
	function, so it lives in no symbol dictionary and GemStone's own
	``subclasses'' scan could never have found it.  Before the registry this
	whole list was empty."

	self assert: (self resultAt: 'direct') asString
		equals: '[''K1'', ''K2'', ''Local'']'.
	self assert: (self resultAt: 'function_local_is_listed') asString equals: 'True'.
%

category: 'Grail-Tests'
method: ClassSubclassesTestCase
testOnlyDIRECTSubclassesAreNamed
	"A grandchild belongs to its own parent's list, not its grandparent's -- so
	this is not the transitive walk that would be the easy thing to write."

	self assert: (self resultAt: 'grandchild_not_direct') asString equals: 'False'.
	self assert: (self resultAt: 'grandchild_of_k1') asString equals: '[''GrandKid'']'.
	self assert: (self resultAt: 'leaf_is_empty') asString equals: '[]'.
%

category: 'Grail-Tests'
method: ClassSubclassesTestCase
testASecondaryBaseSeesTheClassToo
	"Grail chains a multiple-inheritance class under its PRIMARY base alone, so
	M2 can only find Both through importlib's MI registry -- a different source
	from the one M1 is satisfied by.  This is the case collections.abc depends
	on: Collection declares (Sized, Iterable, Container) and is chained under
	Sized, and _compose_mro's job is finding it from Container."

	self assert: (self resultAt: 'primary_base') asString equals: '[''Both'']'.
	self assert: (self resultAt: 'secondary_base') asString equals: '[''Both'']'.
%

category: 'Grail-Tests'
method: ClassSubclassesTestCase
testTheUnboundSpellingTakesTheClassExplicitly
	"``type.__subclasses__(C)'' is what pydoc calls.  It must agree with
	``C.__subclasses__()'' -- they reach the answer by different routes, the
	descriptor on ``type'' versus the method on Behavior."

	self assert: (self resultAt: 'unbound') asString
		equals: '[''K1'', ''K2'', ''Local'']'.
	self assert: (self resultAt: 'unbound_agrees') asString equals: 'True'.
%

category: 'Grail-Tests'
method: ClassSubclassesTestCase
testReimportingTheModuleDoesNotGrowTheList
	"The failure this registry was always going to have, and did.  Grail
	re-imports a module by re-executing its body against CANONICALLY REUSED
	classes: ``class Base'' comes back as the SAME object across loads, while a
	class defined inside a function has no canonical name and is minted fresh
	each time.  So the reused base collected a new copy of the local class on
	every load -- five loads answered
	``[K1, K2, Local, Local, Local, Local, Local]''.

	CPython never has to think about this because tp_subclasses holds WEAK
	references and superseded classes simply die.  This GemStone has no weak
	collection to borrow, so importlib drops a module's registrations when its
	body is about to re-run, and the re-run puts back everything it defines --
	including, and this is the part that is easy to miss, the classes it REUSES
	rather than creates.

	Written as an explicit reload because the per-test setUp already reloads:
	that made the whole suite depend on which test happened to run last, which
	is how the bug surfaced in the first place -- as a failure in an unrelated
	assertion."

	| before after |
	before := (self resultAt: 'direct') asString.
	self setUp.
	self setUp.
	after := (self resultAt: 'direct') asString.
	self assert: before equals: '[''K1'', ''K2'', ''Local'']'.
	self assert: after equals: before.
%

category: 'Grail-Tests'
method: ClassSubclassesTestCase
testTheAnswerIsAListWithoutDuplicates
	"A list, as CPython's is, because callers index and sort it.  The dedup
	matters because the answer is a UNION of three sources -- the dictionary
	scan, the subclass registry and the MI registry -- and a class can appear in
	more than one."

	self assert: (self resultAt: 'is_a_list') asString equals: 'True'.
	self assert: (self resultAt: 'no_duplicates') asString equals: 'True'.
%

set compile_env: 0
