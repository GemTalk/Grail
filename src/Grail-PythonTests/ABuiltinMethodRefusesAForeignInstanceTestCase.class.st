Class {
	#name : 'ABuiltinMethodRefusesAForeignInstanceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ABuiltinMethodRefusesAForeignInstanceTestCase >> testABuiltinMethodRefusesAnInstanceOfAnUnrelatedClass [
	"tests/python/a_builtin_method_refuses_a_foreign_instance.py: list.sort,
	str.split and the rest refuse an instance of an unrelated Python class in
	CPython's method-descriptor and slot-wrapper words, a claimed __class__
	included, while a subclass instance, a Python def and object's methods run.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_builtin_method_refuses_a_foreign_instance' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_builtin_method_refuses_a_foreign_instance.py')
		name: 'a_builtin_method_refuses_a_foreign_instance'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
