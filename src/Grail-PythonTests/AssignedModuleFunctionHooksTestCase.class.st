Class {
	#name : 'AssignedModuleFunctionHooksTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AssignedModuleFunctionHooksTestCase >> testATopLevelDefAssignedAsAHookIsCalled [
	"tests/python/assigned_module_function_hooks.py: a top-level def or a
	lambda assigned as __setattr__ or __delattr__ on this imported module's
	classes is called for every store and delete, also on a subclass, and one
	assigned as __set__ / __delete__ makes its class a data descriptor.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'assigned_module_function_hooks' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/assigned_module_function_hooks.py')
		name: 'assigned_module_function_hooks'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
