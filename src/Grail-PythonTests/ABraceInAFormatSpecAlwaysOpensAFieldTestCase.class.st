Class {
	#name : 'ABraceInAFormatSpecAlwaysOpensAFieldTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ABraceInAFormatSpecAlwaysOpensAFieldTestCase >> testADoubledBraceInAFormatSpecIsANestedField [
	"tests/python/a_brace_in_a_format_spec_always_opens_a_field.py: a doubled
	brace in a format spec is a nested field, outside one an escape; a nested
	field with no expression is reported before the open field around it; an
	open bracket in a field the f-string ended inside of is ``expecting
	'}''', and an open field is still reported as before.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_brace_in_a_format_spec_always_opens_a_field' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_brace_in_a_format_spec_always_opens_a_field.py')
		name: 'a_brace_in_a_format_spec_always_opens_a_field'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
