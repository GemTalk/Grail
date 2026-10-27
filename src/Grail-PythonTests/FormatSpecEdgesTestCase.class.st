Class {
	#name : 'FormatSpecEdgesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FormatSpecEdgesTestCase >> testFormatRefusesAndRendersAsCPython [
	"tests/python/format_spec_edges.py: an oversized width or precision and a
	non-str spec raise CPython's catchable errors, a typeless float renders
	as repr() does, and '#.0%' puts the point before the percent sign.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'format_spec_edges' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_spec_edges.py')
		name: 'format_spec_edges'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
