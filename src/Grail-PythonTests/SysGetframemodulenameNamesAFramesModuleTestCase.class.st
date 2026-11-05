Class {
	#name : 'SysGetframemodulenameNamesAFramesModuleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysGetframemodulenameNamesAFramesModuleTestCase >> testGetframemodulenameAnswersTheModuleOfTheFrameAtADepth [
	"tests/python/sys_getframemodulename_names_a_frames_module.py:
	sys._getframemodulename names its caller's module by default and at
	depth 0, agrees with each frame's globals, answers None past the stack
	and for code exec'd without a __name__, and gives dataclasses and typing
	the module they are called from.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_getframemodulename_names_a_frames_module' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_getframemodulename_names_a_frames_module.py')
		name: 'sys_getframemodulename_names_a_frames_module'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
