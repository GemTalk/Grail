! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubclassNameAttrTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubclassNameAttrTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubclassNameAttrTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubclassNameAttrTestCase
!
! A Python class with a bare ``name: str'' annotation triggers Grail's
! auto-generated ``name'' classInstVar accessor + setter pair on the
! metaclass.  Smalltalk's ``Behavior'' / ``Class'' kernel metaclass
! already has a ``name'' instVar (the class's printed name).
! Pre-fix, the ``___inheritClassAttrs___'' inheritance copy treated
! the parent's metaclass ``name'' slot as a Python class attribute
! and propagated it to subclasses — overwriting their actual class
! name.
!
! Result in jinja2.nodes: ``class _FilterTestCommon(Expr): name: str''
! and ``class Filter(_FilterTestCommon): ...'' → Filter.__name__
! returned '_FilterTestCommon'.  Visitor dispatch by name failed
! silently and the compiler couldn't distinguish Filter from Test.
!
! Fix: exclude kernel metaclass instVar names (``name'', ``category'',
! ``superClass'', ...) from the inheritance copy in
! ``importlib >> ___inheritClassAttrs___:''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SubclassNameAttrTestCase removeAllMethods.
SubclassNameAttrTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SubclassNameAttrTestCase
setUp
	"Reload tests/python/subclass_name_attr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'subclass_name_attr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subclass_name_attr.py')
		name: 'subclass_name_attr'.
%

category: 'Grail-Tests - name annotation'
method: SubclassNameAttrTestCase
testParentClassNameUnchanged
	"Parent declares 'name: str' as a bare annotation; its
	``__name__'' must still be 'WithNameField'."

	self assert: (testModule @env1:___pyAttrLoad___: #parent_name) equals: 'WithNameField'
%

category: 'Grail-Tests - name annotation'
method: SubclassNameAttrTestCase
testSubclassNameNotOverwrittenByInheritance
	"Subclass that doesn't redeclare 'name' must keep its own
	__name__ ('ChildOfWithName'), not inherit the parent's name
	('WithNameField') via ___inheritClassAttrs___."

	self assert: (testModule @env1:___pyAttrLoad___: #child_name) equals: 'ChildOfWithName'.
	self assert: (testModule @env1:___pyAttrLoad___: #parent_and_child_differ) equals: true
%

category: 'Grail-Tests - other kernel slots'
method: SubclassNameAttrTestCase
testCategoryFieldDoesNotOverwriteSubclassName
	"``category'' is another kernel metaclass instVar.  Same fix
	covers it: a subclass keeps its own __name__ even when the
	parent declares 'category: str'."

	self assert: (testModule @env1:___pyAttrLoad___: #child_category_name)
		equals: 'ChildOfCategory'
%
