Class {
	#name : 'StrayEqualsInDisplaysTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrayEqualsInDisplaysTestCase >> testEqualsAfterADisplayElementSuggestsComparison [
	"tests/python/stray_equals_in_displays.py: an ``='' after an element of a
	list or set display is CPython's invalid_named_expression -- ``=='' or
	``:='' suggested after a name, ``cannot assign to ... here'' after
	anything else -- while True, None, a tuple or list element, or a chained
	``='', stays plain invalid syntax.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'stray_equals_in_displays' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stray_equals_in_displays.py')
		name: 'stray_equals_in_displays'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
