Class {
	#name : 'ClassmethodDictTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassmethodDictTestCase >> testWrappersHaveADictOfWhatTheyCopied [
	"tests/python/classmethod_dict.py: a classmethod's and a staticmethod's
	__dict__ holds the __module__, __name__, __qualname__ and __doc__ copied
	from the callable, and attributes stored on it later, but not the
	callable itself.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'classmethod_dict' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_dict.py')
		name: 'classmethod_dict'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
