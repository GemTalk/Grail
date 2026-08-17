! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperProxyAttrsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperProxyAttrsTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperProxyAttrsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperProxyAttrsTestCase
!
! A SUPER OBJECT'S OWN ATTRIBUTES, EQUALITY, AND COPYABILITY.
!
! Three gaps that interlock, which is the whole interest of this change:
!
! 1. ITS OWN STATE -- __self__, __thisclass__, __self_class__.  These describe
!    the PROXY rather than naming something to resolve on the parent chain, so
!    they must be answered before the walk.  Grail ran the walk and reported
!    ``'super' object has no attribute '__self__'''.
!
! 2. EQUALITY WITH THE OBJECT'S OWN BOUND METHOD.  Attribute access on a super
!    object resolves against the PARENT chain, so ``s.__reduce__'' IS the
!    underlying object's reduce -- CPython returns the very same function, so the
!    two compare equal.  A super object must not make the pickling protocol look
!    different from the object's own.  Grail returned a SuperBoundMethod, which
!    defined no equality at all, so the comparison fell to identity and was False
!    for every name.
!
! 3. COPYABILITY WITHOUT OWNING THE COPY PROTOCOL.  Here is the interlock: super
!    must be copyable while defining NO __reduce__ / __copy__ / __deepcopy__ of
!    its own -- because by (2) those names belong to the underlying object, and
!    test_special_methods asserts all five are absent.  CPython squares that
!    circle by registering a reductor in ``copyreg.dispatch_table``, which is
!    keyed by TYPE and so invisible to attribute lookup.  Grail's dispatch table
!    was empty, so deepcopy took the generic path -- and because a super object's
!    state lives in Smalltalk INSTANCE VARIABLES rather than a Python __dict__,
!    the generic reconstruction produced a NEW but EMPTY proxy.  ``type(u) is
!    type(s)'' and ``u is not s'' both held; the emptiness surfaced only when a
!    method was called on the copy.
!
! ONE MAPPING ENTRY, THREE ANSWERS.  ``Super'' is the one Grail-DEFINED built-in
! type whose Smalltalk name cannot match its Python name, because ``super'' is a
! Smalltalk pseudo-variable.  Adding it to ___pythonBuiltinTypeName___ fixes
! type(s).__name__ (``super''), __module__ (``builtins'' -- that method's first
! test is literally ``___pythonBuiltinTypeName___ notNil''), and the type name in
! super's own TypeError messages, which is why it belongs in the table rather
! than being spelled out three times.
!
! THE ENV BOUNDARY, AGAIN.  The private accessors __eq__ reaches with @env0:
! sends were first written into a section under ``set compile_env: 1'', leaving
! them unreachable from there: ``a SuperBoundMethod does not understand #'_obj''',
! escaping as an uncatchable Smalltalk error.  Worth naming because it is the
! failure mode that hides: an @env0: send to an env-1 method does not fail at
! compile time.
!
! WHAT IS STILL NOT FIXED -- test_pickling.  Grail's pickle.py does not consult
! copyreg.dispatch_table at all (only copy.py does), so pickling a super object
! never reaches the reductor: the unpickler builds the proxy EMPTY and then asks
! it for __setstate__.  That arrives at Super >> ___pyAttrLoad___: with a nil
! cls, whose walk began ``cls superClass'' -- an uncatchable env-0
! MessageNotUnderstood.  A nil-cls guard now answers a catchable AttributeError
! instead, so that test fails as a TEST rather than escaping; teaching pickle.py
! the dispatch table is separate work.
!
! Measured: test_super 11 -> 9 failing (test_special_methods, test_deep_copying).
! No regression across the corpus.  Every expectation is CPython 3.14.6's own
! output for tests/python/super_proxy_attrs.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperProxyAttrsTestCase removeAllMethods.
SuperProxyAttrsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperProxyAttrsTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_proxy_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/super_proxy_attrs.py')
		name: 'super_proxy_attrs'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: SuperProxyAttrsTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the proxy's own state ---

category: 'Grail-Tests - Proxy state'
method: SuperProxyAttrsTestCase
testTheProxyReportsItsSelfAndThisClass
	"These describe the proxy, so they must be answered BEFORE the parent walk --
	which is why they sit beside the existing __class__ interception rather than
	anywhere else."

	self assert: (self at: 'self_is_the_object') equals: true.
	self assert: (self at: 'thisclass_is_the_named_class') equals: true.
	self assert: (self at: 'self_class_is_the_objects_type') equals: true.
