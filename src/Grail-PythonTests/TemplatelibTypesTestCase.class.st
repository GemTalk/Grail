Class {
	#name : 'TemplatelibTypesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TemplatelibTypesTestCase >> testTheTemplateTypesAreFinalAndGeneric [
	"tests/python/templatelib_types.py: Template, Interpolation and the
	TemplateIter that iter(template) answers refuse to be subclassed, as
	CPython's C types do; Template and Interpolation are generic; and
	TemplateIter cannot be created directly.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'templatelib_types' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/templatelib_types.py')
		name: 'templatelib_types'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
