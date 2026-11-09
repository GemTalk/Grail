Class {
	#name : 'PlatformIsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PlatformIsCPythonsTestCase >> testPlatformDescribesTheHostItRunsOn [

	"tests/python/platform_is_cpythons.py: platform's system, node, release,
	version and machine are os.uname()'s, uname() is a six-field uname_result
	that unpacks into six, platform() names the system first, and the Python
	version is sys.version_info's.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'platform_is_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/platform_is_cpythons.py')
		name: 'platform_is_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
