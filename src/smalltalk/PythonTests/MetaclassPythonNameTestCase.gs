! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassPythonNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassPythonNameTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassPythonNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassPythonNameTestCase
!
! What is an enum's METACLASS called?  CPython names a metaclass in its own
! right -- ``type(Color)'' is ``EnumType'' and reprs as
! ``<class 'enum.EnumType'>''.  Grail names one after the Smalltalk class it
! belongs to (``Enum class'') and, worse, could not answer at all: __name__ and
! __qualname__ are written on ``object class'', and a metaclass's own class
! chain runs to Metaclass3 rather than through it, so both fell through to the
! generic method wrap and ``type(Color).__name__'' answered an UnboundMethod.
!
! The same asymmetry had already been worked around once, for __module__, which
! is why ``type(Color).__module__'' answered 'enum' correctly all along -- and
! why the name half was easy to miss: repr() asks for __qualname__ and falls
! back to the Smalltalk name whenever the answer is not a string, so it printed
! plausible-looking output instead of failing.
!
! The name is ASKED FOR, class-side, rather than derived by scanning the module.
! A scan is ambiguous exactly here: enum binds both ``EnumType'' and the
! deprecated alias ``EnumMeta'' to the same object, so which one it found would
! depend on dictionary order.  Asking also spans Grail's THREE separate
! metaclass roots correctly -- a data-rooted enum's chain reaches IntEnum class
! or StrEnum class and never Enum class, and CPython calls type() of every one
! of them EnumType.
!
! Not cosmetic: test_enum's TestStdLib.test_pydoc expects the headings ``Static
! methods inherited from enum.EnumType:'' and ``Readonly properties inherited
! from enum.EnumType:'', which pydoc builds from the defining class's name.
!
! Drives tests/python/metaclass_python_name.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassPythonNameTestCase removeAllMethods.
MetaclassPythonNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassPythonNameTestCase
setUp
	"Reload tests/python/metaclass_python_name.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_python_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/metaclass_python_name.py')
		name: 'metaclass_python_name'.
%

category: 'Grail-Private'
method: MetaclassPythonNameTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The enum metaclass'
method: MetaclassPythonNameTestCase
testEveryEnumRootsMetaclassIsNamedEnumType
	"All five roots, because Grail has three separate metaclasses and inherits
	the other two -- a version of this that checked only Enum would pass while
	IntEnum and StrEnum still answered an UnboundMethod."

	self assert: (self resultAt: 'enum_metaclass_names') asString
		equals: '[''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'']'.
	self assert: (self resultAt: 'enum_metaclass_qualnames') asString
		equals: '[''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'']'.
%

category: 'Grail-Tests - The enum metaclass'
method: MetaclassPythonNameTestCase
testTheyAreAllTheSameMetaclassObject
	"The identity model was already right, and is asserted here so a failure of
	the naming test cannot be mistaken for one: type() of any enum answers the
	one EnumType, as upstream."

	self assert: (self resultAt: 'enum_metaclass_is_enumtype') asString
		equals: '[True, True, True, True, True]'.
%

category: 'Grail-Tests - The enum metaclass'
method: MetaclassPythonNameTestCase
testTheMetaclassReprsUnderItsPythonName
	"repr() asks the class for __qualname__ and __module__.  The module half
	already worked, so this printed ``<class 'enum.Enum class'>'' -- a Smalltalk
	name inside a Python repr, which is the form the bug reached users in."

	self assert: (self resultAt: 'enum_metaclass_repr') asString
		equals: '"<class ''enum.EnumType''>"'.
	self assert: (self resultAt: 'enum_metaclass_module') asString equals: '''enum'''.
%

category: 'Grail-Tests - The enum metaclass'
method: MetaclassPythonNameTestCase
testTheNameAnswersTheSameObjectTwice
	"Interned like an ordinary class name.  inspect.classify_class_attrs homes
	an attribute no __dict__ carries by comparing getattr results with ``is'',
	so a fresh copy per read is not merely wasteful -- see
	InspectClassifyClassAttrsTestCase."

	self assert: (self resultAt: 'metaclass_name_is_stable') asString
		equals: '[True, True]'.
%

category: 'Grail-Tests - Left alone'
method: MetaclassPythonNameTestCase
testAPythonMetaclassAndTypeItselfAreUnchanged
	"A metaclass written in Python is an ordinary class object and always
	answered, as did ``type'' and every ordinary class.  Asserted so a
	regression says which half broke."

	self assert: (self resultAt: 'python_metaclass_name') asString equals: '''Meta'''.
	self assert: (self resultAt: 'type_name') asString equals: '''type'''.
	self assert: (self resultAt: 'class_name') asString equals: '''Color'''.
%

set compile_env: 0
