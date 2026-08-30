! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperNewBindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperNewBindingTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperNewBindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperNewBindingTestCase
!
! ``super().__new__(cls, a, b)'' BOUND THE CLASS TWICE.  The parent saw
! ``(cls, cls, a, b)'' and answered CPython's own arity complaint about a call
! Grail had malformed: ``A.__new__() takes 2 positional arguments but 3 were
! given''.  Two plain classes reproduce it; nothing about it was specific to
! namedtuples, though a namedtuple is where it was costing something --
! urllib3's ``Url'' is a typing.NamedTuple subclass whose __new__ normalises and
! delegates, so ``import kaggle'' worked, ``authenticate'' worked, and the first
! network call died on ``Url() takes 7 positional arguments but 8 were given''.
!
! WHAT DISTINGUISHES THE TWO FORMS -- the whole content of the fix, and the
! reason it was deferred twice before being taken on.  The metaclass idiom
!
!     class Meta(type):
!         def __new__(mcls, name, bases, ns):
!             return super().__new__(mcls, name, bases, ns)
!
! is spelled IDENTICALLY at the call site: n+1 positionals for a def that
! declares n parameters after the class.  So the call site cannot tell them
! apart, and a fix that stops passing the leading class breaks every metaclass
! in the corpus.
!
! The TARGET tells them apart, because Grail spells __new__ with two calling
! conventions on its two sides:
!
!   * a class-body ``def __new__(cls, a, b)'' compiles INSTANCE-side as
!     ``__new__:_:'' with ``cls'' as the Smalltalk RECEIVER -- one argument
!     fewer than the Python call wrote;
!   * Grail's built-in and kernel __new__ methods are CLASS-side and written to
!     CPython's convention, taking the class as a real first argument --
!     ``object class >> __new__: cls'', ``type class >> __new__: mcls _: name
!     _: bases _: ns'', ``bool class >> __new__: cls _: obj''.
!
! The lookup resolved BOTH sides with the class-side arity, so the instance side
! was always off by one.  Resolving both with the instance arity would merely
! have moved the breakage onto the metaclasses.  So the lookup now carries ONE
! ARITY FAMILY PER SIDE -- Super >> _lookupMethodAndSideFirstOf:metaSelectors:
! probes ``__new__:_:'' instance-side and ``__new__:_:_:'' class-side for the
! same three-argument call -- and SuperBoundMethod strips the leading class back
! off and makes it the receiver when, and only when, the hit came from the
! instance side.  Which side it came from was already being reported, for an
! unrelated reason (see SuperLookupTestCase); this is the second decision that
! turns out to need it.
!
! The varargs form ``___new__:kw:'' sits at the same position in both families
! and needs no shift: the instance-side one is a generated forwarder expecting
! the arguments AFTER cls, and ``object class >> ___new__:kw:'' expects cls
! included.  Each already agrees with the side it is found on -- which is the
! same observation as the fix, arrived at from the other end.
!
! THE NEGATIVE CONTROL IS HALF THE TESTS.  testMetaclassNewStillGetsTheClass and
! testAMetaclassInheritingAMetaclass fail for a fix that over-corrects, and the
! built-in-base tests (str / int / tuple) fail for one that strips on the class
! side.  All of them passed BEFORE the fix and must still pass after it; they are
! here to say what a wrong fix would have cost, not to record a repair.
!
! Every expectation is CPython 3.14's own output for
! tests/python/super_new_binding.py, which self-verifies under CPython.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperNewBindingTestCase removeAllMethods.
SuperNewBindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperNewBindingTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_new_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_new_binding.py')
		name: 'super_new_binding'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: SuperNewBindingTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the defect ---

category: 'Grail-Tests - Instance side'
method: SuperNewBindingTestCase
testSuperNewDoesNotBindTheClassTwice
	"The repro, in two plain classes.  ``A.__new__() takes 2 positional
	arguments but 3 were given'' before the fix -- Grail's own complaint about
	a call Grail had malformed by passing cls as both the receiver and the
	first argument."

	self assert: (self at: 'plain_pair') @env0:asString equals: '(1, 2)'.
	self assert: (self at: 'plain_class') @env0:asString equals: 'B'.
%

category: 'Grail-Tests - Instance side'
method: SuperNewBindingTestCase
testEveryLevelOfTheChainSeesTheMostDerivedClass
	"Three levels, each forwarding.  The receiver has to be the class the CALL
	passed -- the most derived one -- and not the class whose __new__ is
	running, which is what makes ``strip the leading argument and use it'' the
	rule rather than ``keep super()'s own object''."

	self assert: (self at: 'chain_value') equals: 12.
	self assert: (self at: 'chain_class') @env0:asString equals: 'D3'.