%

category: 'Grail-Tests - Proxy state'
method: SuperProxyAttrsTestCase
testAClassReceiverMakesSelfAndSelfClassCoincide
	"``super(C, E)'' has __self__ E and __self_class__ E.  Stated separately
	because __self_class__ is type(obj) for every OTHER receiver, so a naive
	``obj class'' answers the metaclass here."

	self assert: (self at: 'class_form_self') equals: true.
	self assert: (self at: 'class_form_self_class') equals: true.
%

! --- equality ---

category: 'Grail-Tests - Equality'
method: SuperProxyAttrsTestCase
testTheProxysPicklingHandlesEqualTheObjectsOwn
	"Attribute access on a super object resolves against the PARENT chain, so
	``s.__reduce__'' is the underlying object's reduce and CPython returns the
	very same function.  A super object must not make the pickling protocol look
	different from the object's own."

	self assert: (self at: 'reduce_equals_objects') equals: true.
	self assert: (self at: 'reduce_ex_equals_objects') equals: true.
	self assert: (self at: 'getstate_equals_objects') equals: true.
%

category: 'Grail-Tests - Equality'
method: SuperProxyAttrsTestCase
testTheClassFormComparesAgainstAnUnboundHandle
	"test_special_methods runs its whole body twice -- ``for e in E(), E'' -- and
	the second pass compares against ``E.__reduce__'', which does not bind.
	Grail spells bound and unbound handles with different classes, so this is a
	second code path in __eq__ and not a repeat of the test above."

	self assert: (self at: 'class_form_reduce_equals') equals: true.
%

category: 'Grail-Tests - Equality'
method: SuperProxyAttrsTestCase
testTheProxyDoesNotOwnTheCopyProtocol
	"The other half of the interlock, and the reason the reductor had to be
	registered out-of-band: all five of these must be ABSENT, so super cannot be
	made copyable by defining __deepcopy__ or __reduce__ on it."

	#('absent___getnewargs__' 'absent___getnewargs_ex__' 'absent___setstate__'
		'absent___copy__' 'absent___deepcopy__')
		do: [:k | self assert: (self at: k) equals: true].
%

! --- copying ---

category: 'Grail-Tests - Copying'
method: SuperProxyAttrsTestCase
testAShallowCopyIsTheProxyItself
	"CPython's asymmetry, not an accident: copy.copy(s) IS s, while deepcopy
	builds a new proxy.  Already held before this change; asserted as the guard
	that registering a reductor did not disturb it."

	self assert: (self at: 'shallow_copy_is_identical') equals: true.
%

category: 'Grail-Tests - Copying'
method: SuperProxyAttrsTestCase
testADeepCopyIsANewProxyOverACopiedSelf
	"The reductor answers ``(super, (thisclass, self))'', so deepcopy recurses
	into the ARGUMENTS -- which is what deep-copies __self__ while leaving
	__thisclass__ the same class object."

	self assert: (self at: 'deep_copy_is_new') equals: true.
	self assert: (self at: 'deep_copy_same_type') equals: true.
	self assert: (self at: 'deep_copy_self_is_copied') equals: true.
	self assert: (self at: 'deep_copy_state_copied') equals: true.
	self assert: (self at: 'deep_copy_thisclass_shared') equals: true.
%

category: 'Grail-Tests - Copying'
method: SuperProxyAttrsTestCase
testADeepCopiedProxyStillDispatches
	"The check that would have caught the old behaviour.  The generic path
	produced a proxy that passed ``type(u) is type(s)'' and ``u is not s'' while
	being EMPTY -- so only calling a method through it reveals anything."

	self assert: (self at: 'deep_copy_dispatches') equals: true.
	self assert: (self at: 'deep_copy_self_type') @env0:asString equals: 'E'.
%

! --- the type itself ---

category: 'Grail-Tests - Type identity'
method: SuperProxyAttrsTestCase
testTheSuperTypeNamesItselfAsPythonDoes
	"``Super'' cannot be named ``super'' in Smalltalk -- it is a pseudo-variable
	-- so the Python name comes from ___pythonBuiltinTypeName___.  One entry
	answers three questions: the type name, __module__ (whose first test is
	``___pythonBuiltinTypeName___ notNil''), and the type name super's own
	TypeError messages print."

	self assert: (self at: 'type_name') @env0:asString equals: 'super'.
	self assert: (self at: 'type_module') @env0:asString equals: 'builtins'.
%
