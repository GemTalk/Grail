! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassAttrSingleHomeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassAttrSingleHomeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassAttrSingleHomeTestCase
!
! A CLASS ATTRIBUTE HAS ONE HOME: THE PER-CLASS ___dynInstVars___ HOLDER.
!
! ClassDefAst still compiles a Grail-Class Attrs accessor pair for every
! class-body assignment -- the pair is the PROTOCOL the loader, __set_name__,
! dataclasses and Enum key on -- but the getter answers the holder (own, then
! each superclass's) and the setter stores into the receiver's own holder.  No
! classInstVar per attribute.  See docs/Class_Attribute_Single_Home.md for why:
! a metaclass can never grow a slot, so an edit that ADDED a class attribute
! made importlib decline identity reuse and re-mint the class, stranding every
! persisted instance.  tests/scripts/runCanonicalClassTest.gs pins that half
! (revision 3, "ADDED ATTRIBUTE: the class KEEPS its identity").
!
! This case pins the SEMANTIC half through tests/python/class_attr_single_home.py,
! a self-running fixture (10/10 under CPython, gated by check_python_fixtures.sh):
! a parent's later store reaches a subclass that never redeclared the name,
! ``del Cls.x'' removes a class-body attribute so hasattr answers False, vars(cls)
! is cls.__dict__, and a reserved kernel slot name (``name'') needs no mangling.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassAttrSingleHomeTestCase removeAllMethods.
ClassAttrSingleHomeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassAttrSingleHomeTestCase
setUp
	"Reload tests/python/class_attr_single_home.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_attr_single_home' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_single_home.py')
		name: 'class_attr_single_home'.
%

category: 'Grail-Private'
method: ClassAttrSingleHomeTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Private'
method: ClassAttrSingleHomeTestCase
assertCheck: key
	"Every fixture check answers Python True on success and False -- or a
	non-boolean -- on failure; print what it answered, not just that it failed."

	| v |
	v := self resultAt: key.
	self assert: v == true
		description: key , ' answered ' , v printString.
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testInheritedRead
	self assertCheck: 'check_inherited_read'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testParentChangeReachesSubclass
	"The row the classInstVar design got wrong: a subclass held a build-time
	COPY of the parent's value, so ``A.x = 99'' never reached ``B.x''."

	self assertCheck: 'check_parent_change_reaches_subclass'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testSubclassStoreShadowsOnlySubclass
	self assertCheck: 'check_subclass_store_shadows_only_subclass'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testSubclassDelUncoversParent
	self assertCheck: 'check_subclass_del_uncovers_parent'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testDelBodyAttribute
	"``del D.k'' on a class-body attribute removes the holder entry AND the
	class's own accessor pair, so hasattr answers False and a second del raises.
	The slot-backed pair could not be deleted at all."

	self assertCheck: 'check_del_body_attribute'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testDelInheritedRaises
	self assertCheck: 'check_del_inherited_raises'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testVarsIsClassDict
	"vars(cls) used to enumerate the METACLASS's instVars -- the kernel's
	``format'', ``superClass'', ... -- and listed the class body's names only
	because they happened to be classInstVars too."

	self assertCheck: 'check_vars_is_class_dict'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testClassDictIsOwnOnly
	self assertCheck: 'check_class_dict_is_own_only'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testReservedNameIsolated
	self assertCheck: 'check_reserved_name_isolated'
%

category: 'Grail-Tests'
method: ClassAttrSingleHomeTestCase
testTypeBuiltClassInherits
	self assertCheck: 'check_type_built_class_inherits'
%