%

category: 'Grail-Tests - Instance side'
method: SuperNewBindingTestCase
testKeywordAndSplatCallSitesTakeTheSameCorrection
	"A keyword argument routes to the varargs selector ``___new__:kw:'' and a
	splat fixes its arity only at run time -- two more resolution paths through
	the same lookup, and the varargs selector is the one that exists on BOTH
	sides with different conventions."

	self assert: (self at: 'kwargs') @env0:asString equals: '(1, 9)'.
	self assert: (self at: 'splat') @env0:asString equals: '(1, 2, 3)'.
%

category: 'Grail-Tests - Instance side'
method: SuperNewBindingTestCase
testTheExplicitTwoArgumentSuperFormToo
	"``super(G2, cls).__new__(cls, a)'' reaches the same proxy by a different
	codegen path.  Pinned because the zero-argument and two-argument rewrites
	are separate emissions in CallAst and only one of them was exercised by the
	repro."

	self assert: (self at: 'explicit_super') @env0:asString equals: '(7, ''G2'')'.
%

category: 'Grail-Tests - Instance side'
method: SuperNewBindingTestCase
testTheClassPassedIsTheClassConstructed
	"``super().__new__(H2, a)'' from inside H3 builds an H2.  super()'s bound
	object and the argument coincide for every ordinary call, so this is the
	one check that says WHICH of the two the receiver comes from."

	self assert: (self at: 'constructs_the_named_class') @env0:asString
		equals: 'H2'.
%

! --- the negative control: the forms that already worked ---

category: 'Grail-Tests - Class side'
method: SuperNewBindingTestCase
testMetaclassNewStillGetsTheClass
	"THE CONTROL.  ``super().__new__(mcls, name, bases, ns)'' resolves
	class-side onto ``type >> __new__:_:_:_:'', which takes the metaclass as a
	real argument and needs all four.  A fix that stopped passing the leading
	class everywhere would break exactly this, and that is why the naive
	correction was deferred twice rather than shipped."

	self assert: (self at: 'metaclass_stamped') equals: true.
	self assert: (self at: 'metaclass_type') @env0:asString equals: 'Meta'.
%

category: 'Grail-Tests - Class side'
method: SuperNewBindingTestCase
testAMetaclassInheritingAMetaclass
	"Both conventions in one call chain: M2's super() lands on M1's
	PYTHON-written __new__ (instance-side, stripped) and M1's lands on type's
	(class-side, not stripped).  The class is stamped by both, so a rule
	applied uniformly in either direction fails here."

	self assert: (self at: 'metaclass_chain') @env0:asString
		equals: '(True, True, ''M2'')'.
%

category: 'Grail-Tests - Class side'
method: SuperNewBindingTestCase
testObjectNewThroughSuperIsUnchanged
	"``super().__new__(cls)'' with no further arguments must still find
	``object class >> __new__:'' -- the class-side form, with the class as its
	argument -- rather than an instance-side zero-argument __new__.  The
	commonest super().__new__ in the corpus, and the one the fix rewrites the
	resolution of without meaning to change."

	self assert: (self at: 'object_new_class') @env0:asString equals: 'C0'.
%

category: 'Grail-Tests - Class side'
method: SuperNewBindingTestCase
testBuiltinBasesAreUntouched
	"str / int / tuple subclasses delegate to a CLASS-side built-in __new__ that
	takes the class explicitly.  They fail for a fix that strips on both sides,
	which is the other way to get this wrong."

	self assert: (self at: 'str_sub') @env0:asString equals: '(''AB'', ''S1'')'.
	self assert: (self at: 'int_sub') @env0:asString equals: '(6, ''I1'')'.
	self assert: (self at: 'tuple_sub') @env0:asString
		equals: '((1, 2), ''TDerived'')'.
%

! --- the case that motivated it ---

category: 'Grail-Tests - Namedtuple'
method: SuperNewBindingTestCase
testANamedtupleSubclassDelegatesWithSuper
	"urllib3's ``Url'': a namedtuple subclass whose __new__ normalises its
	arguments and then delegates.  This is the last blocker for kaggle, which
	imported and authenticated and then failed its first network call with
	``Url() takes 7 positional arguments but 8 were given'' -- the same defect
	at arity 7."

	self assert: (self at: 'url_scheme') @env0:asString equals: 'http'.
	self assert: (self at: 'url_values') @env0:asString
		equals: '(''http'', ''example.com'')'.
	self assert: (self at: 'url_class') @env0:asString equals: 'Url'.
%
