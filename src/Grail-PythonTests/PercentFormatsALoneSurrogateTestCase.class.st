Class {
	#name : 'PercentFormatsALoneSurrogateTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PercentFormatsALoneSurrogateTestCase >> testEachFieldAgreesWithCPython [

	"tests/python/percent_formats_a_lone_surrogate.py: %-formatting takes a
	str holding a lone surrogate as a %s or %c operand, counts its width and
	precision in code points, and never takes it for a mapping.  Each check
	agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'percent_formats_a_lone_surrogate' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/percent_formats_a_lone_surrogate.py')
		name: 'percent_formats_a_lone_surrogate'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '18 checks, 0 disagreeing [], keys match: True'

]
