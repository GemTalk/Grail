Class {
	#name : 'StrJoinAndRepeatKeepIdentityTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrJoinAndRepeatKeepIdentityTestCase >> testJoiningOneStrOrRepeatingItOnceAnswersTheSameStr [
	"tests/python/str_join_and_repeat_keep_identity.py: str.join of one exact
	str, and ``s * 1'' / ``1 * s'', answer s itself, while a str subclass's
	instance and every other count or length build a new str.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'str_join_and_repeat_keep_identity' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_join_and_repeat_keep_identity.py')
		name: 'str_join_and_repeat_keep_identity'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
