! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportTypeIntrospectionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportTypeIntrospectionTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportTypeIntrospectionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportTypeIntrospectionTestCase
!
! Language/import fixes that unblock importing real packages (NumPy):
!   - isinstance(x, type) / issubclass(c, type)  (``type'' used as a class)
!   - cls.__base__ / cls.__bases__               (class introspection)
!   - single-element tuple unpack ``x, = seq''
!   - ``from MODULE import missing'' raises a catchable ImportError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportTypeIntrospectionTestCase removeAllMethods.
ImportTypeIntrospectionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportTypeIntrospectionTestCase
setUp
	"Load tests/python/import_type_introspection.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'import_type_introspection' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/import_type_introspection.py')
		name: 'import_type_introspection'.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testIsinstanceOfType
	"isinstance(x, type) is True only when x is itself a class."

	self assert: (testModule @env1:___pyAttrLoad___: #'sub_is_type') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'func_is_type') equals: false.
	self assert: (testModule @env1:___pyAttrLoad___: #'int_inst_is_type') equals: false.
	self assert: (testModule @env1:___pyAttrLoad___: #'inst_is_type') equals: false.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testIssubclass
	"issubclass with a normal base and with ``type'' (only metaclasses
	are subclasses of type)."

	self assert: (testModule @env1:___pyAttrLoad___: #'sub_of_base') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'sub_of_type') equals: false.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testClassBaseIntrospection
	"cls.__base__ is the primary base; cls.__bases__ is the base tuple."

	self assert: (testModule @env1:___pyAttrLoad___: #'sub_base_name') equals: 'Base'.
	self assert: (testModule @env1:___pyAttrLoad___: #'sub_bases_len') equals: 1.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testSingleElementTupleUnpack
	"``only, = [99]'' unpacks the 1-tuple (binds 99), not the whole list."

	self assert: (testModule @env1:___pyAttrLoad___: #'unpacked') equals: 99.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testFromImportMissingRaisesImportError
	"``from os import <missing>'' raises a catchable ImportError
	(ModuleNotFoundError), not an AttributeError, so an optional-import
	``try/except ImportError'' hook works."

	self assert: (testModule @env1:___pyAttrLoad___: #'import_miss_caught') equals: true.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testOsPathLike
	"isinstance(x, os.PathLike) is true only for objects whose type
	defines __fspath__ — not for str/int (numpy's
	``isinstance(filename, os.PathLike)'')."

	self assert: (testModule @env1:___pyAttrLoad___: #'pathlike_obj') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'pathlike_str') equals: false.
	self assert: (testModule @env1:___pyAttrLoad___: #'pathlike_int') equals: false.
%

category: 'Grail-Tests'
method: ImportTypeIntrospectionTestCase
testSysFlags
	"sys.flags is a real object with attribute access (numpy's core
	init reads sys.flags); the standard flags default to 0."

	self assert: (testModule @env1:___pyAttrLoad___: #'flags_optimize') equals: 0.
	self assert: (testModule @env1:___pyAttrLoad___: #'flags_debug') equals: 0.
	self assert: (testModule @env1:___pyAttrLoad___: #'flags_has_optimize') equals: true.
%
