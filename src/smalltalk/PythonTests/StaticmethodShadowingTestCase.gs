! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StaticmethodShadowingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StaticmethodShadowingTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StaticmethodShadowingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StaticmethodShadowingTestCase
!
! A @staticmethod (or @classmethod) that SHADOWS a class-body attribute
! inherited from a base class.  Drives tests/python/staticmethod_shadowing.py,
! nine checks, all agreeing with CPython 3.14.6.
!
! THE DEFECT: accessing such a method INVOKED it.
!
!     class Base:   mk = None
!     class Shadow(Base):
!         @staticmethod
!         def mk(): return 42
!
!     Shadow().mk   ->  42    (CPython: the function)
!     Shadow.mk     ->  42
!
! and the caller's own ``()'' then failed on whatever the body returned --
! ``'SmallInteger' object is not callable'', or for the real case that found
! this, ``a EventLoop class does not understand #'__call__'''.
!
! WHY: Grail splits what CPython keeps in one __dict__.  A class-body ``x = v''
! becomes a getter/setter accessor PAIR on the metaclass; a class-side method
! becomes a method on the metaclass too.  The readers told them apart by asking
! whether BOTH halves existed anywhere in the metaclass CHAIN -- and the two
! halves can come from different classes.  The base supplies ``mk:'', the
! subclass's staticmethod supplies ``mk'', both are found, and the reader
! concludes data attribute and performs the getter.
!
! ___classBodyAttrOutrankedByMethod___'s own comment asserted the premise that
! broke: "@classmethod/@staticmethod have no unary setter". True of one class;
! false of a chain. That comment is corrected in place.
!
! FOUND VIA test.test_asyncio.test_taskgroups, whose TestEagerTaskTaskGroup
! writes ``@staticmethod def loop_factory()'' over the ``loop_factory = None''
! it inherits from IsolatedAsyncioTestCase: 48 tests failing on an attribute
! access with nothing to do with asyncio.
!
! STILL OPEN, same family, different mechanism -- deliberately not fixed here
! and not asserted by the fixture: the same shadowing with a MULTI-ARGUMENT
! class-side method. Those compile to a keyword selector (``mk:_:''), so no
! unary getter exists, these readers never fire at all, and lookup falls
! through to the inherited data value:
!
!     Shadow.mk(1, 2)  ->  'NoneType' object is not callable
!
! Verified pre-existing: it fails identically with this fix reverted.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: StaticmethodShadowingTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'staticmethod_shadowing' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/staticmethod_shadowing.py')
		name: 'staticmethod_shadowing'.
	probe := testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: StaticmethodShadowingTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- Access must not invoke

category: 'Grail-Tests - Access Does Not Invoke'
method: StaticmethodShadowingTestCase
testAShadowingStaticmethodIsAnsweredNotCalled
	"Off the CLASS -- one of the two readers that had the defect."

	self assert: (self at: 'a_shadowing_staticmethod_is_answered_not_called')
		equals: true
%

category: 'Grail-Tests - Access Does Not Invoke'
method: StaticmethodShadowingTestCase
testAShadowingStaticmethodIsAnsweredViaAnInstanceToo
	"Off an INSTANCE -- the other reader.  Both had it, so both are pinned:
	fixing one would have moved the wrong answer rather than removed it."

	self assert: (self at: 'a_shadowing_staticmethod_is_answered_via_an_instance_too')
		equals: true
%

! ------------------- And it still calls

category: 'Grail-Tests - Calling Still Works'
method: StaticmethodShadowingTestCase
testAShadowingStaticmethodStillCallsCorrectly
	self assert: (self at: 'a_shadowing_staticmethod_still_calls_correctly')
		equals: true
%

category: 'Grail-Tests - Calling Still Works'
method: StaticmethodShadowingTestCase
testAShadowingStaticmethodCallsViaAnInstance
	self assert: (self at: 'a_shadowing_staticmethod_calls_via_an_instance')
		equals: true
%

category: 'Grail-Tests - Calling Still Works'
method: StaticmethodShadowingTestCase
testAShadowingClassmethodWorksToo
	"The same code path names @classmethod, so it is checked rather than
	assumed to follow."

	self assert: (self at: 'a_shadowing_classmethod_works_too') equals: true
%

! ------------------- The MRO rule, and no collateral damage

category: 'Grail-Tests - Precedence'
method: StaticmethodShadowingTestCase
testTheSubclassOutranksTheInheritedAttribute
	self assert: (self at: 'the_subclass_outranks_the_inherited_attribute')
		equals: true
%

category: 'Grail-Tests - Precedence'
method: StaticmethodShadowingTestCase
testTheBaseAttributeIsUndisturbed
	"The branch being gated exists to serve ordinary class-body data
	attributes; narrowing it must not stop them working."

	self assert: (self at: 'the_base_attribute_is_undisturbed') equals: true
%

category: 'Grail-Tests - Precedence'
method: StaticmethodShadowingTestCase
testAnUnshadowedStaticmethodIsUnaffected
	self assert: (self at: 'an_unshadowed_staticmethod_is_unaffected') equals: true
%

category: 'Grail-Tests - Precedence'
method: StaticmethodShadowingTestCase
testAMultiArgumentStaticmethodIsUnaffected
	"The NON-shadowing multi-arg case.  The shadowing one is still broken and
	is documented in the class comment rather than asserted here."

	self assert: (self at: 'a_multi_argument_staticmethod_is_unaffected')
		equals: true
%
