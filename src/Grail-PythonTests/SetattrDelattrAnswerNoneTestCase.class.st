Class {
	#name : 'SetattrDelattrAnswerNoneTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SetattrDelattrAnswerNoneTestCase >> testObjectSetattrAndDelattrAnswerNone [
	"tests/python/setattr_delattr_answer_none.py: obj.__setattr__,
	obj.__delattr__, object.__setattr__ and object.__delattr__ answer None,
	directly and through super() in a class's own hooks, and a chained
	assignment through such a hook still assigns.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'setattr_delattr_answer_none' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/setattr_delattr_answer_none.py')
		name: 'setattr_delattr_answer_none'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
