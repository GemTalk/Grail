! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DefaultObjectReprTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DefaultObjectReprTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DefaultObjectReprTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DefaultObjectReprTestCase
!
! CPython's object.__repr__ names the object:
!
!     <module.QualName object at 0x7f9c1c0d3e50>
!
! Grail printed ``<Foo object>'' -- neither the module nor the address.  That
! was not merely terse, it was wrong in a way tests can rely on: two DISTINCT
! objects of one class had EQUAL reprs.
!
! CPython object_repr, which Object>>__repr__ now mirrors:
!
!     if (mod != NULL && !equal(mod, "builtins"))
!         "<%U.%U object at %p>" % (mod, qualname, self)
!     else
!         "<%s object at %p>" % (tp_name, self)
!
! so the module qualifies the name unless it is builtins, the name is the
! __qualname__ (an inner class reads ``Outer.Inner''), and the address is
! id(self) -- builtins id:, i.e. identityHash -- in hex.  Either part is used
! only when it is a STRING, which object_repr is explicit about and which earns
! its keep here: Grail's BoundMethod answers an UnboundMethod for __module__,
! and without the check it printed ``<anUnboundMethod.BoundMethod object at
! 0x...>''.
!
! ONE thing depended on the old repr comparing equal across objects.  CPython
! gives operator's attrgetter / itemgetter / methodcaller a repr built from
! their CONTENTS, which is what makes ``repr(pickle.loads(pickle.dumps(f))) ==
! repr(f)'' hold -- test_operator asserts exactly that.  Grail's had none, so
! they fell to object.__repr__ and passed only for as long as the default repr
! had no address to differ in; they carry CPython's repr now.
!
! Drives tests/python/default_object_repr.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DefaultObjectReprTestCase removeAllMethods.
DefaultObjectReprTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DefaultObjectReprTestCase
setUp
	"Reload tests/python/default_object_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'default_object_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/default_object_repr.py')
		name: 'default_object_repr'.
%

category: 'Grail-Private'
method: DefaultObjectReprTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The default repr names the object'
method: DefaultObjectReprTestCase
testModuleQualifiedNameAndAddress
	"Asserted by shape, since the address is the object's own -- which is why
	CPython's tests match a default repr with assertRegex."

	self assert: (self resultAt: 'module_qualified').
	self assert: (self resultAt: 'ends').
	self assert: (self resultAt: 'address_is_id').
%

category: 'Grail-Tests - The default repr names the object'
method: DefaultObjectReprTestCase
testTwoObjectsOfOneClassNoLongerReadAlike
	"The consequence that matters: an equality test between the reprs of two
	distinct objects used to pass."

	self assert: (self resultAt: 'distinct').
	self assert: (self resultAt: 'same_object').
	self assert: (self resultAt: 'str_matches').
%

category: 'Grail-Tests - The default repr names the object'
method: DefaultObjectReprTestCase
testTheNameIsTheQualname
	"A nested class carries its enclosing class, as __qualname__ does."

	self assert: (self resultAt: 'nested').
%

category: 'Grail-Tests - What is left off'
method: DefaultObjectReprTestCase
testBuiltinsIsNotPrinted
	"CPython's else branch -- object() is ``<object object at 0x...>'', not
	``<builtins.object object at 0x...>''."

	self assert: (self resultAt: 'builtins').
	self assert: (self resultAt: 'builtins_module') asString equals: 'builtins'.
%

category: 'Grail-Tests - What is left off'
method: DefaultObjectReprTestCase
testANonStringModuleIsDropped
	"``else if (!PyUnicode_Check(mod)) mod = NULL''.  Grail's BoundMethod
	answers an UnboundMethod for __module__, so without the check it printed
	``<anUnboundMethod.BoundMethod object at 0x...>''."

	self assert: (self resultAt: 'bound_method').
%

category: 'Grail-Tests - What is left off'
method: DefaultObjectReprTestCase
testAWrittenReprStillWins
	"Only the DEFAULT changes."

	self assert: (self resultAt: 'own_repr') asString equals: 'mine'.
%

category: 'Grail-Tests - operator reprs by content'
method: DefaultObjectReprTestCase
testTheThreeGettersReprTheirContents
	"CPython's spelling exactly: module, class name, and the held arguments."

	self assert: (self resultAt: 'attrgetter') asString
		equals: 'operator.attrgetter(''name'')'.
	self assert: (self resultAt: 'attrgetter_multi') asString
		equals: 'operator.attrgetter(''a'', ''b.c'')'.
	self assert: (self resultAt: 'itemgetter') asString
		equals: 'operator.itemgetter(0)'.
	self assert: (self resultAt: 'itemgetter_multi') asString
		equals: 'operator.itemgetter(1, 2)'.
	self assert: (self resultAt: 'methodcaller') asString
		equals: 'operator.methodcaller(''upper'')'.
	self assert: (self resultAt: 'methodcaller_args') asString
		equals: 'operator.methodcaller(''m'', 1, x=2)'.
%

category: 'Grail-Tests - operator reprs by content'
method: DefaultObjectReprTestCase
testAGetterReprsTheSameAfterAPickleRoundtrip
	"What test_operator asserts, and the reason a content repr is needed rather
	than merely nicer: the roundtripped getter is a DIFFERENT object."

	self assert: (self resultAt: 'roundtrips') asString equals: 'True;True;True;True'.
%
