Class {
	#name : 'RequiresStraceWithoutSubprocessTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
RequiresStraceWithoutSubprocessTestCase >> testRequiresStraceOnLinuxSkipsTheClassInsteadOfRaising [
	"tests/python/requires_strace_without_subprocess.py: on Linux,
	test.support.strace_helper.requires_strace() answers a decorator that skips
	the class, and does not raise SkipTest while the class is being defined --
	which took the whole of test_fileio down at import on the nightly.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'requires_strace_without_subprocess' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/requires_strace_without_subprocess.py')
		name: 'requires_strace_without_subprocess'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
