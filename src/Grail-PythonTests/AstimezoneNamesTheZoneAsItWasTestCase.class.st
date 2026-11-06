Class {
	#name : 'AstimezoneNamesTheZoneAsItWasTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AstimezoneNamesTheZoneAsItWasTestCase >> testAstimezoneNamesEachInstantAsTheLocalZoneNamedItThen [

	"tests/python/astimezone_names_the_zone_as_it_was.py: astimezone() names
	the local zone with localtime()'s tm_zone at that instant -- MSK and MSD
	for Kyiv in 1984, EET and EEST now -- for an aware value, a naive one and
	email.utils.localtime, and a POSIX rule's standard and summer names.  Each
	check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'astimezone_names_the_zone_as_it_was' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/astimezone_names_the_zone_as_it_was.py')
		name: 'astimezone_names_the_zone_as_it_was'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
